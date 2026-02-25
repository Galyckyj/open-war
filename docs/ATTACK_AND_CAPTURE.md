# Атака та захоплення територій

## Як у OpenFrontIO

- **Архітектура:** клас `AttackExecution` на сервері (Worker), кожен тік (~100 мс) обробка → diff клієнту.
- **Черга:** власна міні-купа **FlatBinaryHeap** — два паралельні масиви (Float32Array пріоритетів + масив TileRef), без allocations/GC.
- **Пріоритет тайла:**
  ```ts
  priority = (random(10, 17)) * (1 - numOwnedByMe * 0.5 + mag / 2) + tick
  ```
  Менше сусідів-атакуючих → вищий пріоритет (розширення уперед). `mag`: Plains 1, Highland 1.5, Mountain 2.
- **Тайлів за тік:** залежить від ширини фронту (`numAdjacentTilesWithEnemy`) і співвідношення військ; проти гравця — формула з `(5*attackTroops)/defender.troops` та `* numAdjacent * 3`, проти нейтралу — `numAdjacent * 2`.
- **Втрати:** по терену (Plains/Highland/Mountain) — різні `speed` (cost) і опір; втрати захисника `troops / numTilesOwned`; debuff для гравців >100k тайлів.
- **Клієнт:** отримує packed tile updates → оновлює локальну карту; **TerritoryLayer** не перемальовує все одразу — тайли йдуть у **PriorityQueue** з jitter 0–0.5 тіку, за кадр малюється `queue.size/10` тайлів + сусіди, щоб візуально «розтікання» кольору.

---

## Як у open-war

### Архітектура

- Логіка на **shared** (сервер і клієнт можуть використовувати однакові модулі). Сервер кожен тік викликає `tickAttacks(state)` і надсилає повний/частковий state по WebSocket (не packed tile diff).
- Файли: `shared/game/attackExecution.ts`, `shared/game/combat.ts`, `shared/game/territory.ts`, `shared/utils/PriorityQueue.ts`.

### Черга

- **MinPriorityQueue** — звичайна міні-купа на масиві об’єктів `{ tile, priority }`. Низький пріоритет = витягується першим. Одна черга на кожну атаку (`attackQueues` по `attack.id`).

### Пріоритет тайла (`calcTilePriority`)

```ts
return (rng() * 7 + 10) * (1 - numOwnedByMe * 0.5 + mag / 2) + tick;
```

- Той самий ідейний формула: випадковість 10–17, менше сусідів-атакуючих = вища пріоритетність, `mag` з `getTerrainMag` (highland 1.5, mountain 2, інакше 1). Поведінка «розширення уперед» та сама.

### Скільки тайлів за тік

- **open-war:** `numTilesPerTick = max(1, ceil(speedFactor))`, де `speedFactor` залежить лише від співвідношення військ атакуючий/захисник (`getSpeedFactor`), без явної залежності від ширини фронту.
- Константи: `TROOP_COST_NEUTRAL`, `ATTACK_COST_MULTIPLIER`, `DEFENSE_COST_DIVISOR`, `SPEED_FACTOR_BASE`. Вартість одного тайла — `attackCost` (для гравця від `troops/score`), захисник втрачає `defenseCost` за захоплений тайл.

### Втрати

- Один тайл = однакова вартість для атакуючого (`attackCost`); захисник втрачає `defenseCost` за тайл. Терен не змінює cost за тайл у поточній реалізації (mag впливає лише на **пріоритет** у черзі, не на вартість).

### Потік до клієнта

- Сервер надсилає оновлений **state** (або delta). Клієнт отримує новий state і відмальовує **TerritoryLayer** по поточному state — без окремої черги оновлень тайлів і без «анімації» розтікання: зміни територій видно одразу після оновлення state.

---

## Порівняння

| Аспект | OpenFrontIO | open-war |
|--------|-------------|----------|
| Черга | FlatBinaryHeap (Float32 + refs), zero-allocation | MinPriorityQueue (об’єкти), одна черга на атаку |
| Формула пріоритету | (10–17) * (1 - numOwnedByMe*0.5 + mag/2) + tick | Та сама ідея |
| Тайлів за тік | Залежить від фронту + співвідношення військ | Тільки від speedFactor (війська), мін. 1 тайл |
| Втрати за терен | Різні cost/speed по Plains/Highland/Mountain | Один attackCost; mag лише для пріоритету |
| Debuff великих гравців | Так (>100k тайлів) | Ні |
| Клієнт: оновлення | Packed tile diff, PriorityQueue + jitter, queue/10 за кадр | Повний state, TerritoryLayer по state, без черги |

Щоб наблизити open-war до OpenFrontIO, можна: ввести залежність кількості тайлів за тік від ширини фронту, різні cost за типом терену, debuff за розміром території, на клієнті — packed diff і чергу оновлень у TerritoryLayer для плавного «розтікання».
