/**
 * Виконання атак щотіку: пріоритетна черга, захоплення території.
 * Як OpenFrontIO: черга персистентна між тіками, не скидається щоразу.
 *
 * КЛЮЧОВА ОПТИМІЗАЦІЯ (як OpenFrontIO player.borderTiles()):
 *   - Ніяких cells.slice() — мутуємо state.cells напряму.
 *     Delta відстежується через tickChangedCells, не через порівняння масивів.
 *   - Ініціалізація черги через getBorderSetFor() O(border_size) замість O(land_tiles).
 *   - onCellCaptured() оновлює border sets O(1) при кожному захопленні.
 */

import type { GameState } from "../types";
import { GAME } from "../constants";
import { getNeighbors, seededNext } from "../utils/math";
import { MinPriorityQueue } from "../utils/PriorityQueue";
import { tickChangedCells } from "../utils/cellChanges";
import { getBorderSetFor, onCellCaptured } from "../utils/borderSetCache";
import { getLandTileIndices } from "../utils/landCache";
import {
  getAttackCost,
  getDefenseCost,
  getSpeedFactor,
  calcTilePriority,
} from "./combat";

// Персистентні черги між тіками (як OpenFrontIO toConquer)
const attackQueues = new Map<string, MinPriorityQueue>();
const attackInitialized = new Set<string>();

function getOrCreateQueue(attackId: string): MinPriorityQueue {
  if (!attackQueues.has(attackId))
    attackQueues.set(attackId, new MinPriorityQueue());
  return attackQueues.get(attackId)!;
}

export function tickAttacks(state: GameState): GameState {
  const attacks = state.attacks ?? [];
  if (attacks.length === 0) {
    attackQueues.clear();
    attackInitialized.clear();
    return { ...state, attacks: [] };
  }

  // Мутуємо cells напряму — delta відслідковується через tickChangedCells.
  // cells.slice() не потрібен: сервер більше не порівнює prev/next масив.
  const cells = state.cells;
  const cols = state.cols;
  const rows = state.rows;
  const tick = state.tick;

  const players = { ...state.players };
  const nextAttacks: GameState["attacks"] = [];
  const activeAttackIds = new Set<string>();
  const scoreDeltas = new Map<string, number>();
  // НЕ очищуємо tickChangedCells тут — сервер очищує на початку кожного тіку.
  // Це дозволяє spawnPlayer і tickAttacks разом наповнювати один буфер.

  for (const attack of attacks) {
    const attacker = players[attack.attackerId];
    if (!attacker) continue;
    let troops = attack.troops;
    if (troops < 1) continue;

    activeAttackIds.add(attack.id);

    const attackCost = getAttackCost(state, attack.targetId);
    const defenseCost = getDefenseCost(attackCost);
    const speedFactor = getSpeedFactor(
      state,
      attack.attackerId,
      attack.targetId,
      troops,
    );
    const numTilesPerTick = Math.max(1, Math.ceil(speedFactor));
    const targetOwner = attack.targetId ?? null;

    const queue = getOrCreateQueue(attack.id);

    // ОПТИМІЗАЦІЯ: ініціалізація черги через live borderSet O(border_size)
    // замість O(land_tiles) сканування всіх клітинок.
    // Аналог OpenFrontIO AttackExecution.refreshToConquer() → player.borderTiles()
    if (!attackInitialized.has(attack.id)) {
      attackInitialized.add(attack.id);
      let seed =
        attack.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ^ tick;
      const rng = () => {
        const r = seededNext(seed);
        seed = r.seed;
        return r.value;
      };

      const borderSet = getBorderSetFor(attack.attackerId);
      for (const i of borderSet) {
        for (const n of getNeighbors(i, cols, rows)) {
          const nc = cells[n];
          if (!nc || nc.terrain !== "land" || nc.ownerId !== targetOwner)
            continue;
          queue.enqueue(
            n,
            calcTilePriority(cells, n, attack.attackerId, cols, rows, tick, rng),
          );
        }
      }

      // Fallback: якщо borderSet ще порожній (гравець заспавнився але initBorderSet
      // ще не встиг викликатись), сканує landTileIndices O(158k) один раз.
      if (borderSet.size === 0) {
        const landTiles = getLandTileIndices(cells);
        for (let li = 0; li < landTiles.length; li++) {
          const i = landTiles[li]!;
          if (cells[i]?.ownerId !== attack.attackerId) continue;
          for (const n of getNeighbors(i, cols, rows)) {
            const nc = cells[n];
            if (!nc || nc.terrain !== "land" || nc.ownerId !== targetOwner) continue;
            queue.enqueue(n, calcTilePriority(cells, n, attack.attackerId, cols, rows, tick, rng));
          }
        }
      }
    }

    let tilesThisTick = 0;

    while (tilesThisTick < numTilesPerTick && troops >= attackCost) {
      if (queue.size === 0) break;

      const idx = queue.dequeue();
      if (idx === undefined) break;

      const cell = cells[idx];
      if (!cell || cell.terrain !== "land" || cell.ownerId !== targetOwner)
        continue;
      if (
        !getNeighbors(idx, cols, rows).some(
          (n) => cells[n]?.ownerId === attack.attackerId,
        )
      )
        continue;

      // Захоплення клітинки — мутуємо напряму
      const oldOwnerId = cell.ownerId;
      cells[idx] = { ...cell, ownerId: attack.attackerId };

      // Відстежуємо зміну для delta та оновлюємо border sets
      tickChangedCells.push([idx, attack.attackerId]);
      onCellCaptured(idx, oldOwnerId, attack.attackerId, cells, cols, rows);

      troops -= attackCost;
      tilesThisTick++;

      scoreDeltas.set(attack.attackerId, (scoreDeltas.get(attack.attackerId) ?? 0) + 1);
      if (oldOwnerId !== null) {
        scoreDeltas.set(oldOwnerId, (scoreDeltas.get(oldOwnerId) ?? 0) - 1);
      }

      if (attack.targetId) {
        const def = players[attack.targetId];
        if (def)
          players[attack.targetId] = {
            ...def,
            troops: Math.max(0, def.troops - defenseCost),
          };
      }

      let seed = (tick * 100003 + idx) | 0;
      const rng = () => {
        const r = seededNext(seed);
        seed = r.seed;
        return r.value;
      };
      for (const n of getNeighbors(idx, cols, rows)) {
        const nc = cells[n];
        if (!nc || nc.terrain !== "land" || nc.ownerId !== targetOwner)
          continue;
        queue.enqueue(
          n,
          calcTilePriority(cells, n, attack.attackerId, cols, rows, tick, rng),
        );
      }
    }

    if (troops >= 1) {
      nextAttacks.push({ ...attack, troops: Math.floor(troops) });
    } else {
      const p = players[attack.attackerId];
      if (p && troops > 0)
        players[attack.attackerId] = {
          ...p,
          troops: Math.min(p.troops + Math.floor(troops), GAME.MAX_TROOPS),
        };
    }
  }

  for (const id of attackQueues.keys()) {
    if (!activeAttackIds.has(id)) {
      attackQueues.delete(id);
      attackInitialized.delete(id);
    }
  }

  for (const [pid, delta] of scoreDeltas) {
    const p = players[pid];
    if (p) players[pid] = { ...p, score: Math.max(0, (p.score ?? 0) + delta) };
  }

  return { ...state, players, attacks: nextAttacks };
}
