/**
 * Шар територій — incremental rendering без блокуючого putImageData.
 *
 * АРХІТЕКТУРА (як OpenFrontIO):
 *  - Повний редро: imageData → putImageData (один раз при старті/resize)
 *  - Інкрементальне: clearRect + fillRect (GPU-команди, асинхронні, НЕ блокують JS-thread)
 *    vs старий підхід: putImageData(full dirty rect = 2MB) — блокував JS на 30-50ms!
 *
 * GPU-команди батчуються за кольором → ~62 fillStyle змін замість 2000.
 * imageData підтримується в синхронізації для майбутніх повних редро.
 */

import type { Layer, RenderContext } from "../types";
import {
  getCellColor,
  getBorderColor,
  isBorderTile,
  colorToRgb,
} from "../mapUtils";
import { perfStats } from "../../utils/perfStats";

const TERRITORY_ALPHA = 150;
const BORDER_ALPHA = 255;
// Pre-computed string для уникнення toFixed() при кожному виклику
const TERRITORY_ALPHA_FRAC = (TERRITORY_ALPHA / 255).toFixed(3); // "0.588"

export class TerritoryLayer implements Layer {
  visible = true;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private imageData: ImageData | null = null;
  private lastCols = 0;
  private lastRows = 0;
  // RGB кеші для imageData (fill/border окремо)
  private fillRgbCache = new Map<string, [number, number, number]>();
  private borderRgbCache = new Map<string, [number, number, number]>();
  // RGBA-рядки для canvas fillStyle: 'f:hex' → 'rgba(r,g,b,0.588)', 'b:hex' → 'rgba(r,g,b,1)'
  private rgbaStringCache = new Map<string, string>();

  private ensureCanvas(cols: number, rows: number): boolean {
    if (
      !this.offscreenCanvas ||
      this.lastCols !== cols ||
      this.lastRows !== rows
    ) {
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCanvas.width = cols;
      this.offscreenCanvas.height = rows;
      this.offscreenCtx = this.offscreenCanvas.getContext("2d", {
        alpha: true,
      })!;
      this.imageData = this.offscreenCtx.createImageData(cols, rows);
      this.lastCols = cols;
      this.lastRows = rows;
      this.fillRgbCache.clear();
      this.borderRgbCache.clear();
      this.rgbaStringCache.clear();
      return true;
    }
    return false;
  }

  /** Оновлює imageData-буфер для одного тайлу (для збереження стану при full redraw). */
  private paintTile(
    i: number,
    cells: RenderContext["state"]["cells"],
    players: RenderContext["state"]["players"],
    cols: number,
    rows: number,
  ) {
    const pix = this.imageData!.data;
    const o = i * 4;
    const cell = cells[i];

    if (!cell || cell.terrain !== "land" || cell.ownerId === null) {
      pix[o] = 0; pix[o + 1] = 0; pix[o + 2] = 0; pix[o + 3] = 0;
      return;
    }

    const fillHex = getCellColor(cell, players);
    const border = isBorderTile(i, cell.ownerId, cells, cols, rows);

    let rgb: [number, number, number];
    if (border) {
      let cached = this.borderRgbCache.get(fillHex);
      if (!cached) { cached = colorToRgb(getBorderColor(fillHex)); this.borderRgbCache.set(fillHex, cached); }
      rgb = cached;
      const alpha = BORDER_ALPHA;
      pix[o] = rgb[0]; pix[o + 1] = rgb[1]; pix[o + 2] = rgb[2]; pix[o + 3] = alpha;
    } else {
      let cached = this.fillRgbCache.get(fillHex);
      if (!cached) { cached = colorToRgb(fillHex); this.fillRgbCache.set(fillHex, cached); }
      rgb = cached;
      const alpha = TERRITORY_ALPHA;
      pix[o] = rgb[0]; pix[o + 1] = rgb[1]; pix[o + 2] = rgb[2]; pix[o + 3] = alpha;
    }
  }

  /**
   * Повертає rgba-рядок для canvas fillStyle для даного тайлу.
   * Кешується: ~62 унікальних рядки (31 гравець × 2 border/fill).
   */
  private getRgbaString(
    i: number,
    cell: NonNullable<RenderContext["state"]["cells"][number]>,
    cells: RenderContext["state"]["cells"],
    players: RenderContext["state"]["players"],
    cols: number,
    rows: number,
  ): string {
    const fillHex = getCellColor(cell, players);
    const border = isBorderTile(i, cell.ownerId!, cells, cols, rows);
    const cacheKey = border ? `b:${fillHex}` : `f:${fillHex}`;

    let rgba = this.rgbaStringCache.get(cacheKey);
    if (!rgba) {
      if (border) {
        let rgb = this.borderRgbCache.get(fillHex);
        if (!rgb) { rgb = colorToRgb(getBorderColor(fillHex)); this.borderRgbCache.set(fillHex, rgb); }
        rgba = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`;
      } else {
        let rgb = this.fillRgbCache.get(fillHex);
        if (!rgb) { rgb = colorToRgb(fillHex); this.fillRgbCache.set(fillHex, rgb); }
        rgba = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${TERRITORY_ALPHA_FRAC})`;
      }
      this.rgbaStringCache.set(cacheKey, rgba);
    }
    return rgba;
  }

  render(ctx: RenderContext): void {
    const { ctx: c, state, worldWidth, worldHeight } = ctx;
    const cells = state.cells ?? [];
    const { players, cols, rows } = state;
    if (cells.length === 0) return;

    const needFullRedraw = this.ensureCanvas(cols, rows);
    const changed = state.lastDeltaIndices;
    const doFullRedraw = needFullRedraw || changed === undefined;

    if (doFullRedraw) {
      // ── Повний редро: imageData → putImageData (один раз на старті/resize) ──
      const t0 = performance.now();
      for (let i = 0; i < cols * rows; i++) {
        this.paintTile(i, cells, players, cols, rows);
      }
      const t1 = performance.now();
      this.offscreenCtx!.putImageData(this.imageData!, 0, 0);
      const t2 = performance.now();

      perfStats.tilesPainted = cols * rows;
      perfStats.paintTileMs = t1 - t0;
      perfStats.putImageMs = t2 - t1;
      perfStats.fullRedrawCount++;

    } else if (changed.length > 0) {
      // ── Інкрементальне: clearRect + fillRect (GPU-команди, НЕ блокують JS) ──
      //
      // КЛЮЧОВА ОПТИМІЗАЦІЯ: замість putImageData(dirty_rect = до 2MB, блокуючий)
      // використовуємо canvas 2D GPU-команди які обробляються асинхронно:
      //   clearRect: очищає піксель до transparent
      //   fillRect: малює піксель потрібним кольором
      // Групуємо за кольором → ~62 fillStyle-зміни замість до 2000.

      // 1. Будуємо toRepaint з 2-хоп розширенням
      const t0 = performance.now();
      const toRepaint = new Set<number>(changed);
      for (const idx of changed) {
        const x = idx % cols, y = (idx / cols) | 0;
        if (x > 0)        toRepaint.add(idx - 1);
        if (x < cols - 1) toRepaint.add(idx + 1);
        if (y > 0)        toRepaint.add(idx - cols);
        if (y < rows - 1) toRepaint.add(idx + cols);
      }
      const firstHop = Array.from(toRepaint);
      for (const idx of firstHop) {
        const x = idx % cols, y = (idx / cols) | 0;
        if (x > 0)        toRepaint.add(idx - 1);
        if (x < cols - 1) toRepaint.add(idx + 1);
        if (y > 0)        toRepaint.add(idx - cols);
        if (y < rows - 1) toRepaint.add(idx + cols);
      }

      // 2. Оновлюємо imageData + групуємо за rgba-рядком для GPU-батчу
      const colorGroups = new Map<string, number[]>();
      const clearOnly: number[] = []; // тайли без кольору (очищаємо до transparent)

      for (const i of toRepaint) {
        this.paintTile(i, cells, players, cols, rows); // imageData in sync
        const cell = cells[i];
        if (!cell || cell.terrain !== "land" || cell.ownerId === null) {
          clearOnly.push(i);
        } else {
          const rgba = this.getRgbaString(i, cell, cells, players, cols, rows);
          let grp = colorGroups.get(rgba);
          if (!grp) { grp = []; colorGroups.set(rgba, grp); }
          grp.push(i);
        }
      }

      state.lastDeltaIndices = [];
      const t1 = performance.now();

      // 3. GPU-команди: спочатку clearRect всіх тайлів, потім fillRect по групах
      const octx = this.offscreenCtx!;

      // Clear: прозорі тайли
      for (const i of clearOnly) {
        octx.clearRect(i % cols, (i / cols) | 0, 1, 1);
      }
      // Clear + Fill: кольорові тайли (clearRect щоб не було alpha-blending з попереднім)
      for (const [rgba, indices] of colorGroups) {
        // clearRect спочатку (потрібен бо fillStyle може мати alpha < 1)
        for (const i of indices) {
          octx.clearRect(i % cols, (i / cols) | 0, 1, 1);
        }
        // fillRect всієї групи одним fillStyle (мінімум state-змін)
        octx.fillStyle = rgba;
        for (const i of indices) {
          octx.fillRect(i % cols, (i / cols) | 0, 1, 1);
        }
      }

      const t2 = performance.now();

      // Оновлюємо perf stats
      perfStats.tilesPainted = toRepaint.size;
      perfStats.deltaCount = changed.length;
      perfStats.paintTileMs = t1 - t0;
      perfStats.gpuCmdMs = t2 - t1;
    }

    // drawImage: GPU texture blit (offscreenCanvas → main canvas), кожен кадр
    const td0 = performance.now();
    c.imageSmoothingEnabled = false;
    c.drawImage(
      this.offscreenCanvas!,
      0, 0, cols, rows,
      0, 0, worldWidth, worldHeight,
    );
    perfStats.drawImageMs = performance.now() - td0;
  }
}
