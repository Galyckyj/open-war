/**
 * Генерація військ (income) — повільна, залежить від території.
 */

import type { GameState } from '../types';
import { GAME, TICKS_PER_SEC } from '../constants';

export function tickTroopGeneration(state: GameState): GameState {
  if (state.tick % 2 !== 0) return state;

  const next = { ...state, players: { ...state.players } };
  for (const [id, player] of Object.entries(next.players)) {
    const territory = player.score;
    if (territory === 0) continue;
    const gain = GAME.INCOME_BASE + territory / GAME.INCOME_DIVISOR;
    const cap = territory * GAME.TROOPS_CAP_PER_TILE;
    next.players[id] = {
      ...player,
      troops: Math.min(cap, player.troops + gain),
    };
  }
  return next;
}
