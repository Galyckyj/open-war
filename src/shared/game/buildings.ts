/**
 * Логіка будівель: розміщення, будівництво (тік-таймер), ефекти.
 * Архітектура схожа на OpenFrontIO ConstructionExecution + PortExecution.
 */

import type { GameState, PlayerId, BuildingType } from '../types';
import { BUILDING_CONSTRUCTION_TICKS } from '../types';

/** Дохід військ від будівлі за тік (коли завершена). */
const BUILDING_TROOP_INCOME: Partial<Record<BuildingType, number>> = {
  farm:     3,
  barracks: 2,
};

/** Перевіряє чи може гравець побудувати на клітині. */
function canBuild(
  state: GameState,
  playerId: PlayerId,
  tileIndex: number,
  type: BuildingType,
): boolean {
  const cell = state.cells[tileIndex];
  if (!cell || cell.terrain !== 'land') return false;
  if (cell.ownerId !== playerId) return false;
  // Тільки одна будівля на клітині
  if (state.buildings.some((b) => b.tileIndex === tileIndex)) return false;
  // Порт — лише поруч з водою
  if (type === 'port') {
    const { cols, rows } = state;
    const col = tileIndex % cols;
    const row = (tileIndex / cols) | 0;
    const neighbors = [
      col > 0        ? tileIndex - 1    : -1,
      col < cols - 1 ? tileIndex + 1    : -1,
      row > 0        ? tileIndex - cols  : -1,
      row < rows - 1 ? tileIndex + cols  : -1,
    ];
    const hasWater = neighbors.some((n) => n >= 0 && state.cells[n]?.terrain === 'water');
    if (!hasWater) return false;
  }
  return true;
}

/** Обробляє input 'build' — додає будівлю зі статусом underConstruction. */
export function placeBuilding(
  state: GameState,
  playerId: PlayerId,
  tileIndex: number,
  type: BuildingType,
): GameState {
  if (!canBuild(state, playerId, tileIndex, type)) return state;

  const building = {
    id: `${playerId}-${type}-${tileIndex}-${state.tick}`,
    type,
    ownerId: playerId,
    tileIndex,
    underConstruction: true,
    constructionTicksLeft: BUILDING_CONSTRUCTION_TICKS[type],
  };

  return { ...state, buildings: [...state.buildings, building] };
}

/** Обробляє input 'demolish' — знищує будівлю на клітині. */
export function demolishBuilding(
  state: GameState,
  playerId: PlayerId,
  tileIndex: number,
): GameState {
  const idx = state.buildings.findIndex(
    (b) => b.tileIndex === tileIndex && b.ownerId === playerId,
  );
  if (idx === -1) return state;
  const next = [...state.buildings];
  next.splice(idx, 1);
  return { ...state, buildings: next };
}

/**
 * Викликається кожен тік:
 * - Зменшує constructionTicksLeft
 * - Переводить у active коли 0
 * - Застосовує ефекти активних будівель (дохід тощо)
 * - Знищує будівлі, клітина яких більше не належить власнику
 */
export function tickBuildings(state: GameState): GameState {
  if (state.buildings.length === 0) return state;

  const players = { ...state.players };
  const nextBuildings = [];

  for (const b of state.buildings) {
    const cell = state.cells[b.tileIndex];

    // Будівля знищується якщо клітину захопили
    if (!cell || cell.ownerId !== b.ownerId) continue;

    if (b.underConstruction) {
      const left = b.constructionTicksLeft - 1;
      nextBuildings.push(
        left <= 0
          ? { ...b, underConstruction: false, constructionTicksLeft: 0 }
          : { ...b, constructionTicksLeft: left },
      );
      continue;
    }

    // Ефекти активної будівлі
    const income = BUILDING_TROOP_INCOME[b.type] ?? 0;
    if (income > 0 && players[b.ownerId]) {
      players[b.ownerId] = {
        ...players[b.ownerId]!,
        troops: players[b.ownerId]!.troops + income,
      };
    }

    nextBuildings.push(b);
  }

  return { ...state, players, buildings: nextBuildings };
}
