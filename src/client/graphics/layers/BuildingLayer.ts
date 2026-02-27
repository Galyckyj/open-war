/**
 * Шар будівель — малює спрайти в world-space.
 * Розмір у world-units → природний зум (більше при наближенні).
 */

import type { Layer, RenderContext } from '../types';
import { BUILDING_CONSTRUCTION_TICKS } from '../../../shared/types';
import type { Building } from '../../../shared/types';

// Файли у public/ — просто рядок URL, не ?url import
const BUILDING_IMAGE_SRC: Partial<Record<string, string>> = {
  port:     '/buildings/port.png',
  fortress: '/buildings/fortress.png',
  farm:     '/buildings/farm.png',
  barracks: '/buildings/barracks.png',
};

/** Розмір спрайту у клітинах карти. */
const SPRITE_CELLS = 4;

export class BuildingLayer implements Layer {
  visible = true;

  private imageCache = new Map<string, HTMLImageElement | null>();

  constructor() {}

  private getImage(type: string): HTMLImageElement | null {
    if (this.imageCache.has(type)) return this.imageCache.get(type) ?? null;
    const src = BUILDING_IMAGE_SRC[type];
    if (!src) { this.imageCache.set(type, null); return null; }
    const img = new Image();
    this.imageCache.set(type, null);
    img.onload  = () => this.imageCache.set(type, img);
    img.onerror = () => this.imageCache.set(type, null);
    img.src = src;
    return null;
  }

  render(ctx: RenderContext): void {
    const buildings = ctx.state.buildings;
    if (!buildings || buildings.length === 0) return;

    const { ctx: c, state, worldWidth, worldHeight, viewport } = ctx;
    const { cols, rows } = state;
    if (!cols || !rows) return;

    const cellW = worldWidth / cols;
    const cellH = worldHeight / rows;

    // Розмір спрайту в world-units
    const spriteW = cellW * SPRITE_CELLS;
    const spriteH = cellH * SPRITE_CELLS;
    const halfW = spriteW / 2;
    const halfH = spriteH / 2;

    for (const b of buildings) {
      const col = b.tileIndex % cols;
      const row = (b.tileIndex / cols) | 0;

      const cx = (col + 0.5) * cellW;
      const cy = (row + 0.5) * cellH;

      // Viewport culling
      if (
        cx + halfW < viewport.x || cx - halfW > viewport.x + viewport.width ||
        cy + halfH < viewport.y || cy - halfH > viewport.y + viewport.height
      ) continue;

      const x = cx - halfW;
      const y = cy - halfH;

      const img = this.getImage(b.type);

      c.save();
      c.globalAlpha = b.underConstruction ? 0.45 : 1;

      if (img) {
        c.drawImage(img, x, y, spriteW, spriteH);
      } else {
        // Заповнювач поки не завантажено
        c.fillStyle = '#1e40af';
        c.globalAlpha = (b.underConstruction ? 0.45 : 1) * 0.6;
        c.fillRect(x, y, spriteW, spriteH);
      }

      c.restore();

      // Прогрес-бар під спрайтом
      if (b.underConstruction) {
        const total = BUILDING_CONSTRUCTION_TICKS[b.type] ?? 50;
        const pct = Math.max(0, 1 - b.constructionTicksLeft / total);
        const barH = cellH * 0.5;
        const barY = cy + halfH + cellH * 0.15;

        c.save();
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(x, barY, spriteW, barH);
        c.fillStyle = '#34d399';
        c.fillRect(x, barY, spriteW * pct, barH);
        c.restore();
      }
    }
  }
}
