/**
 * Шар територій гравців — один буфер ImageData (1 піксель = 1 клітинка) + один drawImage за кадр.
 * Як у OpenFrontIO: без тисяч fillRect, лише putImageData + drawImage.
 */

import type { Layer, RenderContext } from '../types';
import { getCellColor, getBorderColor, isBorderTile, colorToRgb } from '../mapUtils';

const TERRITORY_ALPHA = 150; // 0–255
const BORDER_ALPHA = 255;

export class TerritoryLayer implements Layer {
  visible = true;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private imageData: ImageData | null = null;
  private cachedKey = '';

  render(ctx: RenderContext): void {
    const { ctx: c, state, worldWidth, worldHeight } = ctx;
    const cells = state.cells ?? [];
    const { players, cols, rows } = state;

    const key = `${cols}x${rows}`;
    if (this.cachedKey !== key || !this.offscreenCanvas) {
      this.cachedKey = key;
      this.offscreenCanvas = null;
      this.imageData = null;
    }

    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = cols;
      this.offscreenCanvas.height = rows;
      const offCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
      if (!offCtx) return;
      this.imageData = offCtx.createImageData(cols, rows);
    }

    const img = this.imageData!;
    const pix = img.data;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const o = i * 4;
      if (!cell || cell.ownerId === null) {
        pix[o] = 0;
        pix[o + 1] = 0;
        pix[o + 2] = 0;
        pix[o + 3] = 0;
        continue;
      }

      const fillColor = getCellColor(cell, players);
      const isBorder =
        cell.terrain === 'land' && isBorderTile(i, cell.ownerId, cells, cols, rows);
      const color = isBorder ? getBorderColor(fillColor) : fillColor;
      const alpha = isBorder ? BORDER_ALPHA : TERRITORY_ALPHA;

      const [r, g, b] = colorToRgb(color);
      pix[o] = r;
      pix[o + 1] = g;
      pix[o + 2] = b;
      pix[o + 3] = alpha;
    }

    const offCtx = this.offscreenCanvas!.getContext('2d')!;
    offCtx.putImageData(img, 0, 0);

    c.globalAlpha = 1;
    c.imageSmoothingEnabled = false;
    c.drawImage(
      this.offscreenCanvas,
      0, 0, cols, rows,
      0, 0, worldWidth, worldHeight,
    );
  }
}
