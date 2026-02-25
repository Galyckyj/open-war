/**
 * Шар територій гравців — напівпрозорі кольори поверх терену (як OpenFrontIO).
 * Заповнення alpha ≈ 150/255; кордон — 1px лінія затемненим кольором.
 * Деталі: docs/TERRITORY_COLORS.md
 */

import { MAP } from '../../../shared/constants';
import type { Layer, RenderContext } from '../types';
import { getCellColor, getBorderColor, isBorderTile } from '../mapUtils';

const COLS = MAP.COLS;
const ROWS = MAP.ROWS;
const MAX_TERRITORY_DRAW_CELLS = 28_000;
const MIN_CELL_SIZE_PX = 1.2;
/** Alpha заповнення території (150/255), щоб просвічував TerrainLayer. */
const TERRITORY_ALPHA = 150 / 255;
/** Кордон — 1px лінія, непрозорий. */
const BORDER_ALPHA = 1;

export class TerritoryLayer implements Layer {
  visible = true;

  render(ctx: RenderContext): void {
    const { ctx: c, state, viewport, worldWidth, worldHeight, scale } = ctx;
    const cells = state.cells ?? [];
    const { players, cols, rows } = state;

    const CELL_W = worldWidth / cols;
    const CELL_H = worldHeight / rows;
    const cellPx = Math.min(CELL_W * scale, CELL_H * scale);
    const visibleCols = Math.ceil(viewport.width / CELL_W);
    const visibleRows = Math.ceil(viewport.height / CELL_H);
    const visibleCells = visibleCols * visibleRows;

    const startCol = Math.max(0, Math.floor(viewport.x / CELL_W));
    const endCol = Math.min(cols, Math.ceil((viewport.x + viewport.width) / CELL_W));
    const startRow = Math.max(0, Math.floor(viewport.y / CELL_H));
    const endRow = Math.min(rows, Math.ceil((viewport.y + viewport.height) / CELL_H));

    const overLimit = visibleCells > MAX_TERRITORY_DRAW_CELLS || cellPx < MIN_CELL_SIZE_PX;
    const step = overLimit
      ? Math.max(1, Math.ceil(Math.sqrt(visibleCells / MAX_TERRITORY_DRAW_CELLS)))
      : 1;

    // Заповнення територій (при віддаленні — один прямокутник на блок step×step)
    c.globalAlpha = TERRITORY_ALPHA;
    for (let row = startRow; row < endRow; row += step) {
      for (let col = startCol; col < endCol; col += step) {
        const index = row * cols + col;
        const cell = cells[index];
        if (!cell || cell.ownerId === null) continue;
        c.fillStyle = getCellColor(cell, players);
        const w = step === 1 ? CELL_W : CELL_W * step;
        const h = step === 1 ? CELL_H : CELL_H * step;
        c.fillRect(col * CELL_W, row * CELL_H, w, h);
      }
    }

    // Кордон 1px лише при нормальному зумі (не downsampled)
    if (step === 1) {
      const borderColorCache = new Map<string, string>();
      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const index = row * cols + col;
          const cell = cells[index];
          if (!cell || cell.ownerId === null || cell.terrain !== 'land') continue;
          if (!isBorderTile(index, cell.ownerId, cells, cols, rows)) continue;

          const fillColor = getCellColor(cell, players);
          const borderColor =
            borderColorCache.get(fillColor) ?? (borderColorCache.set(fillColor, getBorderColor(fillColor)), borderColorCache.get(fillColor)!);
          const leftIdx = col > 0 ? index - 1 : -1;
          const rightIdx = col < cols - 1 ? index + 1 : -1;
          const topIdx = row > 0 ? index - cols : -1;
          const bottomIdx = row < rows - 1 ? index + cols : -1;

          c.globalAlpha = BORDER_ALPHA;
          c.fillStyle = borderColor;
          if (leftIdx >= 0 && cells[leftIdx]?.ownerId !== cell.ownerId) c.fillRect(col * CELL_W, row * CELL_H, 1, CELL_H);
          if (rightIdx >= 0 && cells[rightIdx]?.ownerId !== cell.ownerId) c.fillRect((col + 1) * CELL_W - 1, row * CELL_H, 1, CELL_H);
          if (topIdx >= 0 && cells[topIdx]?.ownerId !== cell.ownerId) c.fillRect(col * CELL_W, row * CELL_H, CELL_W, 1);
          if (bottomIdx >= 0 && cells[bottomIdx]?.ownerId !== cell.ownerId) c.fillRect(col * CELL_W, (row + 1) * CELL_H - 1, CELL_W, 1);
        }
      }
    }

    c.globalAlpha = 1;
  }
}
