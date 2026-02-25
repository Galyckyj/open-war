/**
 * Спільні типи гри (client + server).
 * Механіка як у OpenWarfare: TerritoryManager, BorderManager, AttackExecutor.
 */

export type PlayerId = string;

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  createdAt: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  score: number;
  troops: number;
}

export interface Cell {
  index: number;
  terrain: 'land' | 'water';
  ownerId: PlayerId | null;
}

export interface Attack {
  id: string;
  attackerId: PlayerId;
  targetId: PlayerId | null;
  troops: number;
}

export type GamePhase = 'lobby' | 'playing' | 'finished';

export interface GameState {
  phase: GamePhase;
  players: Record<PlayerId, Player>;
  cells: Cell[];
  attacks: Attack[];
  cols: number;
  rows: number;
  tick: number;
  lastDeltaIndices?: number[];
}

export type CellDelta = [number, PlayerId | null];

export interface PlayerInput {
  type: 'spawn' | 'attack' | 'join';
  playerId: PlayerId;
  payload?: {
    tile?: number;
    targetId?: string | null;
    troops?: number;
    name?: string;
  };
}
