/**
 * Управління гравцями: додавання, створення початкового стану.
 */

import type { Cell, GameState, PlayerId } from '../types';
import { GAME, MAP, PLAYER_COLORS } from '../constants';

/** Якщо передано terrain (наприклад з карти світу), використовує його; інакше — процедурна генерація. */
export function createInitialState(worldTerrain?: ReadonlyArray<'land' | 'water'>): GameState {
  const { COLS: cols, ROWS: rows } = MAP;
  const cells: Cell[] = [];
  const total = cols * rows;

  if (worldTerrain && worldTerrain.length >= total) {
    for (let i = 0; i < total; i++) {
      const t = worldTerrain[i];
      cells.push({ index: i, terrain: t === 'water' ? 'water' : 'land', ownerId: null });
    }
  } else {
    const hashNoise = (x: number, y: number) => {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return n - Math.floor(n);
    };
    for (let i = 0; i < total; i++) {
      const x = i % cols;
      const y = Math.floor(i / cols);
      const nx = (x / (cols - 1)) * 2 - 1;
      const ny = (y / (rows - 1)) * 2 - 1;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const noise = hashNoise(x, y) * 0.4;
      const terrain: Cell['terrain'] = dist + noise < 0.95 ? 'land' : 'water';
      cells.push({ index: i, terrain, ownerId: null });
    }
  }

  return { phase: 'playing', players: {}, cells, attacks: [], cols, rows, tick: 0 };
}

export function addPlayer(state: GameState, playerId: PlayerId, name: string): GameState {
  if (state.players[playerId]) return state;
  const next = { ...state, players: { ...state.players } };
  const usedColors = new Set(Object.values(next.players).map((p) => p.color));
  const color =
    PLAYER_COLORS.find((c) => !usedColors.has(c)) ??
    `hsl(${Math.round((Object.keys(next.players).length * 137.508) % 360)},70%,55%)`;
  next.players[playerId] = { id: playerId, name, color, score: 0, troops: GAME.SPAWN_TROOPS };
  return next;
}
