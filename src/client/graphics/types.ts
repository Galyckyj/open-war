/**
 * Типи для кастомного 2D-рендеру (Canvas 2D API, за зразком OpenFrontIO).
 */

import type { GameState } from '../../shared/types';

/** Видима область світу в world-координатах (для culling). */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Контекст, який передається в кожен шар при рендері. */
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  state: GameState;
  viewport: Viewport;
  /** Масштаб світу (zoom). */
  scale: number;
  /** Смещення світу на екрані (пікселі). */
  worldOffsetX: number;
  worldOffsetY: number;
  playerId: string | null;
  /** Фонове зображення карти (наприклад карта світу), якщо завантажене. */
  backgroundImage?: HTMLImageElement | null;
  /** Розмір світу в пікселях — збігається з розміром карти (1:1), щоб сітка території накладалась. */
  worldWidth: number;
  worldHeight: number;
  /** Терен з згенерованої карти (public/maps), як у OpenFrontIO — для відмальовування базового шару. */
  terrainFromMap?: { data: Uint8Array; width: number; height: number } | null;
}

/** Базовий інтерфейс шару. */
export interface Layer {
  visible: boolean;
  render(ctx: RenderContext): void;
}
