/**
 * Canvas 2D карта з кастомним GameRenderer (шари + viewport culling), за зразком OpenFrontIO.
 * Мобільна підтримка: pinch-to-zoom через pointer events, touch-action:none, повний DPR.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
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
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 20;
const ZOOM_SPEED = 0.0012;

function useLatestRef<T>(value: T) {
  const ref = useRef<T>(value);
  ref.current = value;
  return ref;
}

export interface GameCameraHandle {
  /** Плавно переміщає камеру так, щоб точка (wx, wy) у world-координатах була по центру екрану. */
  flyTo: (wx: number, wy: number) => void;
  getWorldSize: () => { w: number; h: number };
}

interface GameCanvasProps {
  state?: GameState | null;
  stateRef: React.RefObject<GameState | null>;
  playerId: string | null;
  selectedCell: number | null;
  onCellClick?: (index: number) => void;
}

export const GameCanvas = forwardRef<GameCameraHandle, GameCanvasProps>(function GameCanvas({
  stateRef,
  playerId,
  selectedCell: _selectedCell,
  onCellClick,
}: GameCanvasProps, cameraRef) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCellClickRef = useLatestRef(onCellClick);
  const rendererRef = useRef<GameRenderer | null>(null);
  const viewRef = useRef({ worldX: 0, worldY: 0, scale: 1 });
  const worldSizeRef = useRef<{ w: number; h: number }>({
    w: DEFAULT_WORLD_W,
    h: DEFAULT_WORLD_H,
  });
  // Ціль плавного польоту камери (world-координати)
  const flyTargetRef = useRef<{ wx: number; wy: number } | null>(null);

  useImperativeHandle(cameraRef, () => ({
    flyTo: (wx, wy) => { flyTargetRef.current = { wx, wy }; },
    getWorldSize: () => worldSizeRef.current,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const W = el.clientWidth || window.innerWidth;
    const H = el.clientHeight || window.innerHeight;
    // Повний DPR без обмеження: телефони мають DPR=3, обмеження до 2 = розмазаність
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

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
    renderer.addLayer(new TerrainLayer());
    renderer.addLayer(new TerritoryLayer());
    renderer.addLayer(new UILayer());
    rendererRef.current = renderer;

    let rafId = 0;
    const renderLoop = () => {
      // Плавний політ камери до цілі (lerp ~0.1 per frame ≈ досягає цілі за ~0.5s)
      const fly = flyTargetRef.current;
      if (fly) {
        const v = viewRef.current;
        const screenW = el.clientWidth || window.innerWidth;
        const screenH = el.clientHeight || window.innerHeight;
        const targetWorldX = screenW / 2 - fly.wx * v.scale;
        const targetWorldY = screenH / 2 - fly.wy * v.scale;
        const dx = targetWorldX - v.worldX;
        const dy = targetWorldY - v.worldY;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
          v.worldX = targetWorldX;
          v.worldY = targetWorldY;
          flyTargetRef.current = null;
        } else {
          v.worldX += dx * 0.12;
          v.worldY += dy * 0.12;
        }
        renderer.setView(v.worldX, v.worldY, v.scale);
      }

      if (rendererRef.current) rendererRef.current.render(stateRef.current);
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

    // ── Wheel (desktop) ──────────────────────────────────────────────────────
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

    // ── Pointer events (pan + pinch-to-zoom) ────────────────────────────────
    // Зберігаємо всі активні вказівники для pinch detection
    const activePointers = new Map<number, { x: number; y: number }>();
    let dragging = false;
    let dragStartX = 0, dragStartY = 0;
    let worldStartX = 0, worldStartY = 0;
    let dragMoved = false;
    // Стан попереднього кроку pinch для інкрементального зуму
    let lastPinchDist = 0;
    let lastPinchMidX = 0;
    let lastPinchMidY = 0;

    const getPinchState = () => {
      const pts = Array.from(activePointers.values());
      if (pts.length < 2) return null;
      const [a, b] = pts;
      return {
        dist: Math.hypot(b!.x - a!.x, b!.y - a!.y),
        midX: (a!.x + b!.x) / 2,
        midY: (a!.y + b!.y) / 2,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        dragging = true;
        dragMoved = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        worldStartX = viewRef.current.worldX;
        worldStartY = viewRef.current.worldY;
      } else if (activePointers.size === 2) {
        // Починаємо pinch — скасовуємо одиночний drag
        dragging = false;
        const pinch = getPinchState()!;
        lastPinchDist = pinch.dist;
        lastPinchMidX = pinch.midX;
        lastPinchMidY = pinch.midY;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size >= 2) {
        // ── Pinch-to-zoom ──────────────────────────────────────────────────
        const pinch = getPinchState();
        if (!pinch) return;

        const rect = el.getBoundingClientRect();
        const v = viewRef.current;

        // Масштаб: відношення нової відстані до попередньої
        const distRatio = pinch.dist / (lastPinchDist || pinch.dist);
        const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale * distRatio));
        const scaleRatio = newScale / v.scale;

        // Зум навколо центру pinch + pan від зміщення центру
        const cx = pinch.midX - rect.left;
        const cy = pinch.midY - rect.top;
        const panDx = pinch.midX - lastPinchMidX;
        const panDy = pinch.midY - lastPinchMidY;

        viewRef.current = {
          worldX: cx - (cx - v.worldX) * scaleRatio + panDx,
          worldY: cy - (cy - v.worldY) * scaleRatio + panDy,
          scale: newScale,
        };

        lastPinchDist = pinch.dist;
        lastPinchMidX = pinch.midX;
        lastPinchMidY = pinch.midY;

        renderer.setView(
          viewRef.current.worldX,
          viewRef.current.worldY,
          viewRef.current.scale,
        );
        renderer.render(stateRef.current);

      } else if (activePointers.size === 1 && dragging) {
        // ── Single-finger pan ──────────────────────────────────────────────
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
        viewRef.current.worldX = worldStartX + dx;
        viewRef.current.worldY = worldStartY + dy;
        renderer.setView(
          viewRef.current.worldX,
          viewRef.current.worldY,
          viewRef.current.scale,
        );
        renderer.render(stateRef.current);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasOneFinger = activePointers.size === 1;
      activePointers.delete(e.pointerId);

      if (wasOneFinger && dragging) {
        dragging = false;
        // Тап без переміщення = клік
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
      }

      // Якщо після pinch залишився 1 палець — перезапускаємо pan
      if (activePointers.size === 1) {
        const [, pt] = Array.from(activePointers.entries())[0]!;
        dragging = true;
        dragMoved = true; // не тригеримо клік після pinch
        dragStartX = pt.x;
        dragStartY = pt.y;
        worldStartX = viewRef.current.worldX;
        worldStartY = viewRef.current.worldY;
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size === 0) dragging = false;
    };

    // ── Resize ───────────────────────────────────────────────────────────────
    const handleResize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      const newDpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = w * newDpr;
      canvas.height = h * newDpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      renderer.setSize(w, h);
      renderer.setDevicePixelRatio(newDpr);
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
    el.addEventListener("pointercancel", onPointerCancel);

    renderer.render(stateRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
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
        height: "100dvh",      // dvh коректно враховує мобільний UI (адресний рядок)
        overflow: "hidden",
        cursor: "grab",
        touchAction: "none",   // критично: без цього браузер перехоплює дотики
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    />
  );
});
