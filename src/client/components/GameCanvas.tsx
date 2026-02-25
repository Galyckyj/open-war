/**
 * Canvas 2D карта з кастомним GameRenderer (шари + viewport culling), за зразком OpenFrontIO.
 */

import { useEffect, useRef } from "react";
import type { GameState } from "../../shared/types";
import { MAP } from "../../shared/constants";
import {
  GameRenderer,
  TerrainLayer,
  TerritoryLayer,
  UILayer,
} from "../graphics";
import { loadMapDataFromPath } from "../mapLoader";

const COLS = MAP.COLS;
const ROWS = MAP.ROWS;
const DEFAULT_WORLD_W = COLS;
const DEFAULT_WORLD_H = ROWS;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;
const ZOOM_SPEED = 0.0012;

function useLatestRef<T>(value: T) {
  const ref = useRef<T>(value);
  ref.current = value;
  return ref;
}

interface GameCanvasProps {
  state?: GameState | null;
  stateRef: React.RefObject<GameState | null>;
  playerId: string | null;
  selectedCell: number | null;
  onCellClick?: (index: number) => void;
}

export function GameCanvas({
  stateRef,
  playerId,
  selectedCell: _selectedCell,
  onCellClick,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCellClickRef = useLatestRef(onCellClick);
  const rendererRef = useRef<GameRenderer | null>(null);
  const viewRef = useRef({ worldX: 0, worldY: 0, scale: 1 });
  const worldSizeRef = useRef<{ w: number; h: number }>({
    w: DEFAULT_WORLD_W,
    h: DEFAULT_WORLD_H,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const W = el.clientWidth || window.innerWidth;
    const H = el.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.style.display = "block";
    el.appendChild(canvas);

    const renderer = new GameRenderer(canvas);
    renderer.setSize(W, H);
    renderer.setDevicePixelRatio(dpr);
    const fitView = (worldW: number, worldH: number) => {
      const initScale = Math.min(W / worldW, H / worldH);
      viewRef.current = {
        worldX: (W - worldW * initScale) / 2,
        worldY: (H - worldH * initScale) / 2,
        scale: initScale,
      };
      renderer.setView(
        viewRef.current.worldX,
        viewRef.current.worldY,
        viewRef.current.scale,
      );
    };
    renderer.setWorldSize(COLS, ROWS);
    fitView(DEFAULT_WORLD_W, DEFAULT_WORLD_H);
    renderer.setPlayerId(playerId);
    const terrainLayer = new TerrainLayer();
    renderer.addLayer(terrainLayer);
    renderer.addLayer(new TerritoryLayer());
    renderer.addLayer(new UILayer());
    rendererRef.current = renderer;

    let rafId = 0;
    const renderLoop = () => {
      if (rendererRef.current) {
        rendererRef.current.render(stateRef.current);
      }
      rafId = requestAnimationFrame(renderLoop);
    };
    rafId = requestAnimationFrame(renderLoop);

    loadMapDataFromPath("/maps/world").then((mapData) => {
      if (mapData && rendererRef.current) {
        rendererRef.current.setTerrainFromMap(
          mapData.terrain,
          mapData.width,
          mapData.height,
        );
        worldSizeRef.current = { w: mapData.width, h: mapData.height };
        fitView(mapData.width, mapData.height);
        rendererRef.current.render(stateRef.current);
      }
    });

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const factor = 1 - e.deltaY * ZOOM_SPEED;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale * factor));
      const ratio = newScale / v.scale;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      viewRef.current = {
        worldX: mx - (mx - v.worldX) * ratio,
        worldY: my - (my - v.worldY) * ratio,
        scale: newScale,
      };
      renderer.setView(
        viewRef.current.worldX,
        viewRef.current.worldY,
        viewRef.current.scale,
      );
      renderer.render(stateRef.current);
    };

    let dragging = false;
    let dragStartX = 0,
      dragStartY = 0,
      worldStartX = 0,
      worldStartY = 0,
      dragMoved = false;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      worldStartX = viewRef.current.worldX;
      worldStartY = viewRef.current.worldY;
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      viewRef.current.worldX = worldStartX + dx;
      viewRef.current.worldY = worldStartY + dy;
      renderer.setView(
        viewRef.current.worldX,
        viewRef.current.worldY,
        viewRef.current.scale,
      );
      renderer.render(stateRef.current);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (!dragMoved && onCellClickRef.current) {
        const st = stateRef.current;
        const cols = st?.cols ?? COLS;
        const rows = st?.rows ?? ROWS;
        const v = viewRef.current;
        const { w: worldW, h: worldH } = worldSizeRef.current;
        const cellW = worldW / cols;
        const cellH = worldH / rows;
        const rect = el.getBoundingClientRect();
        const wx = (e.clientX - rect.left - v.worldX) / v.scale;
        const wy = (e.clientY - rect.top - v.worldY) / v.scale;
        const col = Math.floor(wx / cellW);
        const row = Math.floor(wy / cellH);
        if (col >= 0 && col < cols && row >= 0 && row < rows)
          onCellClickRef.current(row * cols + col);
      }
    };

    const handleResize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      renderer.setSize(w, h);
      renderer.setDevicePixelRatio(dpr);
      renderer.setView(
        viewRef.current.worldX,
        viewRef.current.worldY,
        viewRef.current.scale,
      );
      renderer.render(stateRef.current);
    };
    window.addEventListener("resize", handleResize);

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);

    renderer.render(stateRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      canvas.remove();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.setPlayerId(playerId);
    r.setView(
      viewRef.current.worldX,
      viewRef.current.worldY,
      viewRef.current.scale,
    );
  }, [playerId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        cursor: "grab",
      }}
    />
  );
}
