# Структура проєкту Open War

.io-гра на Vite: **client** (React + Pixi.js) + **server** (Node + WebSocket) + **shared** (логіка гри).

## Папки

| Папка | Призначення |
|-------|-------------|
| **`client/`** | Vite + React + Pixi.js: тільки рендер стану + відправка input |
| **`shared/`** | Спільні типи, константи, **game logic** (updateGameState) — однаково на клієнті й сервері |
| **`server/`** | Node.js + `ws`: tick loop (20/sec), broadcast стану, прийом input |
| **`core/`** | Реекспорт з `shared` (для сумісності) |

## Ігровий цикл

- **Сервер:** кожні 50 ms: `updateGameState(state, inputs)` → broadcast стану всім клієнтам.
- **Клієнт:** тільки відправляє input (move/attack/spawn) і рендерить отриманий стан через Pixi.js.

## Запуск

```bash
npm install
npm run dev          # тільки клієнт (Vite)
npm run dev:server   # тільки ігровий сервер (ws://localhost:3001)
npm run dev:all      # клієнт + сервер одночасно
```

## Аліаси

`@/shared/*`, `@/client/*`, `@/server/*` → `src/shared`, `src/client`, `src/server`.
