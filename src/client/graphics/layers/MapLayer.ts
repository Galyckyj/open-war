/**
 * Шар карти як у OpenFrontIO: базовий терен — один раз в offscreen ImageData за даними
 * згенерованої карти (public/maps), потім копія на екран; поверх — території гравців.
 * Лише варіант з terrainFromMap (без fallback на state.cells для терену).
 */

import type { Layer, RenderContext } from '../types';
import { getTerrainColorFromPackedByte } from '../../mapLoader';

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
    const { ctx: c, worldWidth, worldHeight, terrainFromMap, state } = ctx;
    const { cols, rows } = state;

    // Базовий терен — лише з offscreen ImageData (один drawImage, дуже швидко).
    // Територія гравців відмальовується окремим шаром TerritoryLayer (incremental, offscreen canvas).
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
  }
}
