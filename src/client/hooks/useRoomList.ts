import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomInfo } from '../../shared/types';
import { GAME_PORT } from '../../shared/constants';

const WS_URL =
  typeof location !== 'undefined'
    ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.hostname === 'localhost' ? '127.0.0.1' : location.hostname}:${GAME_PORT}`
    : `ws://127.0.0.1:${GAME_PORT}`;

export function useRoomList() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const resolveRef = useRef<((roomId: string) => void) | null>(null);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    wsRef.current = socket;
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'list_rooms' }));
    };
    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'rooms') setRooms(msg.rooms ?? []);
        if (msg.type === 'room_created' && msg.roomId && resolveRef.current) {
          resolveRef.current(msg.roomId);
          resolveRef.current = null;
        }
      } catch {
        setError('Помилка зʼєднання');
      }
    };
    socket.onerror = () =>
      setError('Не вдалося підключитись до сервера. Запустіть: npm run dev');
    return () => {
      setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      }, 150);
    };
  }, []);

  const createRoom = useCallback((name?: string): Promise<string> | null => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return null;
    ws.send(JSON.stringify({ type: 'create_room', name: name?.trim() }));
    return new Promise<string>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  return { rooms, createRoom, error };
}
