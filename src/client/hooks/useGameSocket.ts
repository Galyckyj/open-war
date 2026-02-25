import { useEffect, useRef, useState } from 'react';
import type { GameState, CellDelta } from '../../shared/types';
import { GAME_PORT } from '../../shared/constants';

const WS_URL =
  typeof location !== 'undefined'
    ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.hostname === 'localhost' ? '127.0.0.1' : location.hostname}:${GAME_PORT}`
    : `ws://127.0.0.1:${GAME_PORT}`;

const TICK_THROTTLE = 3;

export function useGameSocket(
  playerId: string | null,
  nickname: string,
  roomId: string | undefined,
) {
  const [state, setState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const hasJoinedRef = useRef(false);
  const setStateFnRef = useRef(setState);
  setStateFnRef.current = setState;

  const tryJoinGame = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !playerId || !nickname.trim()) return;
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    ws.send(JSON.stringify({ type: 'input', playerId, payload: { type: 'join', name: nickname.trim() } }));
  };

  useEffect(() => {
    if (!roomId) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    hasJoinedRef.current = false;
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join_room', roomId }));
      tryJoinGame();
    };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          payload?: GameState;
          tick?: number;
          delta?: CellDelta[];
          players?: GameState['players'];
          attacks?: GameState['attacks'];
        };
        if (msg.type === 'state' && msg.payload) {
          stateRef.current = msg.payload;
          setStateFnRef.current(msg.payload);
          return;
        }
        if (msg.type === 'tick' && typeof msg.tick === 'number') {
          const prev = stateRef.current;
          if (!prev?.cells) return;
          const nextCells = prev.cells.slice();
          const delta = msg.delta ?? [];
          for (const [i, ownerId] of delta) {
            if (nextCells[i]) nextCells[i] = { ...nextCells[i]!, ownerId: ownerId ?? null };
          }
          const next = {
            ...prev,
            cells: nextCells,
            players: msg.players ?? prev.players,
            attacks: msg.attacks ?? prev.attacks,
            tick: msg.tick ?? prev.tick,
            lastDeltaIndices: delta.map(([idx]) => idx),
          };
          stateRef.current = next;
          if (next.tick % TICK_THROTTLE === 0) {
            setStateFnRef.current(next);
          }
        }
      } catch {
        /* ignore */
      }
    };
    return () => {
      const s = wsRef.current;
      wsRef.current = null;
      setTimeout(() => {
        if (s && (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING)) {
          s.close();
        }
      }, 150);
    };
  }, [roomId]);

  useEffect(() => {
    tryJoinGame();
  }, [playerId, nickname, connected]);

  const sendSpawn = (tile: number) => {
    if (!playerId || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'input', playerId, payload: { type: 'spawn', tile } }));
  };

  const sendAttack = (targetId: string | null, troops?: number) => {
    if (!playerId || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'input', playerId, payload: { type: 'attack', targetId, troops } }));
  };

  return { state, stateRef, connected, sendSpawn, sendAttack };
}
