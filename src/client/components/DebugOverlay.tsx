/**
 * Панель налагодження: FPS, навантаження (час кадру), трафік WebSocket.
 * Увімкнення: Shift+D.
 */

import { useEffect, useRef, useState } from 'react';
import type { SocketStats } from '../hooks/useGameSocket';

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

interface DebugOverlayProps {
  statsRef: React.RefObject<SocketStats>;
}

export function DebugOverlay({ statsRef }: DebugOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [fps, setFps] = useState(0);
  const [frameMs, setFrameMs] = useState(0);
  const [bytesIn, setBytesIn] = useState(0);
  const [bytesOut, setBytesOut] = useState(0);
  const [memory, setMemory] = useState<number | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const tickRef = useRef(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const measure = () => {
      const now = performance.now();
      frameCountRef.current += 1;
      const elapsed = now - lastRef.current;

      if (elapsed >= 200) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        setFrameMs(elapsed / frameCountRef.current);
        frameCountRef.current = 0;
        lastRef.current = now;
      }

      tickRef.current += 1;
      if (tickRef.current % 5 === 0 && statsRef.current) {
        setBytesIn(statsRef.current.bytesIn);
        setBytesOut(statsRef.current.bytesOut);
      }

      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      if (mem?.usedJSHeapSize) setMemory(Math.round(mem.usedJSHeapSize / 1024 / 1024));

      rafRef.current = requestAnimationFrame(measure);
    };

    lastRef.current = performance.now();
    frameCountRef.current = 0;
    rafRef.current = requestAnimationFrame(measure);

    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, statsRef]);

  if (!visible) return null;

  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-sm rounded px-3 py-2 text-white text-xs font-mono pointer-events-none select-none"
      aria-hidden
    >
      <div className="flex items-center gap-4 flex-wrap">
        <span title="Кадрів за секунду">
          <strong>FPS:</strong> {fps}
        </span>
        <span title="Середній час кадру (мс)">
          <strong>Кадр:</strong> {frameMs.toFixed(1)} ms
        </span>
        <span title="Отримано по WebSocket">
          <strong>↓</strong> {formatBytes(bytesIn)}
        </span>
        <span title="Відправлено по WebSocket">
          <strong>↑</strong> {formatBytes(bytesOut)}
        </span>
        {memory !== null && (
          <span title="Використання памʼяті JS (Chrome)">
            <strong>RAM:</strong> {memory} MB
          </span>
        )}
      </div>
      <div className="text-[10px] text-slate-400 mt-1">Shift+D — вкл/викл</div>
    </div>
  );
}
