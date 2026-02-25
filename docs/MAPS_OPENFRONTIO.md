# Як влаштована карта (за OpenFrontIO)

Це короткий опис потоку карт у [OpenFrontIO](https://github.com/openfrontio/OpenFrontIO) і як ми робимо таку саму копію світу в open-war.

---

## 1. Що таке генератор і навіщо він

У OpenFrontIO є **map-generator** (Go): він перетворює **вхідні зображення** на **бінарні карти + thumbnail**, які гра вже використовує.

- **Вхід:** зображення карти (PNG) + опис націй (info.json).
- **Вихід:** `manifest.json`, `map.bin`, `map4x.bin`, `map16x.bin`, `thumbnail.webp` у папці карти.

Тобто генератор не малює карту «з нуля» — він **конвертує готове зображення** у формат, зручний для гри (терен по пікселях, зменшені копії для міні-карти, один байт на клітинку з типом та величиною).

---

## 2. Де що лежить у OpenFrontIO

| Що | Де |
|----|-----|
| **Вхід (сирці карти)** | `map-generator/assets/maps/<назва>/` |
| **Зображення** | `image.png` (суша/вода за **синім каналом**, див. README генератора) |
| **Метадані, нації** | `info.json` (name, nations з coordinates, flag) |
| **Вихід після генератора** | `resources/maps/<назва>/` |

Після `go run .` (або `go run . --maps=britannia`) у `../resources/maps/<назва>/` з’являються:

- **manifest.json** — розміри повної карти та масштабів (map, map4x, map16x), назва, nations тощо.
- **map.bin** — повномасштабна бінарна карта (1 байт на клітинку).
- **map4x.bin** — зменшена у 2 рази по кожній осі (для міні-карти / швидкого рендеру).
- **map16x.bin** — ще менший масштаб.
- **thumbnail.webp** — зображення карти для прев’ю/фону.

У генераторі треба зареєструвати карту в `main.go` у масиві `maps` (наприклад `{Name: "britannia"}`).

---

## 3. Формат бінарної карти (OpenFrontIO)

Один піксель = 1 байт:

- **Біт 7 (0x80):** тип — Land (1) / Water (0).
- Решта бітів — shoreline, ocean, magnitude (висота/відстань до суші). Для open-war поки що використовуємо лише тип клітинки: суша чи вода.

Тобто в коді: `(byte & 0x80) !== 0` → land, інакше → water.

---

## 4. Як це повторюємо в open-war (та сама копія світу)

Ми використовуємо **той самий вихід генератора**, тільки кладемо його у нашу папку і підтримуємо обидва варіанти іменування.

### Куди класти згенеровані файли

У open-war карта світу береться з:

- **`public/maps/world/`**

Потрібно покласти туди:

- **manifest.json**
- **thumbnail.webp** — ним клієнт малює фон карти (як «фото» карти).
- Один із бінарних файлів (ми зараз використовуємо зменшену сітку, щоб не виснути):
  - **mini_map.bin** — якщо твій генератор виводить саме його (і в manifest є `mini_map: { width, height }`), або
  - **map4x.bin** — якщо використовуєш офіційний OpenFrontIO generator (у manifest буде `map4x: { width, height }`).

Сервер підхоплює terrain у такому порядку:

1. Якщо є **manifest.json** і **mini_map.bin** з полем `mini_map` у manifest — береться воно.
2. Інакше, якщо є **manifest.json** і **map4x.bin** з полем `map4x` — береться воно (формат OpenFrontIO).
3. Інакше — fallback на **terrain.json** з `src/maps/world/terrain.json`.

Розмір сітки гри (MAP.COLS × MAP.ROWS) зараз **1000×500**. Щоб усе збігалося з thumbnail і не було розмитості, бажано щоб **mini_map** або **map4x** у manifest мали саме **1000×500** (наприклад, повна карта 2000×1000 → map4x 1000×500). Якщо твоя карта іншого розміру (наприклад Britannia 500×250 у map4x), можна буде потім додати динамічні cols/rows з manifest.

### Короткий workflow «та сама копія світу»

1. **Вхід (як у OpenFrontIO):**  
   - У себе (або в клоні OpenFrontIO) маєш, наприклад, `MapGenerator/assets/maps/britannia/image.png` та `info.json`.

2. **Генерація:**  
   - Запускаєш генератор OpenFrontIO: з папки `map-generator` виконуєш  
     `go run . --maps=britannia`  
   - Вихід з’явиться в `../resources/maps/britannia/`.

3. **Копіювання в open-war:**  
   - Копіюєш з `resources/maps/britannia/` у **`open-war/public/maps/world/`**:
     - `manifest.json`
     - `thumbnail.webp`
     - або `mini_map.bin`, або `map4x.bin` (ми підтримуємо обидва, див. вище).

4. **Відповідність сітки:**  
   - Зараз гра очікує сітку **1000×500**. Якщо твоя map4x/mini_map має інші розміри, або змінюєш MAP в коді під цю карту, або потрібно буде додати підтримку розміру з manifest (динамічні cols/rows).

Після цього сервер бере terrain з бінарника, клієнт показує **thumbnail.webp** як зображення карти — це і є «та сама копія світу» за форматом і даними OpenFrontIO.

---

## 5. Додатково

- **Колір води** у open-war заданий як **#417faf** (у клієнті).
- Як створити **image.png** і **info.json**, детально описано в [map-generator README](https://github.com/openfrontio/OpenFrontIO/blob/main/map-generator/README.md) та на [Openfront Wiki – Map Making](https://openfront.wiki/Map_Making).
