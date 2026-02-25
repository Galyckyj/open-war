/**
 * Утиліти для MapLayer: кольори клітин, border.
 */

import type { GameState } from '../../shared/types';
import { getNeighbors } from '../../shared/gameLogic';

const colorCache = new Map<string, string>();
function parseColor(s: string): string {
  const cached = colorCache.get(s);
  if (cached !== undefined) return cached;
  if (s.startsWith('#')) {
    colorCache.set(s, s);
    return s;
  }
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    colorCache.set(s, `rgb(${r},${g},${b})`);
    return colorCache.get(s)!;
  } catch {
    return 'rgb(71, 85, 105)';
  }
}

/** Базовий колір терену (без гравця) — для відмальовування карти як у OpenFrontIO. */
export function getTerrainColor(cell: { terrain: string }): string {
  return cell.terrain === 'water' ? '#417faf' : '#4a7c59';
}

export function getCellColor(
  cell: { terrain: string; ownerId: string | null },
  players: GameState['players'],
): string {
  if (cell.terrain === 'water') return '#417faf';
  if (cell.ownerId) return parseColor(players[cell.ownerId]?.color ?? '#64748b');
  return 'rgb(45, 63, 82)';
}

export function isBorderTile(
  index: number,
  ownerId: string | null,
  cells: GameState['cells'],
  cols: number,
  rows: number,
): boolean {
  return getNeighbors(index, cols, rows).some((n) => cells[n]?.ownerId !== ownerId);
}

/** Темніший колір для кордону, як у OpenFrontIO (darken 12.5%). */
export function getBorderColor(territoryColor: string): string {
  const m = territoryColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return territoryColor;
  const factor = 0.875;
  const r = Math.round(Number(m[1]) * factor);
  const g = Math.round(Number(m[2]) * factor);
  const b = Math.round(Number(m[3]) * factor);
  return `rgb(${r},${g},${b})`;
}
