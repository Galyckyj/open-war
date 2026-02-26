/**
 * Per-player live border tile cache.
 * Ідея з OpenFrontIO: player.borderTiles() — жива Set кордонних тайлів.
 * Оновлюється інкрементально (O(1) per capture) замість O(land_tiles) сканування.
 *
 * Це замінює getBorderTiles O(158k) → O(1) lookup.
 * Ключові споживачі:
 *   - attackExecution.ts: ініціалізація черги атаки (було O(158k), тепер O(border_size))
 *   - combat.ts launchAttack: перевірка наявності кордону (було O(158k), тепер O(border_size))
 *   - bots.ts findBestTarget: пошук суміжних цілей (було O(158k), тепер O(border_size))
 */

import type { GameState } from '../types';

const _sets = new Map<string, Set<number>>();
const _EMPTY: ReadonlySet<number> = new Set();

/** O(1) — повертає кордонні тайли гравця. */
export function getBorderSetFor(playerId: string): ReadonlySet<number> {
  return _sets.get(playerId) ?? _EMPTY;
}

/**
 * Ініціалізувати border set після спавну гравця.
 * O(clusterTiles × 5) — викликається один раз при спавні.
 */
export function initBorderSet(
  playerId: string,
  clusterTiles: number[],
  cells: GameState['cells'],
  cols: number,
  rows: number,
): void {
  const set = new Set<number>();
  for (const idx of clusterTiles) {
    if (isPlayerBorderTile(idx, playerId, cells, cols, rows)) set.add(idx);
  }
  _sets.set(playerId, set);
}

/**
 * Оновити border sets після захоплення тайлу.
 * Викликається в tickAttacks для кожного захопленого тайлу.
 * O(1) амортизовано (≤ 5 гравців × 1 check кожен).
 *
 * ВАЖЛИВО: cells[idx] вже має НОВОГО власника коли функція викликається.
 */
export function onCellCaptured(
  idx: number,
  oldOwnerId: string | null,
  newOwnerId: string,
  cells: GameState['cells'],
  cols: number,
  rows: number,
): void {
  // 1. Видалити захоплений тайл зі старого власника (він більше не його)
  if (oldOwnerId !== null) {
    _sets.get(oldOwnerId)?.delete(idx);
  }

  // 2. Перевірити чи новий тайл є кордонним для нового власника
  const newSet = _sets.get(newOwnerId);
  if (newSet !== undefined) {
    if (isPlayerBorderTile(idx, newOwnerId, cells, cols, rows)) {
      newSet.add(idx);
    } else {
      newSet.delete(idx); // може стати внутрішнім якщо оточений своїми
    }
  }

  // 3. Перевірити 4 сусідів — їх статус кордону міг змінитись
  const x = idx % cols;
  const y = (idx / cols) | 0;
  const ns = [
    x > 0        ? idx - 1    : -1,
    x < cols - 1 ? idx + 1    : -1,
    y > 0        ? idx - cols : -1,
    y < rows - 1 ? idx + cols : -1,
  ] as const;
  for (const n of ns) {
    if (n < 0) continue;
    const nc = cells[n];
    if (!nc || nc.terrain !== 'land' || nc.ownerId === null) continue;
    const nOwner = nc.ownerId;
    const nSet = _sets.get(nOwner);
    if (nSet === undefined) continue;
    if (isPlayerBorderTile(n, nOwner, cells, cols, rows)) {
      nSet.add(n);
    } else {
      nSet.delete(n);
    }
  }
}

/** Очистити всі border sets (викликається при видаленні кімнати). */
export function clearBorderSetCache(): void {
  _sets.clear();
}

/** Inline перевірка без масивів. */
function isPlayerBorderTile(
  idx: number,
  ownerId: string,
  cells: GameState['cells'],
  cols: number,
  rows: number,
): boolean {
  const x = idx % cols;
  const y = (idx / cols) | 0;
  if (x === 0 || x === cols - 1 || y === 0 || y === rows - 1) return true;
  let nc = cells[idx - 1];
  if (!nc || nc.terrain === 'water' || (nc.terrain === 'land' && nc.ownerId !== ownerId)) return true;
  nc = cells[idx + 1];
  if (!nc || nc.terrain === 'water' || (nc.terrain === 'land' && nc.ownerId !== ownerId)) return true;
  nc = cells[idx - cols];
  if (!nc || nc.terrain === 'water' || (nc.terrain === 'land' && nc.ownerId !== ownerId)) return true;
  nc = cells[idx + cols];
  if (!nc || nc.terrain === 'water' || (nc.terrain === 'land' && nc.ownerId !== ownerId)) return true;
  return false;
}
