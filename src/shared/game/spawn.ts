/**
 * Логіка спавну гравця: кластерне розміщення на карті.
 */

import type { Cell, GameState, PlayerId } from '../types';
import { GAME } from '../constants';
import { recomputeScores } from './territory';

function getSpawnCluster(center: number, cells: Cell[], cols: number, rows: number, size: number): number[] {
  if (cells[center]?.terrain !== 'land' || cells[center]?.ownerId !== null) return [];
  const cx = center % cols;
  const cy = Math.floor(center / cols);
  const radius = Math.sqrt(size / Math.PI);
  const result: number[] = [];
  const rCeil = Math.ceil(radius);
  for (let dy = -rCeil; dy <= rCeil; dy++) {
    for (let dx = -rCeil; dx <= rCeil; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const idx = ny * cols + nx;
      const cell = cells[idx];
      if (!cell || cell.terrain !== 'land' || cell.ownerId !== null) continue;
      result.push(idx);
    }
  }
  return result;
}

export function spawnPlayer(state: GameState, playerId: PlayerId, tile: number): GameState {
  const cell = state.cells[tile];
  if (!cell || cell.terrain !== 'land' || cell.ownerId !== null) return state;
  if (state.cells.some((c) => c.ownerId === playerId)) return state;
  const clusterTiles = getSpawnCluster(tile, state.cells, state.cols, state.rows, GAME.SPAWN_CLUSTER_SIZE);
  if (clusterTiles.length === 0) return state;
  const next = { ...state, cells: state.cells.map((c) => ({ ...c })), players: { ...state.players } };
  for (const t of clusterTiles) next.cells[t]!.ownerId = playerId;
  const player = next.players[playerId];
  if (player) next.players[playerId] = { ...player, troops: GAME.SPAWN_TROOPS };
  return recomputeScores(next);
}
