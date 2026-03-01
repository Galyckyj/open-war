import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomInfo } from '../../shared/types';
import { GAME_PORT } from '../../shared/constants';

// Підключаємось через той самий хост/порт що й сторінка (Vite проксіює /ws → :3001).
// Це дозволяє підключитись з телефону у локальній мережі без відкриття другого порту.
const WS_URL =
  typeof location !== 'undefined'
    ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`
    : `ws://127.0.0.1:${GAME_PORT}/ws`;

const POLL_INTERVAL = 4000;    // оновлення списку кімнат кожні 4с
const RECONNECT_DELAY = 1000;  // пауза перед перепідключенням

export function useRoomList() {
  const [rooms,     setRooms]     = useState<RoomInfo[]>([]);
  const [error,     setError]     = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef        = useRef<WebSocket | null>(null);
  const resolveRef   = useRef<((roomId: string) => void) | null>(null);
  const rejectRef    = useRef<((reason: string) => void) | null>(null);
  const pollTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyed    = useRef(false);

  const requestRooms = (ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'list_rooms' }));
    }
  };

  const connect = useCallback(() => {
    if (destroyed.current) return;

    const socket = new WebSocket(WS_URL);
    wsRef.current = socket;

    socket.onopen = () => {
      if (destroyed.current) { socket.close(); return; }
      setConnected(true);
      setError(null);
      requestRooms(socket);

      // Регулярно оновлюємо список кімнат
      pollTimer.current = setInterval(() => requestRooms(socket), POLL_INTERVAL);
    };

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'rooms') {
          setRooms(msg.rooms ?? []);
        }
        if (msg.type === 'room_created' && msg.roomId) {
          resolveRef.current?.(msg.roomId);
          resolveRef.current = null;
          rejectRef.current  = null;
        }
      } catch {
        // ігноруємо некоректні повідомлення
      }
    };

    socket.onerror = () => {
      setError('Не вдалося підключитись до сервера');
      rejectRef.current?.('connection error');
      resolveRef.current = null;
      rejectRef.current  = null;
    };

    socket.onclose = () => {
      setConnected(false);
      if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }

      // Якщо чекали на створення кімнати — відхиляємо
      rejectRef.current?.('connection closed');
      resolveRef.current = null;
      rejectRef.current  = null;

      // Автоперепідключення
      if (!destroyed.current) {
        reconnTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    destroyed.current = false;
    connect();
    return () => {
      destroyed.current = true;
      if (pollTimer.current)   clearInterval(pollTimer.current);
      if (reconnTimer.current) clearTimeout(reconnTimer.current);
      const ws = wsRef.current;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [connect]);

  // Чекаємо поки WS відкриється (макс 3с), потім надсилаємо
  const waitForOpen = (timeout = 3000): Promise<WebSocket> =>
    new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) { resolve(ws); return; }

      // Якщо сокет мертвий — відразу перепідключаємось
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        connect();
      }

      const deadline = Date.now() + timeout;
      const check = () => {
        const w = wsRef.current;
        if (w?.readyState === WebSocket.OPEN) { resolve(w); return; }
        if (Date.now() >= deadline) { reject(new Error('Сервер недоступний. Перевірте мережу.')); return; }
        setTimeout(check, 100);
      };
      setTimeout(check, 100);
    });

  const createRoom = useCallback(async (name?: string): Promise<string> => {
    const ws = await waitForOpen();
    ws.send(JSON.stringify({ type: 'create_room', name: name?.trim() }));

    return new Promise<string>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current  = reject;
      setTimeout(() => {
        if (resolveRef.current === resolve) {
          resolveRef.current = null;
          rejectRef.current  = null;
          reject(new Error('Сервер не відповів. Спробуйте ще раз.'));
        }
      }, 8000);
    });
  }, [connect]);

  return { rooms, createRoom, error, connected };
}
