/**
 * Завантаження згенерованої карти з public/maps (як OpenFrontIO).
 * Бере manifest.json + mini_map.bin або map4x.bin і повертає терен для відмальовування.
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

  // 1. ПІСОК — суша з SHORELINE (завжди один колір)
  if (isShore(byte)) return [204, 203, 158];

  const isLand = (byte & IS_LAND_BIT) !== 0;

  if (!isLand) {
    // 2. ВОДА БІЛЯ БЕРЕГА — яскраво-блакитний
    if (isShorelineWater(byte)) return [100, 143, 255];
    // 3. ГЛИБОКА ВОДА — темнішає з відстанню від берега (magnitude)
    const w = { r: 70, g: 132, b: 180 };
    const d = 11 - Math.min(mag, 10);
    return [
      Math.max(0, w.r - 10 + d),
      Math.max(0, w.g - 10 + d),
      Math.max(0, w.b - 10 + d),
    ];
  }

  // СУША: magnitude 0–9 рівнина, 10–19 highland, 20+ гора
  if (mag < 10) {
    // 4. РІВНИНИ — зелені, трохи темнішають з magnitude
    return [190, Math.max(0, 220 - 2 * mag), 138];
  }
  if (mag < 20) {
    // 5. HIGHLAND — бежевий/коричнюватий, світлішає з висотою
    const m = mag - 10;
    return [
      Math.min(255, 200 + 2 * m),
      Math.min(255, 183 + 2 * m),
      Math.min(255, 138 + 2 * m),
    ];
  }
  // 6. ГОРИ — сірувато-білі
  const m = mag - 20;
  const v = Math.min(255, 230 + m / 2);
  return [v, v, v];
}

/**
 * Завантажує карту з basePath (наприклад /maps/world).
 * Спершу пробує mini_map.bin, потім map4x.bin.
 */
export async function loadMapDataFromPath(
  basePath: string = MAP_BASE,
): Promise<LoadedMapData | null> {
  try {
    const manifestRes = await fetch(`${basePath}/manifest.json`);
    if (!manifestRes.ok) return null;
    const manifest = (await manifestRes.json()) as MapManifest;

    let width: number;
    let height: number;
    let binUrl: string;

    if (manifest.mini_map?.width && manifest.mini_map?.height) {
      width = manifest.mini_map.width;
      height = manifest.mini_map.height;
      binUrl = `${basePath}/mini_map.bin`;
    } else if (manifest.map4x?.width && manifest.map4x?.height) {
      width = manifest.map4x.width;
      height = manifest.map4x.height;
      binUrl = `${basePath}/map4x.bin`;
    } else {
      return null;
    }

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
