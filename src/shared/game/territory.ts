/**
 * Управління територіями: кордони, terrain, підрахунок score.
 */

import type { Cell, GameState, PlayerId } from '../types';
import { getNeighbors } from '../utils/math';

export function getBorderTiles(state: GameState, playerId: PlayerId): number[] {
  const { cells, cols, rows } = state;
  const out: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (!c || c.ownerId !== playerId || c.terrain !== 'land') continue;
    if (getNeighbors(i, cols, rows).some((n) => cells[n]?.ownerId !== playerId)) out.push(i);
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
    if (cell.ownerId) counts[cell.ownerId] = (counts[cell.ownerId] ?? 0) + 1;
  }
  const next = { ...state, players: { ...state.players } };
  for (const [id, player] of Object.entries(next.players)) {
    next.players[id] = { ...player, score: counts[id] ?? 0 };
  }
  return next;
}
