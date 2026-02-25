/**
 * Загальні математичні утиліти для гри.
 */

export function getNeighbors(index: number, cols: number, rows: number): number[] {
  const x = index % cols;
  const y = Math.floor(index / cols);
  const out: number[] = [];
  if (x > 0) out.push(y * cols + (x - 1));
  if (x < cols - 1) out.push(y * cols + (x + 1));
  if (y > 0) out.push((y - 1) * cols + x);
  if (y < rows - 1) out.push((y + 1) * cols + x);
  return out;
}

/** Псевдо-random для детермінованості (SplitMix32) */
export function seededNext(seed: number): { value: number; seed: number } {
  let s = (seed + 0x9e3779b9) | 0;
  let t = s ^ (s >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);
  return { value: ((t ^ (t >>> 15)) >>> 0) / 4294967296, seed: s };
}
