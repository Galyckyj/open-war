/**
 * Виконання атак щотіку: пріоритетна черга, захоплення території.
 */

import type { GameState } from '../types';
import { GAME } from '../constants';
import { getNeighbors, seededNext } from '../utils/math';
import { MinPriorityQueue } from '../utils/PriorityQueue';
import { recomputeScores } from './territory';
import { getAttackCost, getDefenseCost, getSpeedFactor, calcTilePriority } from './combat';

const attackQueues = new Map<string, MinPriorityQueue>();

function getOrCreateQueue(attackId: string): MinPriorityQueue {
  if (!attackQueues.has(attackId)) attackQueues.set(attackId, new MinPriorityQueue());
  return attackQueues.get(attackId)!;
}

export function tickAttacks(state: GameState): GameState {
  const attacks = state.attacks ?? [];
  if (attacks.length === 0) {
    attackQueues.clear();
    return { ...state, attacks: [] };
  }

  let next: GameState = {
    ...state,
    cells: (state.cells ?? []).map((c) => ({ ...c })),
    players: { ...state.players },
    attacks: [],
  };
  const cells = next.cells;
  const cols = next.cols;
  const rows = next.rows;
  const tick = next.tick;

  const activeAttackIds = new Set<string>();

  for (const attack of attacks) {
    const attacker = next.players[attack.attackerId];
    if (!attacker) continue;
    let troops = attack.troops;
    if (troops < 1) continue;

    activeAttackIds.add(attack.id);

    const attackCost = getAttackCost(next, attack.targetId);
    const defenseCost = getDefenseCost(attackCost);
    const speedFactor = getSpeedFactor(next, attack.attackerId, attack.targetId);
    const numTilesPerTick = Math.max(1, Math.ceil(speedFactor));
    const targetOwner = attack.targetId ?? null;

    const queue = getOrCreateQueue(attack.id);

    if (queue.size === 0) {
      let seed = attack.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) ^ tick;
      const rng = () => { const r = seededNext(seed); seed = r.seed; return r.value; };

      for (let i = 0; i < cells.length; i++) {
        if (cells[i]?.ownerId !== attack.attackerId || cells[i]?.terrain !== 'land') continue;
        for (const n of getNeighbors(i, cols, rows)) {
          const nc = cells[n];
          if (!nc || nc.terrain !== 'land' || nc.ownerId !== targetOwner) continue;
          queue.enqueue(n, calcTilePriority(cells, n, attack.attackerId, cols, rows, tick, rng));
        }
      }
    }

    let tilesThisTick = 0;

    while (tilesThisTick < numTilesPerTick && troops >= attackCost) {
      if (queue.size === 0) break;

      const idx = queue.dequeue();
      if (idx === undefined) break;

      const cell = cells[idx];
      if (!cell || cell.ownerId !== targetOwner || cell.terrain !== 'land') continue;
      if (!getNeighbors(idx, cols, rows).some((n) => cells[n]?.ownerId === attack.attackerId)) continue;

      cells[idx] = { ...cell, ownerId: attack.attackerId };
      troops -= attackCost;
      tilesThisTick++;

      if (attack.targetId) {
        const def = next.players[attack.targetId];
        if (def) next.players[attack.targetId] = { ...def, troops: Math.max(0, def.troops - defenseCost) };
      }

      let seed = (tick * 100003 + idx) | 0;
      const rng = () => { const r = seededNext(seed); seed = r.seed; return r.value; };

      for (const n of getNeighbors(idx, cols, rows)) {
        const nc = cells[n];
        if (!nc || nc.terrain !== 'land' || nc.ownerId !== targetOwner) continue;
        queue.enqueue(n, calcTilePriority(cells, n, attack.attackerId, cols, rows, tick, rng));
      }
    }

    if (troops >= 1) {
      next.attacks.push({ ...attack, troops: Math.floor(troops) });
    } else if (troops > 0) {
      const p = next.players[attack.attackerId];
      if (p) next.players[attack.attackerId] = { ...p, troops: Math.min(p.troops + Math.floor(troops), GAME.MAX_TROOPS) };
    }
  }

  for (const id of attackQueues.keys()) {
    if (!activeAttackIds.has(id)) attackQueues.delete(id);
  }

  return recomputeScores(next);
}
