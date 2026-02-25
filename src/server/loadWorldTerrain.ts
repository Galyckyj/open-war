/**
 * Завантаження terrain: спочатку OpenFrontIO (map.bin + manifest.json), інакше terrain.json.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export type TerrainCell = 'land' | 'water';

const TERRAIN_JSON_PATH = join(ROOT, 'src/maps/world/terrain.json');
const OPENFRONT_DIR = join(ROOT, 'public/maps/world');

let cached: TerrainCell[] | null = null;

interface OpenFrontManifest {
  map?: { width: number; height: number };
  mini_map?: { width: number; height: number };
  map4x?: { width: number; height: number };
}

function parseTerrainBin(buf: Buffer, width: number, height: number): TerrainCell[] | null {
  if (buf.length !== width * height) return null;
  const out: TerrainCell[] = [];
  // OpenFrontIO: bit 7 = Land(1) / Water(0); простий формат: 0 = вода, інакше суша
  for (let i = 0; i < buf.length; i++) {
    out.push((buf[i] & 0x80) !== 0 ? 'land' : 'water');
  }
  return out;
}

/** Завантажити terrain з бінарника за manifest-метаданими. */
function loadFromBin(
  manifestPath: string,
  binPath: string,
  meta: { width: number; height: number } | undefined
): TerrainCell[] | null {
  if (!meta?.width || !meta?.height || !existsSync(manifestPath) || !existsSync(binPath)) return null;
  try {
    const buf = readFileSync(binPath);
    return parseTerrainBin(buf, meta.width, meta.height);
  } catch {
    return null;
  }
}

/** Спершу mini_map.bin (наш формат), потім map4x.bin (OpenFrontIO). */
function loadFromOpenFrontBins(): TerrainCell[] | null {
  const manifestPath = join(OPENFRONT_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  let manifest: OpenFrontManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as OpenFrontManifest;
  } catch {
    return null;
  }
  const miniPath = join(OPENFRONT_DIR, 'mini_map.bin');
  const map4xPath = join(OPENFRONT_DIR, 'map4x.bin');
  if (manifest.mini_map && existsSync(miniPath)) {
    return loadFromBin(manifestPath, miniPath, manifest.mini_map);
  }
  if (manifest.map4x && existsSync(map4xPath)) {
    return loadFromBin(manifestPath, map4xPath, manifest.map4x);
  }
  return null;
}

function loadFromTerrainJson(): TerrainCell[] | null {
  if (!existsSync(TERRAIN_JSON_PATH)) return null;
  try {
    const raw = readFileSync(TERRAIN_JSON_PATH, 'utf8');
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    const ok = arr.every((v) => v === 'land' || v === 'water');
    return ok ? (arr as TerrainCell[]) : null;
  } catch {
    return null;
  }
}

/** Спершу бінарні карти (mini_map.bin або map4x.bin), інакше terrain.json. */
export function loadWorldTerrain(): TerrainCell[] | null {
  if (cached !== null) return cached;
  cached = loadFromOpenFrontBins() ?? loadFromTerrainJson();
  return cached;
}
