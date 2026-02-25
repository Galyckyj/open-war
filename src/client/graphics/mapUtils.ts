/**
 * Утиліти для MapLayer: кольори клітин, border.
 */

import type { GameState } from "../../shared/types";
import { getNeighbors } from "../../shared/gameLogic";

const colorCache = new Map<string, string>();
function parseColor(s: string): string {
  const cached = colorCache.get(s);
  if (cached !== undefined) return cached;
  if (s.startsWith("#")) {
    colorCache.set(s, s);
    return s;
  }
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    colorCache.set(s, `rgb(${r},${g},${b})`);
    return colorCache.get(s)!;
  } catch {
    return "rgb(71, 85, 105)";
  }
}

/** Базовий колір терену (без гравця) — для відмальовування карти як у OpenFrontIO. */
export function getTerrainColor(cell: { terrain: string }): string {
  return cell.terrain === "water" ? "#417faf" : "#4a7c59";
}

export function getCellColor(
  cell: { terrain: string; ownerId: string | null },
  players: GameState["players"],
): string {
  if (cell.terrain === "water") return "#417faf";
  if (cell.ownerId)
    return parseColor(players[cell.ownerId]?.color ?? "#64748b");
  return "rgb(45, 63, 82)";
}

export function isBorderTile(
  index: number,
  ownerId: string | null,
  cells: GameState["cells"],
  cols: number,
  rows: number,
): boolean {
  return getNeighbors(index, cols, rows).some((n) => {
    const nc = cells[n];
    // Кордон тільки де сусід є суша з іншим власником
    return nc?.terrain === "land" && nc.ownerId !== ownerId;
  });
}

/** Темніший колір для кордону, як у OpenFrontIO (darken 12.5%). */
export function getBorderColor(territoryColor: string): string {
  const m = territoryColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return territoryColor;
  const factor = 0.875;
  const r = Math.round(Number(m[1]) * factor);
  const g = Math.round(Number(m[2]) * factor);
  const b = Math.round(Number(m[3]) * factor);
  return `rgb(${r},${g},${b})`;
}

/** Парсить rgb(r,g,b) або #rrggbb рядок у [r,g,b] tuple для ImageData. */
export function hexToRgb(color: string): [number, number, number] {
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }
  if (color.startsWith("#") && color.length === 7) {
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
  }
  if (color.startsWith("#") && color.length === 4) {
    const r = parseInt(color[1] + color[1], 16);
    const g = parseInt(color[2] + color[2], 16);
    const b = parseInt(color[3] + color[3], 16);
    return [r, g, b];
  }
  return [100, 100, 100];
}

/** Як hexToRgb, але спочатку нормалізує колір через parseColor (HSL → rgb). Для ImageData. */
export function colorToRgb(color: string): [number, number, number] {
  const rgb = parseColor(color);
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  if (rgb.startsWith("#")) {
    const n = parseInt(rgb.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return [71, 85, 105];
}
