/**
 * Головний orchestrator ігрової логіки.
 * Збирає всі підсистеми та керує основним циклом оновлення.
 */

import type { GameState, PlayerInput } from './types';
import { addPlayer, createInitialState } from './game/players';
import { spawnPlayer } from './game/spawn';
import { launchAttack } from './game/combat';
import { tickAttacks } from './game/attackExecution';
import { tickTroopGeneration } from './game/income';

export { createInitialState, addPlayer } from './game/players';
export { spawnPlayer } from './game/spawn';
export { launchAttack } from './game/combat';
export { tickAttacks } from './game/attackExecution';
export { tickTroopGeneration } from './game/income';
export { getNeighbors } from './utils/math';
export { getBorderTiles, recomputeScores } from './game/territory';

export function updateGameState(state: GameState, inputs: PlayerInput[]): GameState {
  let next = tickTroopGeneration(state);
  next = tickAttacks(next);
  for (const input of inputs) {
    if (input.type === 'join' && input.payload?.name) {
      next = addPlayer(next, input.playerId, input.payload.name);
    } else if (input.type === 'spawn' && input.payload?.tile !== undefined) {
      next = spawnPlayer(next, input.playerId, input.payload.tile);
    } else if (input.type === 'attack') {
      const targetId = input.payload?.targetId !== undefined ? input.payload.targetId : undefined;
      if (targetId !== undefined) next = launchAttack(next, input.playerId, targetId, input.payload?.troops);
    }
  }
  return { ...next, tick: next.tick + 1 };
}
