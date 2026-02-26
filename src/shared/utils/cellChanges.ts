/**
 * Спільний буфер змін клітинок за тік.
 * Заповнюється tickAttacks і spawnPlayer, читається сервером для побудови delta.
 * Замінює O(500k) computeCellDelta на O(змінені_клітинки).
 */

export type CellChange = [number, string | null]; // [cellIndex, newOwnerId]

/** Зміни за поточний тік. Очищується на початку tickAttacks. */
export const tickChangedCells: CellChange[] = [];
