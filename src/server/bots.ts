/**
 * Система ботів — server-only.
 * Боти живуть лише на сервері: отримують стан гри і генерують PlayerInput
 * які інʼєктуються в room.inputs перед кожним tickом.
 *
 * AI стратегія:
 *  - Лобі: рандомний спавн у 2–6 секунді
 *  - Гра:  кожні ~2 секунди атакують нейтральне або ворожу територію.
 *          Пріоритет: нейтральне → найслабший сусід.
 */

import { addPlayer } from "../shared/gameLogic";
import type { GameState, PlayerInput } from "../shared/types";
import { getBorderSetFor } from "../shared/utils/borderSetCache";
import { getLandTileIndices } from "../shared/utils/landCache";

// ─── Константи ────────────────────────────────────────────────────────────────

export const BOT_COUNT = 100;

/** Нейтральні кольори ботів — сірі відтінки, щоб не плутати з живими гравцями. */
const BOT_COLORS = [
  "hsl(220,10%,52%)",
  "hsl(200,12%,46%)",
  "hsl(240,8%,48%)",
  "hsl(210,10%,40%)",
  "hsl(230,9%,55%)",
  "hsl(215,11%,44%)",
  "hsl(205,9%,50%)",
  "hsl(225,8%,38%)",
  "hsl(235,10%,58%)",
  "hsl(195,13%,42%)",
];

/** Тіків між атаками одного бота (~3 сек при TICK_MS=50). */
const ATTACK_INTERVAL = 60;
/** Розкид між атаками ботів щоб не атакували синхронно. */
const ATTACK_STAGGER = 17;
/** Кількість спроб знайти вільний тайл для спавну. */
const SPAWN_ATTEMPTS = 30;

// ─── Типи ────────────────────────────────────────────────────────────────────

export interface BotInfo {
  id: string;
  name: string;
  color: string;
}

interface BotRuntime {
  id: string;
  /** Тік, після якого бот намагається заспавнитись у лобі. */
  lobbySpawnAtTick: number;
  spawnedInLobby: boolean;
  /** Кеш земельних тайлів для pickRandomLandTile. */
  landTileIndices: Uint32Array;
}

/** roomId → список рантайм-станів ботів */
const roomBots = new Map<string, BotRuntime[]>();

// ─── Ініціалізація ────────────────────────────────────────────────────────────

/** Повертає мета-інфо про ботів для кімнати (id + ім'я + нейтральний колір). */
export function makeBotInfos(roomId: string): BotInfo[] {
  return Array.from({ length: BOT_COUNT }, (_, i) => ({
    id: `bot_${roomId}_${i + 1}`,
    name: `Bot ${i + 1}`,
    color: BOT_COLORS[i % BOT_COLORS.length]!,
  }));
}

/**
 * Додає ботів до стану гри (addPlayer) і ініціалізує їх рунтайм.
 * Викликається один раз при createRoom.
 */
export function initBots(
  roomId: string,
  botInfos: BotInfo[],
  state: GameState,
): GameState {
  // Кешуємо індекси земельних тайлів — terrain не змінюється
  const landList: number[] = [];
  for (let i = 0; i < state.cells.length; i++) {
    if (state.cells[i]?.terrain === "land") landList.push(i);
  }
  const landTileIndices = new Uint32Array(landList);

  const runtimes: BotRuntime[] = botInfos.map((b, i) => ({
    id: b.id,
    // Рівномірний розкид по всьому лобі (2с–9с), щоб 30 ботів не спавнились одночасно
    lobbySpawnAtTick: 40 + Math.floor(i * (140 / Math.max(BOT_COUNT - 1, 1))),
    spawnedInLobby: false,
    landTileIndices,
  }));
  roomBots.set(roomId, runtimes);

  // Реєструємо ботів як гравців з нейтральним кольором
  let next = state;
  for (const b of botInfos) {
    next = addPlayer(next, b.id, b.name, b.color);
  }
  return next;
}

/** Прибирає рунтайм ботів при видаленні кімнати. */
export function cleanupBots(roomId: string): void {
  roomBots.delete(roomId);
}

// ─── Tick ────────────────────────────────────────────────────────────────────

/**
 * Генерує PlayerInput для всіх ботів кімнати на поточний тік.
 * Викликається ПЕРЕД updateGameState і інʼєктується в room.inputs.
 */
export function tickBots(roomId: string, state: GameState): PlayerInput[] {
  const bots = roomBots.get(roomId);
  if (!bots || bots.length === 0) return [];

  const inputs: PlayerInput[] = [];
  const tick = state.tick;

  for (let bi = 0; bi < bots.length; bi++) {
    const bot = bots[bi]!;
    const player = state.players[bot.id];
    if (!player) continue;

    if (state.phase === "lobby") {
      if (!bot.spawnedInLobby && tick >= bot.lobbySpawnAtTick) {
        const tile = pickRandomLandTile(bot.landTileIndices, state.cells);
        if (tile !== null) {
          inputs.push({ type: "spawn", playerId: bot.id, payload: { tile } });
          bot.spawnedInLobby = true;
        }
      }
      continue;
    }

    if (state.phase !== "playing") continue;

    // Бот без території або без військ — пропускаємо
    const score = player.score ?? 0;
    if (score === 0 || player.troops < 10) continue;

    // Атакуємо кожні ATTACK_INTERVAL тіків, з розкидом між ботами
    if ((tick + bi * ATTACK_STAGGER) % ATTACK_INTERVAL !== 0) continue;

    const targetId = findBestTarget(bot.id, state);
    if (targetId === undefined) continue;

    inputs.push({
      type: "attack",
      playerId: bot.id,
      payload: {
        targetId,
        // 50% військ: агресивно але залишає резерв
        troops: Math.floor(player.troops * 0.5),
      },
    });
  }

  return inputs;
}

// ─── Допоміжні ────────────────────────────────────────────────────────────────

/** Рандомний вільний земельний тайл для спавну. */
function pickRandomLandTile(
  landTiles: Uint32Array,
  cells: GameState["cells"],
): number | null {
  const len = landTiles.length;
  if (len === 0) return null;
  const start = Math.floor(Math.random() * len);
  for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
    const idx = landTiles[(start + i) % len]!;
    if (cells[idx]?.ownerId === null) return idx;
  }
  return null;
}

/**
 * Знаходить найкращу ціль для атаки.
 *
 * ОПТИМІЗАЦІЯ (як OpenFrontIO player.borderTiles()):
 *   Використовує live border set O(border_size ≈ 50-200) замість сканування
 *   всіх 158k земельних тайлів. 790x прискорення для типового бота.
 *
 * Повертає:
 *   null      — є нейтральна земля поруч (атакуємо нейтрала)
 *   string    — id найслабшого ворога що межує
 *   undefined — немає сусідів взагалі (не атакуємо)
 */
function findBestTarget(
  botId: string,
  state: GameState,
): string | null | undefined {
  const { cells, cols, rows, players } = state;
  const enemyIds = new Map<string, number>();

  const borderSet = getBorderSetFor(botId);

  if (borderSet.size > 0) {
    // Швидкий шлях: live border set доступний
    for (const i of borderSet) {
      const x = i % cols;
      const y = (i / cols) | 0;
      const n0 = x > 0 ? i - 1 : -1;
      const n1 = x < cols - 1 ? i + 1 : -1;
      const n2 = y > 0 ? i - cols : -1;
      const n3 = y < rows - 1 ? i + cols : -1;
      for (let ni = 0; ni < 4; ni++) {
        const n = ni === 0 ? n0 : ni === 1 ? n1 : ni === 2 ? n2 : n3;
        if (n < 0) continue;
        const nc = cells[n];
        if (!nc || nc.terrain !== "land") continue;
        if (nc.ownerId === null) return null; // нейтральна → найвищий пріоритет
        if (nc.ownerId !== botId) {
          enemyIds.set(nc.ownerId, (enemyIds.get(nc.ownerId) ?? 0) + 1);
        }
      }
    }
  } else {
    // Fallback: border set ще не ініціалізований (перший тік після спавну)
    const landTileIndices = getLandTileIndices(cells);
    for (let li = 0; li < landTileIndices.length; li++) {
      const i = landTileIndices[li]!;
      if (cells[i]?.ownerId !== botId) continue;
      const x = i % cols;
      const y = (i / cols) | 0;
      const n0 = x > 0 ? i - 1 : -1;
      const n1 = x < cols - 1 ? i + 1 : -1;
      const n2 = y > 0 ? i - cols : -1;
      const n3 = y < rows - 1 ? i + cols : -1;
      for (let ni = 0; ni < 4; ni++) {
        const n = ni === 0 ? n0 : ni === 1 ? n1 : ni === 2 ? n2 : n3;
        if (n < 0) continue;
        const nc = cells[n];
        if (!nc || nc.terrain !== "land") continue;
        if (nc.ownerId === null) return null;
        if (nc.ownerId !== botId) {
          enemyIds.set(nc.ownerId, (enemyIds.get(nc.ownerId) ?? 0) + 1);
        }
      }
    }
  }

  if (enemyIds.size === 0) return undefined;

  let bestId: string | null = null;
  let bestScore = Infinity;
  for (const [id] of enemyIds) {
    const s = players[id]?.score ?? 0;
    if (s < bestScore) {
      bestScore = s;
      bestId = id;
    }
  }
  return bestId ?? undefined;
}

/** Перевіряє чи playerId є ботом (для UI маркування). */
export function isBotId(playerId: string): boolean {
  return playerId.startsWith("bot_");
}
