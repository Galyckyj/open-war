/**
 * Бойова система: розрахунок вартості атаки, швидкості, запуск атак.
 */

import type { Cell, GameState, PlayerId } from '../types';
import { GAME } from '../constants';
import { getNeighbors } from '../utils/math';
import { getBorderSetFor } from '../utils/borderSetCache';
import { getLandTileIndices } from '../utils/landCache';
import { getTerrainMag } from './territory';

export function getAttackCost(state: GameState, targetId: PlayerId | null): number {
  if (!targetId) return GAME.TROOP_COST_NEUTRAL;
  const target = state.players[targetId];
  if (!target || target.score < 1) return GAME.TROOP_COST_NEUTRAL;
  return Math.max(GAME.TROOP_COST_NEUTRAL, Math.floor((target.troops / target.score) * GAME.ATTACK_COST_MULTIPLIER));
}

/**
 * Швидкість захоплення тайлів на тік.
 * Нейтральна: sqrt(troops / DIV) — burst на початку, природний спад у міру витрат.
 * Проти гравця: логарифмічна крива від співвідношення сил (як раніше).
 */
export function getSpeedFactor(
  state: GameState,
  attackerId: PlayerId,
  targetId: PlayerId | null,
  attackTroops: number = 0,
): number {
  if (!targetId) {
    // Більше військ → швидший старт; по мірі витрат troops зменшується → сповільнення
    const raw = Math.sqrt(Math.max(1, attackTroops / GAME.NEUTRAL_SPEED_TROOP_DIV));
    return Math.min(GAME.NEUTRAL_SPEED_MAX, Math.max(1, raw));
  }
  const attacker = state.players[attackerId];
  const target = state.players[targetId];
  if (!attacker || !target || target.score < 1 || target.troops < 1) return 1;
  const ratio = Math.min(50, (attacker.score * attacker.troops) / target.score / target.troops);
  return 2 / (GAME.SPEED_FACTOR_BASE + Math.log(1 + ratio));
}

export function getDefenseCost(attackCost: number): number {
  return Math.ceil((1 + attackCost) / GAME.DEFENSE_COST_DIVISOR);
}

export function calcTilePriority(
  cells: Cell[],
  neighborIdx: number,
  attackerId: PlayerId,
  cols: number,
  rows: number,
  tick: number,
  rng: () => number,
): number {
  const cell = cells[neighborIdx]!;
  const mag = getTerrainMag(cell);

  let numOwnedByMe = 0;
  for (const n of getNeighbors(neighborIdx, cols, rows)) {
    if (cells[n]?.ownerId === attackerId) numOwnedByMe++;
  }

  return (rng() * 7 + 10) * (1 - numOwnedByMe * 0.5 + mag / 2) + tick;
}

export function launchAttack(
  state: GameState,
  attackerId: PlayerId,
  targetId: PlayerId | null,
  troops?: number,
): GameState {
  const attacker = state.players[attackerId];
  if (!attacker) return state;
  const send =
    troops !== undefined && troops > 0
      ? Math.min(troops, attacker.troops)
      : Math.floor(attacker.troops * GAME.ATTACK_DEFAULT_FRACTION);
  if (send < GAME.MIN_ATTACK_TROOPS) return state;
  if (targetId === attackerId) return state;

  const cells = state.cells ?? [];
  const cols = state.cols;
  const rows = state.rows;

  // ОПТИМІЗАЦІЯ: замість getBorderTiles O(158k) → border set O(border_size) з ранній виходом.
  // Як OpenFrontIO: перевіряємо тільки border tiles гравця, не всю карту.
  let hasBorder = false;
  const borderSet = getBorderSetFor(attackerId);
  if (borderSet.size > 0) {
    // Швидкий шлях: є live border set
    BORDER_CHECK: for (const tile of borderSet) {
      for (const n of getNeighbors(tile, cols, rows)) {
        const nc = cells[n];
        if (!nc || nc.terrain !== 'land') continue;
        const owner = nc.ownerId ?? null;
        if (targetId === null ? owner === null : owner === targetId) {
          hasBorder = true;
          break BORDER_CHECK;
        }
      }
    }
  } else {
    // Fallback: border set ще не ініціалізований — O(158k/score) з раннім виходом
    const land = getLandTileIndices(cells);
    LAND_CHECK: for (let li = 0; li < land.length; li++) {
      const i = land[li]!;
      if (cells[i]?.ownerId !== attackerId) continue;
      const x = i % cols;
      const y = (i / cols) | 0;
      const ns = [x > 0 ? i-1 : -1, x < cols-1 ? i+1 : -1, y > 0 ? i-cols : -1, y < rows-1 ? i+cols : -1] as const;
      for (const n of ns) {
        if (n < 0) continue;
        const nc = cells[n];
        if (!nc || nc.terrain !== 'land') continue;
        const owner = nc.ownerId ?? null;
        if (targetId === null ? owner === null : owner === targetId) {
          hasBorder = true;
          break LAND_CHECK;
        }
      }
    }
  }
  if (!hasBorder) return state;

  let actualSend = send;
  let attacks = state.attacks ?? [];
  const existingOpposite = attacks.find((a) => a.attackerId === targetId && a.targetId === attackerId);
  if (existingOpposite) {
    if (existingOpposite.troops >= send) {
      actualSend = 0;
      attacks = attacks.map((a) => (a.id === existingOpposite.id ? { ...a, troops: a.troops - send } : a)).filter((a) => a.troops > 0);
    } else {
      actualSend = send - existingOpposite.troops;
      attacks = attacks.filter((a) => a.id !== existingOpposite.id);
    }
  }
  if (actualSend < GAME.MIN_ATTACK_TROOPS) return { ...state, attacks };

  const next = { ...state, players: { ...state.players }, attacks: [...attacks] };
  next.players[attackerId] = { ...attacker, troops: attacker.troops - actualSend };
  const existing = next.attacks.findIndex((a) => a.attackerId === attackerId && a.targetId === targetId);
  if (existing >= 0) {
    const ex = next.attacks[existing]!;
    next.attacks[existing] = { ...ex, troops: ex.troops + actualSend };
  } else {
    next.attacks.push({
      id: `${attackerId}-${targetId ?? 'neutral'}-${state.tick}`,
      attackerId,
      targetId,
      troops: actualSend,
    });
  }
  return next;
}
