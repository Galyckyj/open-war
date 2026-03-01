/**
 * Шар будівель — малює спрайти в world-space.
 * Кордон навколо будівлі — як в OpenFrontIO: BFS по клітинах з фарбуванням
 * territory-зони та border-кільця кольором власника.
 */

import type { Layer, RenderContext } from "../types";
import { BUILDING_CONSTRUCTION_TICKS } from "../../../shared/types";
import type { Building } from "../../../shared/types";
import { colorToRgb, getBorderColor } from "../mapUtils";

// Варіанти спрайтів для типу "farm" (factory) — один рандомно на гравця
const FARM_VARIANTS = [
  "/buildings/factory/factory1.png",
  "/buildings/factory/factory2.png",
  "/buildings/factory/factory3.png",
  "/buildings/factory/factory4.png",
];

// Базові спрайти для решти типів будівель
const BUILDING_IMAGE_SRC: Partial<Record<string, string>> = {
  port: "/buildings/port/port6.png",
  fortress: "/buildings/factoryRed.png",
  barracks: "/buildings/army.png",
};

/** Детермінований хеш рядка → число (djb2-lite). */
function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** Повертає індекс варіанту factory для конкретного гравця (0–3, стабільно). */
function farmVariantIdx(ownerId: string): number {
  return strHash(ownerId) % FARM_VARIANTS.length;
}

/** Розмір спрайту у клітинах карти. */
const SPRITE_CELLS = 10;

/** Радіуси навколо будівлі (у клітинах, евклідова = коло). */
const TERRITORY_R = 5.0; // зафарбована зона (напівпрозора)
const BORDER_R = 5.7; // кільце-контур (яскравіше)

/** Зміщення центру зони вниз (щоб відповідало позиції спрайту). */
const ZONE_OFFSET_ROW = 1;

export class BuildingLayer implements Layer {
  visible = true;

  /** Сирі зображення (до перемальовування). */
  private rawCache = new Map<string, HTMLImageElement | "loading" | null>();
  /** Перемальовані canvas (червоні пікселі → колір гравця). */
  private recolored = new Map<string, OffscreenCanvas | null>();

  /** Завантажує сире зображення і кешує його. */
  private loadRaw(src: string, rawKey: string): HTMLImageElement | null {
    const cached = this.rawCache.get(rawKey);
    if (cached === "loading") return null;
    if (cached !== undefined) return cached as HTMLImageElement | null;
    this.rawCache.set(rawKey, "loading");
    const img = new Image();
    img.onload = () => {
      this.rawCache.set(rawKey, img);
      this.recolored.delete(rawKey);
    };
    img.onerror = () => this.rawCache.set(rawKey, null);
    img.src = src;
    return null;
  }

  /**
   * Повертає перемальований canvas для будівлі:
   * пікселі з R>160, G<80, B<80 (червоні "template") замінюються кольором гравця.
   * Результат кешується за ключем "type:ownerId".
   */
  private getSprite(
    type: string,
    ownerId: string,
    playerRgb: [number, number, number],
  ): OffscreenCanvas | null {
    const cacheKey = type === "farm" ? `farm:${ownerId}` : type;

    if (this.recolored.has(cacheKey))
      return this.recolored.get(cacheKey) ?? null;

    const src =
      type === "farm"
        ? FARM_VARIANTS[farmVariantIdx(ownerId)]!
        : BUILDING_IMAGE_SRC[type];
    if (!src) {
      this.recolored.set(cacheKey, null);
      return null;
    }

    const raw = this.loadRaw(src, cacheKey);
    if (!raw) return null; // ще не завантажено

    // Малюємо на тимчасовий canvas і замінюємо червоні пікселі
    const tmp = new OffscreenCanvas(raw.naturalWidth, raw.naturalHeight);
    const tc = tmp.getContext("2d")!;
    tc.drawImage(raw, 0, 0);

    const idata = tc.getImageData(0, 0, tmp.width, tmp.height);
    const d = idata.data;
    const [pr, pg, pb] = playerRgb;

    for (let i = 0; i < d.length; i += 4) {
      const rr = d[i]!,
        rg = d[i + 1]!,
        rb = d[i + 2]!;
      // Виявляємо "червоний template": R домінує значно над G і B
      if (rr > 140 && rg < 90 && rb < 90) {
        // Зберігаємо яскравість оригінального пікселя для відтінків
        const brightness = rr / 255;
        d[i] = Math.round(pr * brightness);
        d[i + 1] = Math.round(pg * brightness);
        d[i + 2] = Math.round(pb * brightness);
      }
    }
    tc.putImageData(idata, 0, 0);
    this.recolored.set(cacheKey, tmp);
    return tmp;
  }

  render(ctx: RenderContext): void {
    const buildings = ctx.state.buildings;
    if (!buildings || buildings.length === 0) return;

    const { ctx: c, state, worldWidth, worldHeight, viewport } = ctx;
    const { cols, rows } = state;
    if (!cols || !rows) return;

    const cellW = worldWidth / cols;
    const cellH = worldHeight / rows;
    const spriteW = cellW * SPRITE_CELLS;
    const spriteH = cellH * SPRITE_CELLS;
    const halfW = spriteW / 2;
    const halfH = spriteH / 2;

    // Радіус ітерації: горизонталь = BORDER_R+1, вертикаль = (BORDER_R+1)/2
    const radX = Math.ceil(BORDER_R + 1);
    const radY = Math.ceil((BORDER_R + 1) / 2);

    for (const b of buildings) {
      const bCol = b.tileIndex % cols;
      const bRow = (b.tileIndex / cols) | 0;

      const cx = (bCol + 0.5) * cellW;
      const cy = (bRow + 0.5) * cellH;

      // Viewport culling (з урахуванням зони кордону)
      const guardW = halfW + BORDER_R * cellW;
      const guardH = halfH + BORDER_R * cellH;
      if (
        cx + guardW < viewport.x ||
        cx - guardW > viewport.x + viewport.width ||
        cy + guardH < viewport.y ||
        cy - guardH > viewport.y + viewport.height
      )
        continue;

      // ── Піксельний кордон (BFS-стиль OpenFrontIO) ────────────────────────
      const rawColor = state.players[b.ownerId]?.color ?? "#64748b";
      const [r, g, bC] = colorToRgb(rawColor);
      const borderRaw = getBorderColor(`rgb(${r},${g},${bC})`);
      const [br, bg, bb] = colorToRgb(borderRaw);
      const alpha = b.underConstruction ? 0.6 : 1;

      // Центр зони зміщений вниз відносно центру тайлу
      const zoneCenterRow = bRow + ZONE_OFFSET_ROW;

      for (let dr = -radY; dr <= radY; dr++) {
        for (let dc = -radX; dc <= radX; dc++) {
          const nc = bCol + dc;
          const nr = Math.round(zoneCenterRow) + dr;
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

          // Не фарбуємо водні клітини
          const tileIdx = nr * cols + nc;
          if (state.cells[tileIdx]?.terrain === "water") continue;

          // Ізометрична формула OpenFrontIO: dx + dy*2 <= distance+1
          const actualDr = nr - zoneCenterRow;
          const isoDist = Math.abs(dc) + Math.abs(actualDr) * 2;
          if (isoDist > BORDER_R + 1) continue;

          const px = nc * cellW;
          const py = nr * cellH;

          if (isoDist <= TERRITORY_R + 1) {
            // Зона territory — напівпрозора заливка
            c.fillStyle = `rgba(${r},${g},${bC},${(0.28 * alpha).toFixed(2)})`;
            c.fillRect(px, py, cellW, cellH);
          } else {
            // Border-кільце (пунктир через одну клітину)
            if ((nc + nr) % 2 === 0) {
              c.fillStyle = `rgba(${br},${bg},${bb},${(0.9 * alpha).toFixed(2)})`;
              c.fillRect(px, py, cellW, cellH);
            }
          }
        }
      }

      // ── Спрайт будівлі (з перемальованими червоними пікселями) ──────────
      const x = cx - halfW;
      const y = cy - halfH;
      const sprite = this.getSprite(b.type, b.ownerId, [r, g, bC]);

      c.save();
      c.globalAlpha = b.underConstruction ? 0.5 : 1;

      if (sprite) {
        c.drawImage(sprite, x, y, spriteW, spriteH);
      } else {
        c.fillStyle = `rgb(${r},${g},${bC})`;
        c.globalAlpha = (b.underConstruction ? 0.5 : 1) * 0.6;
        c.fillRect(x, y, spriteW, spriteH);
      }

      c.restore();

      // ── Прогрес-бар під спрайтом ─────────────────────────────────────────
      if (b.underConstruction) {
        const total = BUILDING_CONSTRUCTION_TICKS[b.type] ?? 50;
        const pct = Math.max(0, 1 - b.constructionTicksLeft / total);
        const barH = cellH * 0.5;
        const barY = cy + halfH + cellH * 0.15;

        c.save();
        c.fillStyle = "rgba(0,0,0,0.5)";
        c.fillRect(x, barY, spriteW, barH);
        c.fillStyle = "#34d399";
        c.fillRect(x, barY, spriteW * pct, barH);
        c.restore();
      }
    }
  }
}
