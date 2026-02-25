/**
 * Легкий кастомний 2D engine поверх Canvas (за зразком OpenFrontIO).
 * Керує шарами та викликає їх render з viewport і transform.
 */

import type { GameState } from '../../shared/types';
import type { Layer, RenderContext, Viewport } from './types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private layers: Layer[] = [];
  private width = 0;
  private height = 0;
  private worldX = 0;
  private worldY = 0;
  private scale = 1;
  private playerId: string | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private worldWidth = 1000;
  private worldHeight = 500;
  private dpr = 1;
  private terrainFromMap: { data: Uint8Array; width: number; height: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2d context not supported');
    this.ctx = ctx;
  }

  addLayer(layer: Layer): void {
    this.layers.push(layer);
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setDevicePixelRatio(dpr: number): void {
    this.dpr = dpr;
  }

  /** Оновлює позицію/масштаб виду (viewport). */
  setView(worldX: number, worldY: number, scale: number): void {
    this.worldX = worldX;
    this.worldY = worldY;
    this.scale = scale;
  }

  setPlayerId(playerId: string | null): void {
    this.playerId = playerId;
  }

  setBackgroundImage(img: HTMLImageElement | null): void {
    this.backgroundImage = img;
    if (img && img.complete && img.naturalWidth > 0) {
      this.worldWidth = img.naturalWidth;
      this.worldHeight = img.naturalHeight;
    }
  }

  /** Розмір світу без зображення (наприклад з MAP.COLS/ROWS). */
  setWorldSize(w: number, h: number): void {
    this.worldWidth = w;
    this.worldHeight = h;
  }

  /** Терен з згенерованої карти (public/maps) — відмальовування як у OpenFrontIO. */
  setTerrainFromMap(data: Uint8Array, width: number, height: number): void {
    this.terrainFromMap = { data, width, height };
    this.worldWidth = width;
    this.worldHeight = height;
  }

  getWorldSize(): { w: number; h: number } {
    return { w: this.worldWidth, h: this.worldHeight };
  }

  /** Обчислює видиму область в world-координатах. */
  getViewport(): Viewport {
    const x = -this.worldX / this.scale;
    const y = -this.worldY / this.scale;
    const width = this.width / this.scale;
    const height = this.height / this.scale;
    return { x, y, width, height };
  }

  render(state: GameState | null): void {
    if (!state) return;

    const viewport = this.getViewport();

    this.ctx.save();
    this.ctx.scale(this.dpr, this.dpr);

    this.ctx.fillStyle = '#060d14';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.worldX, this.worldY);
    this.ctx.scale(this.scale, this.scale);

    const ctx: RenderContext = {
      ctx: this.ctx,
      state,
      viewport,
      scale: this.scale,
      worldOffsetX: this.worldX,
      worldOffsetY: this.worldY,
      playerId: this.playerId,
      backgroundImage: this.backgroundImage,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      terrainFromMap: this.terrainFromMap,
    };

    for (const layer of this.layers) {
      if (layer.visible) {
        layer.render(ctx);
      }
    }

    this.ctx.restore(); // view (scale + translate)
    this.ctx.restore(); // dpr
  }
}
