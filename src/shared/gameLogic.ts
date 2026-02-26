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
  const inLobby = state.phase === 'lobby' && (state.lobbyEndsAt ?? 0) > Date.now();

  // Під час лобі — лише реєстрація та спавн, без бою
  let next: GameState = inLobby
    ? state
    : tickTroopGeneration(tickAttacks(state));

  // Лобі закінчилось → переходимо в playing
  if (state.phase === 'lobby' && !inLobby) {
    next = { ...next, phase: 'playing', lobbyEndsAt: undefined };
  }

  for (const input of inputs) {
    if (input.type === 'join' && input.payload?.name) {
      next = addPlayer(next, input.playerId, input.payload.name);
    } else if (input.type === 'spawn' && input.payload?.tile !== undefined) {
      // Під час лобі дозволяємо змінити позицію спавну
      next = spawnPlayer(next, input.playerId, input.payload.tile, inLobby);
    } else if (input.type === 'attack' && !inLobby) {
      const targetId = input.payload?.targetId !== undefined ? input.payload.targetId : undefined;
      if (targetId !== undefined) next = launchAttack(next, input.playerId, targetId, input.payload?.troops);
    }
  }
  return { ...next, tick: next.tick + 1 };
}
