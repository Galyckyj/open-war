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
  /** 'land' — можна захопити/спавнити; 'water' — непрохідна (як стіна), туди не зайти. */
  terrain: 'land' | 'water';
  ownerId: PlayerId | null;
}

export interface Attack {
  id: string;
  attackerId: PlayerId;
  targetId: PlayerId | null;
  troops: number;
}

export type BuildingType = 'port' | 'fortress' | 'farm' | 'barracks';

export const BUILDING_CONSTRUCTION_TICKS: Record<BuildingType, number> = {
  port:     50,
  fortress: 60,
  farm:     40,
  barracks: 55,
};

export interface Building {
  id: string;
  type: BuildingType;
  ownerId: PlayerId;
  tileIndex: number;
  /** true — ще будується, false — активна */
  underConstruction: boolean;
  constructionTicksLeft: number;
}

export type GamePhase = 'lobby' | 'playing' | 'finished';

export interface GameState {
  phase: GamePhase;
  /** Unix-мітка (ms) коли закінчується лобі-фаза (лише у phase='lobby'). */
  lobbyEndsAt?: number;
  players: Record<PlayerId, Player>;
  cells: Cell[];
  attacks: Attack[];
  buildings: Building[];
  cols: number;
  rows: number;
  tick: number;
  lastDeltaIndices?: number[];
}

export type CellDelta = [number, PlayerId | null];

export interface PlayerInput {
  type: 'spawn' | 'attack' | 'join' | 'build' | 'demolish';
  playerId: PlayerId;
  payload?: {
    tile?: number;
    targetId?: string | null;
    troops?: number;
    name?: string;
    buildingType?: BuildingType;
  };
}
