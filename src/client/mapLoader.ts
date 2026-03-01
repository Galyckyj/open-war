/**
 * Завантаження згенерованої карти з public/maps (як OpenFrontIO).
 * Бере manifest.json + map4x.bin (або mini_map.bin) і повертає терен для відмальовування.
 */

const MAP_BASE = '/maps/world';

export interface MapManifest {
  map?: { width: number; height: number };
  mini_map?: { width: number; height: number };
  map4x?: { width: number; height: number };
}

export interface LoadedMapData {
  terrain: Uint8Array;
  width: number;
  height: number;
}

/** Структура даних — 1 байт на тайл (як OpenFrontIO / MapGenerator). */
export const IS_LAND_BIT = 0x80;     // біт 7 — суша / вода
export const SHORELINE_BIT = 0x40;   // біт 6 — сусід з водою (суша) або з сушею (вода)
export const OCEAN_BIT = 0x20;       // біт 5 — океан (не озеро)
export const MAGNITUDE_MASK = 0x1f;   // біти 0–4 — висота (суша) або відстань від берега (вода)

export function isLandFromPackedByte(byte: number): boolean {
  return (byte & IS_LAND_BIT) !== 0;
}

/** isShore = суша з прапором SHORELINE (пісок біля води). */
function isShore(byte: number): boolean {
  return (byte & IS_LAND_BIT) !== 0 && (byte & SHORELINE_BIT) !== 0;
}

/** Водяний тайл поруч із сушею (блакитний берег). */
function isShorelineWater(byte: number): boolean {
  return (byte & IS_LAND_BIT) === 0 && (byte & SHORELINE_BIT) !== 0;
}

/**
 * Колір терену з одного байта — логіка як у PastelTheme.terrainColor():
 * пісок (shore), блакитний берег (shoreline water), глибина води, рівнини/горби/гори по magnitude.
 */
export function getTerrainColorFromPackedByte(byte: number): [number, number, number] {
  const mag = byte & MAGNITUDE_MASK;

  // 1. ПІСОК — золотисто-бежевий
  if (isShore(byte)) return [212, 196, 142];

  const isLand = (byte & IS_LAND_BIT) !== 0;

  if (!isLand) {
    // 2. ВОДА БІЛЯ БЕРЕГА — бірюзово-блакитна
    if (isShorelineWater(byte)) return [72, 158, 220];
    // 3. ГЛИБОКА ВОДА — темна сине-індиго, темнішає з відстанню
    const w = { r: 48, g: 105, b: 162 };
    const d = 11 - Math.min(mag, 10);
    return [
      Math.max(0, w.r - 8 + d),
      Math.max(0, w.g - 8 + d),
      Math.max(0, w.b - 8 + d),
    ];
  }

  // СУША: magnitude 0–9 рівнина, 10–19 highland, 20+ гора
  if (mag < 10) {
    // 4. РІВНИНИ — тепло-оливкові, темнішають з висотою
    return [162, Math.max(0, 200 - 2 * mag), 108];
  }
  if (mag < 20) {
    // 5. HIGHLAND — теплі коричнево-охристі
    const m = mag - 10;
    return [
      Math.min(255, 192 + 2 * m),
      Math.min(255, 168 + 2 * m),
      Math.min(255, 118 + 2 * m),
    ];
  }
  // 6. ГОРИ — холодно-сірі з легким синюватим відтінком
  const m = mag - 20;
  const v = Math.min(255, 224 + m / 2);
  return [Math.max(0, v - 10), Math.max(0, v - 6), v];
}

/**
 * Завантажує карту з basePath (наприклад /maps/world).
 * Пріоритет: map4x.bin (1000×500), потім mini_map.bin якщо є.
 */
export async function loadMapDataFromPath(
  basePath: string = MAP_BASE,
): Promise<LoadedMapData | null> {
  try {
    const manifestRes = await fetch(`${basePath}/manifest.json`);
    if (!manifestRes.ok) return null;
    const manifest = (await manifestRes.json()) as MapManifest;

    // Спершу map4x.bin (основна карта), інакше mini_map.bin
    let width: number | undefined;
    let height: number | undefined;
    let binUrl: string | undefined;

    if (manifest.map4x?.width && manifest.map4x?.height) {
      width = manifest.map4x.width;
      height = manifest.map4x.height;
      binUrl = `${basePath}/map4x.bin`;
    } else if (manifest.mini_map?.width && manifest.mini_map?.height) {
      width = manifest.mini_map.width;
      height = manifest.mini_map.height;
      binUrl = `${basePath}/mini_map.bin`;
    }

    if (width === undefined || height === undefined || !binUrl) return null;

    const binRes = await fetch(binUrl);
    if (!binRes.ok) return null;
    const buf = await binRes.arrayBuffer();
    const terrain = new Uint8Array(buf);
    if (terrain.length !== width * height) return null;

    return { terrain, width, height };
  } catch {
    return null;
  }
}
