/**
 * Шар територій гравців — ImageData/putImageData (як OpenFrontIO).
 * Перемальовується кожен кадр — інакше оновлення territory не видно.
 * Alpha 150 = напівпрозоре заповнення (terrain просвічує), 255 = кордон.
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

  render(ctx: RenderContext): void {
    const { ctx: c, state, worldWidth, worldHeight } = ctx;
    const cells = state.cells ?? [];
    const { players, cols, rows } = state;

    if (cells.length === 0) return;

    // Пересоздаємо offscreen якщо розмір змінився
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
      });
      this.imageData = this.offscreenCtx!.createImageData(cols, rows);
      this.lastCols = cols;
      this.lastRows = rows;
    }

    const pix = this.imageData!.data;

    // Кеші кольорів щоб не парсити HSL кожен піксель
    const fillRgbCache = new Map<string, [number, number, number]>();
    const borderRgbCache = new Map<string, [number, number, number]>();

    for (let i = 0; i < cols * rows; i++) {
      const cell = cells[i];
      const o = i * 4;

      // Воду ніколи не малюємо як територію — кордон зупиняється на березі
      if (!cell || cell.terrain !== "land" || cell.ownerId === null) {
        pix[o + 3] = 0; // прозорий — terrain просвічує
        continue;
      }

      const fillHex = getCellColor(cell, players);
      const isBorder = isBorderTile(i, cell.ownerId, cells, cols, rows);

      let rgb: [number, number, number];
      let alpha: number;

      if (isBorder) {
        let cached = borderRgbCache.get(fillHex);
        if (!cached) {
          cached = colorToRgb(getBorderColor(fillHex));
          borderRgbCache.set(fillHex, cached);
        }
        rgb = cached;
        alpha = BORDER_ALPHA;
      } else {
        let cached = fillRgbCache.get(fillHex);
        if (!cached) {
          cached = colorToRgb(fillHex);
          fillRgbCache.set(fillHex, cached);
        }
        rgb = cached;
        alpha = TERRITORY_ALPHA;
      }

      pix[o] = rgb[0];
      pix[o + 1] = rgb[1];
      pix[o + 2] = rgb[2];
      pix[o + 3] = alpha;
    }

    this.offscreenCtx!.putImageData(this.imageData!, 0, 0);

    // Малюємо в ті самі world-координати, що й терен (worldWidth×worldHeight), щоб територія збігалась з кліком
    c.imageSmoothingEnabled = false;
    c.drawImage(
      this.offscreenCanvas!,
      0, 0, cols, rows,
      0, 0, worldWidth, worldHeight,
    );
  }
}
