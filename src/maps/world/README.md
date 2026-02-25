# Карта світу (World map)

Як у [OpenFrontIO](https://github.com/openfrontio/OpenFrontIO): terrain береться з згенерованих файлів (бінарна карта + manifest) або з terrain.json.

## Рекомендований спосіб (як у OpenFrontIO)

1. Май у себе **map-generator** OpenFrontIO: вхід у `assets/maps/<назва>/image.png` та `info.json`.
2. Запусти генератор: `go run . --maps=<назва>` (з папки map-generator). Вихід у `../resources/maps/<назва>/`.
3. Скопіюй у **open-war** у папку **public/maps/world/**:
   - **manifest.json**
   - **thumbnail.webp**
   - **map4x.bin** або **mini_map.bin**
4. Гра підхопить terrain з бінарника, клієнт покаже thumbnail як фон карти.

Детально: **[docs/MAPS_OPENFRONTIO.md](../../docs/MAPS_OPENFRONTIO.md)** — як влаштована карта в OpenFrontIO і як зробити таку саму копію світу.

## Fallback: terrain.json

Якщо в `public/maps/world/` немає manifest + бінарника, сервер використовує **terrain.json** з цієї папки. Його можна згенерувати скриптом (якщо є `npm run generate-map`) з image.png.
