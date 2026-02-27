import { useEffect, useRef, useState } from "react";
import type { GamePhase, GameState, CellDelta, BuildingType } from "../../shared/types";
import { GAME_PORT } from "../../shared/constants";
import { perfStats } from "../utils/perfStats";

const WS_URL =
  typeof location !== "undefined"
    ? `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.hostname === "localhost" ? "127.0.0.1" : location.hostname}:${GAME_PORT}`
    : `ws://127.0.0.1:${GAME_PORT}`;

/** Як часто оновлювати UI (Leaderboard) — лише лёгкий snapshot, без cells. */
const UI_REFRESH_EVERY_TICKS = 10;

export type GameUISnapshot = {
  players: GameState["players"];
  attacks: GameState["attacks"];
  tick: number;
  phase: GamePhase;
  lobbyEndsAt?: number;
};

export type SocketStats = { bytesIn: number; bytesOut: number };

// Реєстр TextEncoder: не створювати новий при кожному повідомленні
const _encoder = new TextEncoder();
function byteLength(s: string): number {
  return _encoder.encode(s).byteLength;
}

export function useGameSocket(
  playerId: string | null,
  nickname: string,
  roomId: string | undefined,
) {
  const stateRef = useRef<GameState | null>(null);
  const statsRef = useRef<SocketStats>({ bytesIn: 0, bytesOut: 0 });
  const [uiSnapshot, setUiSnapshot] = useState<GameUISnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const hasJoinedRef = useRef(false);

  const tryJoinGame = () => {
    const ws = wsRef.current;
    if (
      !ws ||
      ws.readyState !== WebSocket.OPEN ||
      !playerId ||
      !nickname.trim()
    )
      return;
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    const payload = JSON.stringify({
      type: "input",
      playerId,
      payload: { type: "join", name: nickname.trim() },
    });
    statsRef.current.bytesOut += byteLength(payload);
    ws.send(payload);
  };

  useEffect(() => {
    if (!roomId) return;
    statsRef.current = { bytesIn: 0, bytesOut: 0 };
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    hasJoinedRef.current = false;
    ws.onopen = () => {
      setConnected(true);
      const payload = JSON.stringify({ type: "join_room", roomId });
      statsRef.current.bytesOut += byteLength(payload);
      ws.send(payload);
      tryJoinGame();
    };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const raw = event.data as string;
      statsRef.current.bytesIn +=
        typeof raw === "string"
          ? byteLength(raw)
          : (raw as ArrayBuffer).byteLength;
      try {
        const msg = JSON.parse(raw) as {
          type: string;
          payload?: GameState;
          tick?: number;
          phase?: GamePhase;
          lobbyEndsAt?: number;
          delta?: CellDelta[];
          players?: GameState["players"];
          attacks?: GameState["attacks"];
          buildings?: GameState["buildings"];
        };
        if (msg.type === "state" && msg.payload) {
          stateRef.current = msg.payload;
          const snap: GameUISnapshot = {
            players: msg.payload.players,
            attacks: msg.payload.attacks,
            tick: msg.payload.tick,
            phase: msg.payload.phase,
          };
          if (msg.payload.lobbyEndsAt !== undefined) snap.lobbyEndsAt = msg.payload.lobbyEndsAt;
          setUiSnapshot(snap);
          return;
        }
        if (msg.type === "tick" && typeof msg.tick === "number") {
          const _wsT0 = performance.now();
          const curr = stateRef.current;
          if (!curr?.cells) return;
          const delta = msg.delta ?? [];
          for (const [i, ownerId] of delta) {
            if (curr.cells[i])
              curr.cells[i] = { ...curr.cells[i]!, ownerId: ownerId ?? null };
          }
          curr.players = msg.players ?? curr.players;
          curr.attacks = msg.attacks ?? curr.attacks;
          curr.buildings = msg.buildings ?? curr.buildings;
          curr.tick = msg.tick ?? curr.tick;
          if (msg.phase) curr.phase = msg.phase;
          if (msg.lobbyEndsAt !== undefined) curr.lobbyEndsAt = msg.lobbyEndsAt;
          // Акумулюємо індекси змінених тайлів — між двома кадрами може прийти кілька тіків,
          // тому конкатенуємо, а не перезаписуємо. TerritoryLayer очищає після рендеру.
          const incoming = delta.map(([idx]) => idx);
          curr.lastDeltaIndices = curr.lastDeltaIndices
            ? curr.lastDeltaIndices.concat(incoming)
            : incoming;
          perfStats.wsDeltaSize = delta.length;
          perfStats.wsProcessMs = performance.now() - _wsT0;
          if (curr.tick % UI_REFRESH_EVERY_TICKS === 0) {
            const snap: GameUISnapshot = {
              players: curr.players,
              attacks: curr.attacks,
              tick: curr.tick,
              phase: curr.phase,
            };
            if (curr.lobbyEndsAt !== undefined) snap.lobbyEndsAt = curr.lobbyEndsAt;
            setUiSnapshot(snap);
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
        if (
          s &&
          (s.readyState === WebSocket.OPEN ||
            s.readyState === WebSocket.CONNECTING)
        ) {
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
    const payload = JSON.stringify({
      type: "input",
      playerId,
      payload: { type: "spawn", tile },
    });
    statsRef.current.bytesOut += byteLength(payload);
    wsRef.current.send(payload);
  };

  const sendAttack = (targetId: string | null, troops?: number) => {
    if (!playerId || wsRef.current?.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({
      type: "input",
      playerId,
      payload: { type: "attack", targetId, troops },
    });
    statsRef.current.bytesOut += byteLength(payload);
    wsRef.current.send(payload);
  };

  const sendBuild = (tile: number, buildingType: BuildingType) => {
    if (!playerId || wsRef.current?.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({
      type: "input",
      playerId,
      payload: { type: "build", tile, buildingType },
    });
    statsRef.current.bytesOut += byteLength(payload);
    wsRef.current.send(payload);
  };

  const sendDemolish = (tile: number) => {
    if (!playerId || wsRef.current?.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({
      type: "input",
      playerId,
      payload: { type: "demolish", tile },
    });
    statsRef.current.bytesOut += byteLength(payload);
    wsRef.current.send(payload);
  };

  return { stateRef, statsRef, uiSnapshot, connected, sendSpawn, sendAttack, sendBuild, sendDemolish };
}
