/**
 * Шар базового терену (вода, суша, береги) — один раз в offscreen ImageData, потім drawImage.
 */

import { MAP } from '../../../shared/constants';
import type { Layer, RenderContext } from '../types';
import { getTerrainColorFromPackedByte } from '../../mapLoader';

const COLS = MAP.COLS;
const ROWS = MAP.ROWS;

export class TerrainLayer implements Layer {
  visible = true;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private cachedTerrainKey: string | null = null;
  private onTerrainBuilt: (() => void) | null = null;

  setOnTerrainBuilt(cb: () => void): void {
    this.onTerrainBuilt = cb;
  }

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
    this.onTerrainBuilt?.();
  }

  render(ctx: RenderContext): void {
    const { ctx: c, state, worldWidth, worldHeight, terrainFromMap } = ctx;
    const { cols, rows } = state;

    if (!terrainFromMap || terrainFromMap.width !== cols || terrainFromMap.height !== rows) return;

    const key = `${terrainFromMap.width}x${terrainFromMap.height}`;
    if (this.cachedTerrainKey !== key || !this.offscreenCanvas) {
      this.cachedTerrainKey = key;
      this.buildTerrainCanvas(terrainFromMap);
    }
    if (this.offscreenCanvas) {
      c.imageSmoothingEnabled = false;
      c.drawImage(this.offscreenCanvas, 0, 0, worldWidth, worldHeight);
    }
  }
}
