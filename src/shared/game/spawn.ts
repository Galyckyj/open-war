/**
 * Логіка спавну гравця: кластерне розміщення на карті.
 */

import type { Cell, GameState, PlayerId } from '../types';
import { GAME } from '../constants';
import { tickChangedCells } from '../utils/cellChanges';
import { initBorderSet } from '../utils/borderSetCache';

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

/**
 * allowRespawn=true — дозволяє змінити позицію спавну (лобі-фаза):
 * спочатку очищає стару територію гравця, потім розміщує кластер у новому місці.
 */
export function spawnPlayer(state: GameState, playerId: PlayerId, tile: number, allowRespawn = false): GameState {
  // O(1) перевірка через score замість O(n) cells.some()
  const player = state.players[playerId];
  const hasTerritory = (player?.score ?? 0) > 0;

  if (hasTerritory && !allowRespawn) return state;

  const cells = state.cells.slice();
  let clearedScore = 0;

  // Лобі-ре-спавн: очищаємо стару позицію гравця
  if (hasTerritory && allowRespawn) {
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]?.ownerId === playerId) {
        cells[i] = { ...cells[i]!, ownerId: null };
        clearedScore++;
      }
    }
  }

  const targetCell = cells[tile];
  if (!targetCell || targetCell.terrain !== 'land' || targetCell.ownerId !== null) {
    if (hasTerritory && allowRespawn) {
      // Скинули стару позицію — оновлюємо score інкрементально
      const p = state.players[playerId];
      if (p) {
        return { ...state, cells, players: { ...state.players, [playerId]: { ...p, score: Math.max(0, p.score - clearedScore) } } };
      }
      return { ...state, cells };
    }
    return state;
  }

  const clusterTiles = getSpawnCluster(tile, cells, state.cols, state.rows, GAME.SPAWN_CLUSTER_SIZE);
  if (clusterTiles.length === 0) {
    if (hasTerritory && allowRespawn) {
      const p = state.players[playerId];
      if (p) {
        return { ...state, cells, players: { ...state.players, [playerId]: { ...p, score: Math.max(0, p.score - clearedScore) } } };
      }
      return { ...state, cells };
    }
    return state;
  }

  const next = { ...state, cells, players: { ...state.players } };
  let addedScore = 0;
  for (const t of clusterTiles) {
    const c = next.cells[t];
    if (c?.terrain === 'land') {
      next.cells[t] = { ...c, ownerId: playerId };
      // Відстежуємо зміни для delta (щоб сервер відправив spawn-тайли клієнту)
      tickChangedCells.push([t, playerId]);
      addedScore++;
    }
  }

  const p = next.players[playerId];
  if (p) {
    next.players[playerId] = { ...p, troops: GAME.SPAWN_TROOPS, score: Math.max(0, (p.score - clearedScore) + addedScore) };
  }

  // Ініціалізуємо live border set для гравця (як OpenFrontIO player.borderTiles())
  initBorderSet(playerId, clusterTiles, next.cells, next.cols, next.rows);

  return next;
}
