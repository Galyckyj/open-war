/**
 * Виконання атак щотіку: пріоритетна черга, захоплення території.
 * Як OpenFrontIO: черга персистентна між тіками, не скидається щоразу.
 * НЕ клонуємо весь масив cells — мутуємо тільки змінені клітинки.
 */

import type { GameState } from "../types";
import { GAME } from "../constants";
import { getNeighbors, seededNext } from "../utils/math";
import { MinPriorityQueue } from "../utils/PriorityQueue";
import { recomputeScores } from "./territory";
import {
  getAttackCost,
  getDefenseCost,
  getSpeedFactor,
  calcTilePriority,
} from "./combat";

// Персистентні черги між тіками (як OpenFrontIO toConquer)
const attackQueues = new Map<string, MinPriorityQueue>();
// Чи була черга вже ініціалізована для цієї атаки
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

  // НЕ клонуємо весь масив — мутуємо cells напряму
  const cells = state.cells;
  const cols = state.cols;
  const rows = state.rows;
  const tick = state.tick;

  // Клонуємо тільки players (маленький об'єкт) і список атак
  const players = { ...state.players };
  const nextAttacks: GameState["attacks"] = [];
  const activeAttackIds = new Set<string>();

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
    );
    const numTilesPerTick = Math.max(1, Math.ceil(speedFactor));
    const targetOwner = attack.targetId ?? null;

    const queue = getOrCreateQueue(attack.id);

    // Ініціалізуємо чергу тільки один раз (як OpenFrontIO init())
    if (!attackInitialized.has(attack.id)) {
      attackInitialized.add(attack.id);
      let seed =
        attack.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ^ tick;
      const rng = () => {
        const r = seededNext(seed);
        seed = r.seed;
        return r.value;
      };

      for (let i = 0; i < cells.length; i++) {
        if (
          cells[i]?.ownerId !== attack.attackerId ||
          cells[i]?.terrain !== "land"
        )
          continue;
        for (const n of getNeighbors(i, cols, rows)) {
          const nc = cells[n];
          if (!nc || nc.terrain !== "land" || nc.ownerId !== targetOwner)
            continue;
          queue.enqueue(
            n,
            calcTilePriority(
              cells,
              n,
              attack.attackerId,
              cols,
              rows,
              tick,
              rng,
            ),
          );
        }
      }
    }

    let tilesThisTick = 0;

    while (tilesThisTick < numTilesPerTick && troops >= attackCost) {
      if (queue.size === 0) break;

      const idx = queue.dequeue();
      if (idx === undefined) break;

      const cell = cells[idx];
      // Пропускаємо воду, невалідні тайли, і тайли що вже захоплені
      if (!cell || cell.terrain !== "land" || cell.ownerId !== targetOwner)
        continue;
      // Перевіряємо що є сусід-атакувальник (як OpenFrontIO onBorder)
      if (
        !getNeighbors(idx, cols, rows).some(
          (n) => cells[n]?.ownerId === attack.attackerId,
        )
      )
        continue;

      // Клонуємо тільки цю клітинку
      cells[idx] = { ...cell, ownerId: attack.attackerId };
      troops -= attackCost;
      tilesThisTick++;

      if (attack.targetId) {
        const def = players[attack.targetId];
        if (def)
          players[attack.targetId] = {
            ...def,
            troops: Math.max(0, def.troops - defenseCost),
          };
      }

      // Додаємо нових сусідів до черги (як OpenFrontIO addNeighbors після conquer)
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
      // Повертаємо залишок атакувальнику
      const p = players[attack.attackerId];
      if (p && troops > 0)
        players[attack.attackerId] = {
          ...p,
          troops: Math.min(p.troops + Math.floor(troops), GAME.MAX_TROOPS),
        };
    }
  }

  // Чистимо черги завершених атак
  for (const id of attackQueues.keys()) {
    if (!activeAttackIds.has(id)) {
      attackQueues.delete(id);
      attackInitialized.delete(id);
    }
  }

  const next: GameState = { ...state, cells, players, attacks: nextAttacks };
  return recomputeScores(next);
}
