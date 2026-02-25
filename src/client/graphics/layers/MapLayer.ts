/**
 * Шар карти як у OpenFrontIO: базовий терен — один раз в offscreen ImageData за даними
 * згенерованої карти (public/maps), потім копія на екран; поверх — території гравців.
 * Лише варіант з terrainFromMap (без fallback на state.cells для терену).
 */

import { MAP } from '../../../shared/constants';
import type { Layer, RenderContext } from '../types';
import { getCellColor, getBorderColor, isBorderTile } from '../mapUtils';
import { getTerrainColorFromPackedByte } from '../../mapLoader';

const COLS = MAP.COLS;
const ROWS = MAP.ROWS;
/** Не малювати територію по клітинках, якщо видимо більше — уникаємо зависань при віддаленні. */
const MAX_TERRITORY_DRAW_CELLS = 30_000;
/** Або якщо клітинка на екрані менша за цей розмір (пікселі) — територія не малюється. */
const MIN_CELL_SIZE_PX = 1.5;

export class MapLayer implements Layer {
  visible = true;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private cachedTerrainKey: string | null = null;

  private buildTerrainCanvas(terrainFromMap: { data: Uint8Array; width: number; height: number }): void {
    const { data, width, height } = terrainFromMap;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const imageData = ctx.createImageData(width, height);
    const pix = imageData.data;
    for (let i = 0; i < width * height; i++) {
      const [r, g, b] = getTerrainColorFromPackedByte(data[i]);
      const o = i * 4;
      pix[o] = r;
      pix[o + 1] = g;
      pix[o + 2] = b;
      pix[o + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    this.offscreenCanvas = canvas;
  }

  render(ctx: RenderContext): void {
    const { ctx: c, state, viewport, worldWidth, worldHeight, terrainFromMap } = ctx;
    const cells = state.cells ?? [];
    const { players, cols, rows } = state;

    const CELL_W = worldWidth / COLS;
    const CELL_H = worldHeight / ROWS;

    // 1) Базовий терен — лише з згенерованої карти (offscreen ImageData → drawImage)
    if (terrainFromMap && terrainFromMap.width === cols && terrainFromMap.height === rows) {
      const key = `${terrainFromMap.width}x${terrainFromMap.height}`;
      if (this.cachedTerrainKey !== key || !this.offscreenCanvas) {
        this.buildTerrainCanvas(terrainFromMap);
        this.cachedTerrainKey = key;
      }
      if (this.offscreenCanvas) {
        c.imageSmoothingEnabled = false;
        c.drawImage(this.offscreenCanvas, 0, 0, worldWidth, worldHeight);
      }
    }

    // 2) Території гравців напівпрозоро поверх
    const startCol = Math.max(0, Math.floor(viewport.x / CELL_W));
    const endCol = Math.min(COLS, Math.ceil((viewport.x + viewport.width) / CELL_W));
    const startRow = Math.max(0, Math.floor(viewport.y / CELL_H));
    const endRow = Math.min(ROWS, Math.ceil((viewport.y + viewport.height) / CELL_H));
    const territoryAlpha = 0.52;
    const borderAlpha = 0.45;

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const index = row * cols + col;
        const cell = cells[index];
        if (!cell || cell.ownerId === null) continue;

        let color = getCellColor(cell, players);
        const isBorder =
          cell.terrain === 'land' &&
          isBorderTile(index, cell.ownerId, cells, cols, rows);
        if (isBorder) color = getBorderColor(color);

        c.globalAlpha = isBorder ? borderAlpha : territoryAlpha;
        c.fillStyle = color;
        // Невелике перекриття, щоб не було видимих ліній сітки при масштабуванні
        c.fillRect(col * CELL_W, row * CELL_H, CELL_W + 0.5, CELL_H + 0.5);
      }
    }

    c.globalAlpha = 1;
  }
}
