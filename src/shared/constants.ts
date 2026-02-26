/**
 * Константи гри.
 */

export const GAME_PORT = 3001;
export const TICK_MS = 50;
export const TICKS_PER_SEC = 1000 / TICK_MS;

export const GAME = {
  SPAWN_TROOPS: 500,
  SPAWN_CLUSTER_SIZE: 30,
  MAX_TROOPS: 999_999,
  ATTACK_DEFAULT_FRACTION: 0.4,
  MIN_ATTACK_TROOPS: 5,
  TROOP_COST_NEUTRAL: 3,
  ATTACK_COST_MULTIPLIER: 2,
  DEFENSE_COST_DIVISOR: 1.7,
  SPEED_FACTOR_BASE: 0.325,
  // Нейтральна територія: швидкість = sqrt(troops / DIV), max MAX тайлів/тік
  // Більше військ → burst на старті → спадає природно по мірі витрат
  NEUTRAL_SPEED_TROOP_DIV: 6,
  NEUTRAL_SPEED_MAX: 10,
  INCOME_DIVISOR: 40,
  INCOME_BASE: 0.5,
  TROOPS_CAP_PER_TILE: 50,
  MAX_PLAYERS: 64,
} as const;

/** Розмір сітки карти; має збігатись з map4x.bin (1000×500).
 * Якщо COLS/ROWS відрізняються від розміру карти — індекс кліку (row*cols+col) не збігається
 * з сервером → спавн на воді, кордон території виходить на воду. */
export const MAP = {
  COLS: 1000,
  ROWS: 500,
} as const;

export const PLAYER_COLORS: string[] = Array.from({ length: 32 }, (_, i) => {
  const hue = Math.round((i * 137.508) % 360);
  const sat = i % 2 === 0 ? 75 : 65;
  const light = i % 3 === 0 ? 55 : i % 3 === 1 ? 60 : 50;
  return `hsl(${hue},${sat}%,${light}%)`;
});
