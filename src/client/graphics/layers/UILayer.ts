/**
 * Шар UI поверх карти: нікнейми та війська по центру території.
 */

import { MAP } from '../../../shared/constants';
import type { Layer, RenderContext } from '../types';

const COLS = MAP.COLS;
const ROWS = MAP.ROWS;

function getTerritoryBounds(
  cells: { ownerId: string | null }[],
  playerId: string,
  cols: number,
  rows: number,
): { minCol: number; maxCol: number; minRow: number; maxRow: number } | null {
  let minCol = cols,
    maxCol = 0,
    minRow = rows,
    maxRow = 0;
  let found = false;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.ownerId !== playerId) continue;
    found = true;
    const c = i % cols;
    const r = Math.floor(i / cols);
    if (c < minCol) minCol = c;
    if (c > maxCol) maxCol = c;
    if (r < minRow) minRow = r;
    if (r > maxRow) maxRow = r;
  }
  if (!found) return null;
  return { minCol, maxCol, minRow, maxRow };
}

function getTerritoryCenter(
  bounds: { minCol: number; maxCol: number; minRow: number; maxRow: number },
  cellW: number,
  cellH: number,
): { cx: number; cy: number; width: number; height: number } {
  const cx = (bounds.minCol + bounds.maxCol + 1) * 0.5 * cellW;
  const cy = (bounds.minRow + bounds.maxRow + 1) * 0.5 * cellH;
  const width = (bounds.maxCol - bounds.minCol + 1) * cellW;
  const height = (bounds.maxRow - bounds.minRow + 1) * cellH;
  return { cx, cy, width, height };
}

function nameFontSizeFromTerritory(
  width: number,
  height: number,
  nameLength: number,
): number {
  const widthConstrained = (width / Math.max(1, nameLength)) * 2;
  const heightConstrained = height / 3;
  return Math.min(widthConstrained, heightConstrained);
}

function formatTroops(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.floor(n));
}

export class UILayer implements Layer {
  visible = true;

  render(ctx: RenderContext): void {
    const { ctx: c, state, playerId, worldWidth, worldHeight } = ctx;
    const cells = state.cells ?? [];
    const { players, cols, rows } = state;
    const cellW = worldWidth / COLS;
    const cellH = worldHeight / ROWS;

    for (const [pid, player] of Object.entries(players)) {
      if (player.score === 0) continue;
      const bounds = getTerritoryBounds(cells, pid, cols, rows);
      if (!bounds) continue;
      const { cx, cy, width, height } = getTerritoryCenter(bounds, cellW, cellH);

      const name = player.name || 'Гравець';
      const rawNameSize = nameFontSizeFromTerritory(width, height, name.length);
      const nameFontSize = Math.max(cellW * 0.6, Math.min(rawNameSize, cellW * 4));
      const scoreScale = Math.min(2, 0.6 + Math.sqrt(player.score) * 0.04);
      const troopFontSize = Math.max(
        cellW * 1.2,
        Math.min(cellW * 1.8 * scoreScale, cellW * 6),
      );

      c.save();
      c.globalAlpha = 0.8;
      c.font = `${pid === playerId ? 'bold ' : ''}${nameFontSize}px sans-serif`;
      c.fillStyle = pid === playerId ? '#ffffff' : '#e0e0e0';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(name, cx, cy);
      c.restore();

      if (player.troops >= 1) {
        const label = formatTroops(player.troops);
        const troopOffsetY = nameFontSize * 0.55;
        const ty = cy + troopOffsetY;
        const charW = troopFontSize * 0.55;
        const bw = label.length * charW + troopFontSize * 0.6;
        const bh = troopFontSize * 1.1;

        c.save();
        c.fillStyle = 'rgba(0,0,0,0.5)';
        const r = bh * 0.25;
        c.beginPath();
        c.roundRect(cx - bw / 2, ty - bh / 2, bw, bh, r);
        c.fill();
        c.font = `${pid === playerId ? 'bold ' : ''}${troopFontSize}px sans-serif`;
        c.fillStyle = pid === playerId ? '#ffffff' : '#dddddd';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(label, cx, ty);
        c.restore();
      }
    }
  }
}
