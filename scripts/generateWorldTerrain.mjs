/**
 * Генерує terrain.json з картки світу (image.png).
 * Як у OpenFrontIO: один тайл = land/water з семплу зображення.
 *
 * Запуск: node scripts/generateWorldTerrain.mjs
 * Потрібно: npm i -D sharp (або вже встановлено).
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COLS = 640;
const ROWS = 400;

const IMAGE_PATHS = [
  join(ROOT, 'public/maps/world/image.png'),
  join(ROOT, 'src/maps/world/image.png'),
];
const OUTPUT_PATH = join(ROOT, 'src/maps/world/terrain.json');

function isWater(r, g, b) {
  const blue = b;
  const others = (r + g) / 2;
  return blue > others && blue > 80;
}

async function main() {
  const IMAGE_PATH = IMAGE_PATHS.find((p) => existsSync(p));
  if (!IMAGE_PATH) {
    console.error('Зображення не знайдено. Додай image.png у public/maps/world/ або src/maps/world/');
    process.exit(1);
  }

  const img = sharp(IMAGE_PATH);
  const meta = await img.metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;

  const { data } = await img
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const terrain = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const px = Math.min(Math.floor((col / COLS) * w), w - 1);
      const py = Math.min(Math.floor((row / ROWS) * h), h - 1);
      const i = (py * w + px) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      terrain.push(isWater(r, g, b) ? 'water' : 'land');
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(terrain), 'utf8');
  console.log(`OK: ${terrain.filter((t) => t === 'land').length} land, ${terrain.filter((t) => t === 'water').length} water → ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
