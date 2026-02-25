# Кольори захоплених територій

## Як у OpenFrontIO

1. **Призначення кольору** — пули: humanColors (63+), botColors (~48), nationColors (~48), fallbackColors (200+). Кольори команд — LCH, 64 варіації на команду (red/blue/teal…).
2. **PlayerView** зберігає: territoryColor (alpha 150), borderColor (darken 12.5%), borderColorFriendly (зелений tint 35%), borderColorEmbargo (червоний tint 35%), borderColorNeutral, варіанти для defended (checkerboard).
3. **TerritoryLayer.paintTerritory()**: fallout → зелений; без власника → прозоро; з власником не кордон → territoryColor alpha 150; кордон → borderColor(tile, isDefended) alpha 255, tint за сусідом (ворог/союзник/нейтрал). Захищений кордон — шаховим узором.
4. **Оновлення** — PriorityQueue, лише частина тайлів за кадр, putImageData тільки по viewport.
5. **Шар** — окремий canvas з alpha поверх TerrainLayer.

---

## У open-war зараз

- **Кольори:** один пул `PLAYER_COLORS` (32 HSL, золотий кут 137.508°), колір у `state.players[id].color`.
- **Терен:** територія — напівпрозора заливка (alpha ~0.59), кордон — затемнення 12.5% (factor 0.875), alpha 1.
- **Логіка:** тільки «є власник / кордон»; союзник/ворог/embargo/fallout/defended не реалізовані (немає в state).
- **Малювання:** один прохід по видимих клітинках, fillRect; обмеження по кількості клітинок і мін. розміру клітинки для FPS.

Щоб повторити OpenFrontIO повністю, потрібні: окремі пули (human/bot/nation), команди та LCH-варіації, alliance/embargo у state, fallout, defense post і черга оновлень у TerritoryLayer.
