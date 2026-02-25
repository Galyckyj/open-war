/**
 * Шар базового терену — рендер через ImageData.
 * Два режими:
 *   1. terrainFromMap (.bin файл) — один раз будується offscreen canvas
 *   2. state.cells fallback — малює terrain з даних гри (land=зелений, water=синій)
 */

import type { Layer, RenderContext } from "../types";
import { getTerrainColorFromPackedByte } from "../../mapLoader";

const LAND_COLOR: [number, number, number] = [74, 124, 89];
const WATER_COLOR: [number, number, number] = [65, 127, 175];

export class TerrainLayer implements Layer {
  visible = true;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private cachedTerrainKey: string | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private fallbackKey: string | null = null;

  private buildTerrainCanvas(terrainFromMap: {
    data: Uint8Array;
    width: number;
    height: number;
  }): void {
    const { data, width, height } = terrainFromMap;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
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

  private buildFallbackCanvas(
    cells: RenderContext["state"]["cells"],
    cols: number,
    rows: number,
  ): void {
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const imageData = ctx.createImageData(cols, rows);
    const pix = imageData.data;
    for (let i = 0; i < cells.length && i < cols * rows; i++) {
      const [r, g, b] = cells[i]?.terrain === "land" ? LAND_COLOR : WATER_COLOR;
      const o = i * 4;
      pix[o] = r;
      pix[o + 1] = g;
      pix[o + 2] = b;
      pix[o + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    this.fallbackCanvas = canvas;
  }

  render(ctx: RenderContext): void {
    const { ctx: c, state, worldWidth, worldHeight, terrainFromMap } = ctx;
    const { cols, rows, cells } = state;

    // Режим 1: є .bin файл карти
    if (terrainFromMap) {
      const key = `${terrainFromMap.width}x${terrainFromMap.height}`;
      if (this.cachedTerrainKey !== key || !this.offscreenCanvas) {
        this.cachedTerrainKey = key;
        this.buildTerrainCanvas(terrainFromMap);
      }
      if (this.offscreenCanvas) {
        c.imageSmoothingEnabled = false;
        c.drawImage(this.offscreenCanvas, 0, 0, worldWidth, worldHeight);
        return;
      }
    }

    // Режим 2: fallback — малюємо з state.cells (тільки один раз, terrain не змінюється)
    const fallbackKey = `${cols}x${rows}`;
    if (this.fallbackKey !== fallbackKey || !this.fallbackCanvas) {
      this.fallbackKey = fallbackKey;
      this.buildFallbackCanvas(cells, cols, rows);
    }
    if (this.fallbackCanvas) {
      c.imageSmoothingEnabled = false;
      c.drawImage(this.fallbackCanvas, 0, 0, cols, rows, 0, 0, worldWidth, worldHeight);
    }
  }
}
