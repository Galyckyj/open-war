/**
 * Управління територіями: кордони, terrain, підрахунок score.
 */

import type { Cell, GameState, PlayerId } from '../types';
import { getLandTileIndices } from '../utils/landCache';

export function getBorderTiles(state: GameState, playerId: PlayerId): number[] {
  const { cells, cols, rows } = state;
  // Використовуємо кеш суші: O(158k) замість O(500k)
  const land = getLandTileIndices(cells);
  const out: number[] = [];
  for (let li = 0; li < land.length; li++) {
    const i = land[li]!;
    const c = cells[i];
    if (!c || c.ownerId !== playerId) continue;
    const x = i % cols;
    const y = (i / cols) | 0;
    let isB = false;
    if (!isB && x > 0)        { const n = cells[i-1];   isB = (n?.terrain === 'land' && n.ownerId !== playerId); }
    if (!isB && x < cols - 1) { const n = cells[i+1];   isB = (n?.terrain === 'land' && n.ownerId !== playerId); }
    if (!isB && y > 0)        { const n = cells[i-cols]; isB = (n?.terrain === 'land' && n.ownerId !== playerId); }
    if (!isB && y < rows - 1) { const n = cells[i+cols]; isB = (n?.terrain === 'land' && n.ownerId !== playerId); }
    if (isB) out.push(i);
  }
  return out;
}

export function getTerrainMag(cell: Cell): number {
  switch ((cell as any).terrainType) {
    case 'highland': return 1.5;
    case 'mountain': return 2.0;
    default:         return 1.0;
  }
}

export function recomputeScores(state: GameState): GameState {
  const counts: Record<string, number> = {};
  for (const cell of state.cells ?? []) {
    if (cell.ownerId && cell.terrain === 'land') counts[cell.ownerId] = (counts[cell.ownerId] ?? 0) + 1;
  }
  const next = { ...state, players: { ...state.players } };
  for (const [id, player] of Object.entries(next.players)) {
    next.players[id] = { ...player, score: counts[id] ?? 0 };
  }
  return next;
}
