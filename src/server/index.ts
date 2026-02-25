/**
 * Ігровий сервер з підтримкою кімнат.
 * Протокол WebSocket:
 *   list_rooms  → rooms: RoomInfo[]
 *   create_room → room_created + state
 *   join_room   → state
 *   input       → застосовується до поточної кімнати
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'node:http';
import { createInitialState, updateGameState } from '../shared/gameLogic';
import { GAME_PORT, TICK_MS } from '../shared/constants';
import { loadWorldTerrain } from './loadWorldTerrain';
import type { GameState, PlayerInput, RoomInfo, CellDelta } from '../shared/types';

const PORT = Number(process.env['GAME_PORT']) || 3001;

// ─── Кімнати ──────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  name: string;
  state: GameState;
  inputs: PlayerInput[];
  clients: Set<WebSocket>;
  createdAt: number;
  lastActivity: number;
}

const rooms = new Map<string, Room>();

/** Метадані на кожне з'єднання */
interface ClientMeta {
  roomId: string | null;
}
const clientMeta = new WeakMap<WebSocket, ClientMeta>();

function genId(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function createRoom(name?: string): Room {
  const id = genId();
  const room: Room = {
    id,
    name: name?.trim() || `Кімната ${id}`,
    state: createInitialState(loadWorldTerrain() ?? undefined),
    inputs: [],
    clients: new Set(),
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  rooms.set(id, room);
  return room;
}

function getRoomList(): RoomInfo[] {
  return Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    playerCount: Object.keys(r.state.players).length,
    createdAt: r.createdAt,
  }));
}

function broadcastRooms() {
  const payload = JSON.stringify({ type: 'rooms', rooms: getRoomList() });
  for (const ws of wss.clients) {
    const meta = clientMeta.get(ws as WebSocket);
    if (meta?.roomId === null && (ws as WebSocket).readyState === 1) {
      (ws as WebSocket).send(payload);
    }
  }
}

// ─── WebSocket сервер ──────────────────────────────────────────────────────────

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Open War game server\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  clientMeta.set(ws, { roomId: null });
  // Одразу надсилаємо поточний список кімнат
  ws.send(JSON.stringify({ type: 'rooms', rooms: getRoomList() }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      const meta = clientMeta.get(ws)!;

      // ── Список кімнат ─────────────────────────────────────────────────────
      if (msg.type === 'list_rooms') {
        ws.send(JSON.stringify({ type: 'rooms', rooms: getRoomList() }));
        return;
      }

      // ── Створити кімнату ──────────────────────────────────────────────────
      if (msg.type === 'create_room') {
        const room = createRoom(msg.name as string | undefined);
        meta.roomId = room.id;
        room.clients.add(ws);
        ws.send(JSON.stringify({ type: 'room_created', roomId: room.id, name: room.name }));
        ws.send(JSON.stringify({ type: 'state', payload: room.state }));
        broadcastRooms();
        return;
      }

      // ── Приєднатись до кімнати ────────────────────────────────────────────
      if (msg.type === 'join_room') {
        const roomId = String(msg.roomId ?? '');
        const room = rooms.get(roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Кімнату не знайдено' }));
          return;
        }
        meta.roomId = roomId;
        room.clients.add(ws);
        room.lastActivity = Date.now();
        ws.send(JSON.stringify({ type: 'state', payload: room.state }));
        return;
      }

      // ── Ігровий input ─────────────────────────────────────────────────────
      if (msg.type === 'input' && meta.roomId && msg.playerId) {
        const room = rooms.get(meta.roomId);
        if (!room) return;
        const payload = msg.payload as Record<string, unknown> | undefined;
        const inputType = (payload?.type as PlayerInput['type']) ?? 'spawn';
        room.inputs.push({
          type: inputType,
          playerId: String(msg.playerId),
          payload: payload as PlayerInput['payload'],
        });
        room.lastActivity = Date.now();
      }
    } catch {
      // ігноруємо некоректний JSON
    }
  });

  ws.on('close', () => {
    const meta = clientMeta.get(ws);
    if (meta?.roomId) {
      const room = rooms.get(meta.roomId);
      room?.clients.delete(ws);
    }
    setTimeout(broadcastRooms, 3000);
  });
});

/** Обчислює дельту власників клітин для економії трафіку */
function computeCellDelta(prevCells: GameState['cells'], nextCells: GameState['cells']): CellDelta[] {
  const delta: CellDelta[] = [];
  const len = Math.min(prevCells.length, nextCells.length);
  for (let i = 0; i < len; i++) {
    const a = prevCells[i]?.ownerId ?? null;
    const b = nextCells[i]?.ownerId ?? null;
    if (a !== b) delta.push([i, b]);
  }
  return delta;
}

// ─── Tick loop ─────────────────────────────────────────────────────────────────

function tick() {
  for (const room of rooms.values()) {
    const inputs = room.inputs.splice(0, room.inputs.length);
    const prevState = room.state;
    room.state = updateGameState(room.state, inputs);
    const delta = computeCellDelta(prevState.cells ?? [], room.state.cells ?? []);

    const tickPayload = JSON.stringify({
      type: 'tick',
      tick: room.state.tick,
      delta,
      players: room.state.players,
      attacks: room.state.attacks ?? [],
    });
    for (const ws of room.clients) {
      if (ws.readyState === 1) ws.send(tickPayload);
    }
  }
}

// ─── Прибирання порожніх кімнат ───────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  let deleted = false;
  for (const [id, room] of rooms) {
    const hasClients = room.clients.size > 0;
    if (!hasClients && now - room.lastActivity > 10 * 60 * 1000) {
      rooms.delete(id);
      deleted = true;
    }
  }
  if (deleted) broadcastRooms();
}, 60_000);

setInterval(tick, TICK_MS);

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Game server ws://127.0.0.1:${PORT} (tick ${TICK_MS}ms)`);
});
