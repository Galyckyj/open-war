/**
 * Шар територій — як OpenFrontIO: persistentний ImageData, оновлюємо тільки змінені тайли.
 * Замість перемальовки всіх 256k пікселів кожен кадр — тільки delta з lastDeltaIndices.
 * Alpha 150 = fill, 255 = кордон. Вода непрохідна (як стіна) — територія туди не поширюється і не малюється.
 */

import type { Layer, RenderContext } from "../types";
import {
  getCellColor,
  getBorderColor,
  isBorderTile,
  colorToRgb,
} from "../mapUtils";

const TERRITORY_ALPHA = 150;
const BORDER_ALPHA = 255;

export class TerritoryLayer implements Layer {
  visible = true;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private imageData: ImageData | null = null;
  private lastCols = 0;
  private lastRows = 0;
  // Кеші кольорів між кадрами (як OpenFrontIO — колір не змінюється у гравця)
  private fillRgbCache = new Map<string, [number, number, number]>();
  private borderRgbCache = new Map<string, [number, number, number]>();

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
      return true; // потрібна повна перемальовка
    }
    return false;
  }

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

    // Вода = непрохідна (стіна): територія лише на суші
    if (!cell || cell.terrain !== "land" || cell.ownerId === null) {
      pix[o] = 0;
      pix[o + 1] = 0;
      pix[o + 2] = 0;
      pix[o + 3] = 0;
      return;
    }

    const fillHex = getCellColor(cell, players);
    const border = isBorderTile(i, cell.ownerId, cells, cols, rows);

    let rgb: [number, number, number];
    let alpha: number;

    if (border) {
      let cached = this.borderRgbCache.get(fillHex);
      if (!cached) {
        cached = colorToRgb(getBorderColor(fillHex));
        this.borderRgbCache.set(fillHex, cached);
      }
      rgb = cached;
      alpha = BORDER_ALPHA;
    } else {
      let cached = this.fillRgbCache.get(fillHex);
      if (!cached) {
        cached = colorToRgb(fillHex);
        this.fillRgbCache.set(fillHex, cached);
      }
      rgb = cached;
      alpha = TERRITORY_ALPHA;
    }

    pix[o] = rgb[0];
    pix[o + 1] = rgb[1];
    pix[o + 2] = rgb[2];
    pix[o + 3] = alpha;
  }

  render(ctx: RenderContext): void {
    const { ctx: c, state, worldWidth, worldHeight } = ctx;
    const cells = state.cells ?? [];
    const { players, cols, rows } = state;
    if (cells.length === 0) return;

    const needFullRedraw = this.ensureCanvas(cols, rows);
    const changed = state.lastDeltaIndices;

    // Повна перемальовка: новий буфер, зміна розміру або перший стан (ще не було tick з delta)
    const doFullRedraw =
      needFullRedraw || changed === undefined;

    if (doFullRedraw) {
      for (let i = 0; i < cols * rows; i++) {
        this.paintTile(i, cells, players, cols, rows);
      }
    } else if (changed.length > 0) {
      // Інкрементальне оновлення після тіку: змінені тайли + сусіди + сусіди сусідів (2 хопи).
      // 2 хопи потрібні бо isBorderTile залежить від сусідів — при швидкому просуванні
      // (багато тайлів/тік) "старий кордон" може бути на відстані 2 від найближчого delta-тайлу.
      const toRepaint = new Set<number>(changed);
      for (const idx of changed) {
        const x = idx % cols;
        const y = Math.floor(idx / cols);
        // 1-хоп (прямі сусіди)
        if (x > 0)        toRepaint.add(idx - 1);
        if (x < cols - 1) toRepaint.add(idx + 1);
        if (y > 0)        toRepaint.add(idx - cols);
        if (y < rows - 1) toRepaint.add(idx + cols);
      }
      // 2-хоп: сусіди всіх 1-хоп тайлів (щоб не лишалось артефактів кордону)
      const firstHop = Array.from(toRepaint);
      for (const idx of firstHop) {
        const x = idx % cols;
        const y = Math.floor(idx / cols);
        if (x > 0)        toRepaint.add(idx - 1);
        if (x < cols - 1) toRepaint.add(idx + 1);
        if (y > 0)        toRepaint.add(idx - cols);
        if (y < rows - 1) toRepaint.add(idx + cols);
      }
      for (const i of toRepaint) {
        this.paintTile(i, cells, players, cols, rows);
      }
      // Очищаємо буфер після рендеру — наступний тік додасть нові індекси поверх порожнього
      state.lastDeltaIndices = [];
    }

    this.offscreenCtx!.putImageData(this.imageData!, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(
      this.offscreenCanvas!,
      0,
      0,
      cols,
      rows,
      0,
      0,
      worldWidth,
      worldHeight,
    );
  }
}
