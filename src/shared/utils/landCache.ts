/**
 * Кеш індексів тайлів суші (terrain='land').
 * Terrain ніколи не змінюється після завантаження карти, тому кеш валідний протягом усієї гри.
 * Дозволяє замінити O(500k) сканування всіх клітинок на O(158k) сканування лише суші.
 */

import type { GameState } from '../types';

let _cache: Uint32Array | null = null;
let _cacheLen = 0;

export function getLandTileIndices(cells: GameState['cells']): Uint32Array {
  if (_cache !== null && _cacheLen === cells.length) return _cache;
  const buf: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.terrain === 'land') buf.push(i);
  }
  _cache = new Uint32Array(buf);
  _cacheLen = cells.length;
  return _cache;
}
