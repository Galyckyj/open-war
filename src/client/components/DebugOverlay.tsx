/**
 * Live-профайлер продуктивності.
 * Shift+D — вкл/викл.
 *
 * Показує:
 *  - FPS / час кадру
 *  - Деталі рендеру: Territory (paintTile, GPU-cmds, drawImage), загальний render
 *  - WS: delta (клітин/тік), час обробки
 *  - RAM (Chrome)
 */

import { useEffect, useRef, useState } from 'react';
import type { SocketStats } from '../hooks/useGameSocket';
import { perfStats } from '../utils/perfStats';

function ms(n: number): string { return `${n.toFixed(1)}ms`; }
function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

interface DebugOverlayProps {
  statsRef: React.RefObject<SocketStats>;
}

interface Snapshot {
  fps: number;
  frameMs: number;
  renderMs: number;
  paintTileMs: number;
  gpuCmdMs: number;
  putImageMs: number;
  drawImageMs: number;
  tilesPainted: number;
  deltaCount: number;
  fullRedrawCount: number;
  wsDeltaSize: number;
  wsProcessMs: number;
  bytesIn: number;
  bytesOut: number;
  memory: number | null;
}

export function DebugOverlay({ statsRef }: DebugOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef(performance.now());
  const frameCountRef = useRef(0);

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

      if (elapsed >= 300) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        const frameMs = elapsed / frameCountRef.current;
        frameCountRef.current = 0;
        lastRef.current = now;

        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

        setSnap({
          fps,
          frameMs,
          renderMs: perfStats.renderMs,
          paintTileMs: perfStats.paintTileMs,
          gpuCmdMs: perfStats.gpuCmdMs,
          putImageMs: perfStats.putImageMs,
          drawImageMs: perfStats.drawImageMs,
          tilesPainted: perfStats.tilesPainted,
          deltaCount: perfStats.deltaCount,
          fullRedrawCount: perfStats.fullRedrawCount,
          wsDeltaSize: perfStats.wsDeltaSize,
          wsProcessMs: perfStats.wsProcessMs,
          bytesIn: statsRef.current?.bytesIn ?? 0,
          bytesOut: statsRef.current?.bytesOut ?? 0,
          memory: mem?.usedJSHeapSize ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null,
        });
      }

      rafRef.current = requestAnimationFrame(measure);
    };

    lastRef.current = performance.now();
    frameCountRef.current = 0;
    rafRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, statsRef]);

  if (!visible) return null;

  const s = snap;

  const row = (label: string, value: string, warn?: boolean) => (
    <div className={`flex justify-between gap-4 ${warn ? 'text-yellow-400' : ''}`}>
      <span className="text-slate-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );

  const section = (title: string) => (
    <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 mb-0.5 border-t border-slate-700 pt-1">{title}</div>
  );

  if (!s) return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-sm rounded px-3 py-2 text-white text-xs font-mono pointer-events-none">
      Збираємо дані…
      <div className="text-[10px] text-slate-400 mt-1">Shift+D — вкл/викл</div>
    </div>
  );

  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-sm rounded px-3 py-2 text-white text-xs font-mono pointer-events-none select-none min-w-[260px]"
      aria-hidden
    >
      {/* FPS */}
      {section('Кадри')}
      {row('FPS', `${s.fps}`, s.fps < 30)}
      {row('Час кадру', ms(s.frameMs), s.frameMs > 16)}
      {row('Render (всі шари)', ms(s.renderMs), s.renderMs > 16)}

      {/* Territory layer */}
      {section('Territory Layer')}
      {row('Тайлів перемальовано', `${s.tilesPainted}`)}
      {row('Delta (клітин)', `${s.deltaCount}`)}
      {row('paintTile (imageData)', ms(s.paintTileMs), s.paintTileMs > 5)}
      {s.gpuCmdMs > 0 && row('GPU cmds (fillRect)', ms(s.gpuCmdMs), s.gpuCmdMs > 5)}
      {s.putImageMs > 0 && row('putImageData', ms(s.putImageMs), s.putImageMs > 5)}
      {row('drawImage', ms(s.drawImageMs), s.drawImageMs > 5)}
      {row('Повних редро', `${s.fullRedrawCount}`)}

      {/* WebSocket */}
      {section('WebSocket')}
      {row('Delta розмір', `${s.wsDeltaSize} кліт/тік`)}
      {row('WS обробка', ms(s.wsProcessMs), s.wsProcessMs > 5)}
      {row('Отримано', formatBytes(s.bytesIn))}
      {row('Відправлено', formatBytes(s.bytesOut))}

      {/* Memory */}
      {s.memory !== null && (
        <>
          {section('Пам\'ять')}
          {row('JS Heap', `${s.memory} MB`, s.memory > 200)}
        </>
      )}

      <div className="text-[10px] text-slate-500 mt-2">Shift+D — вкл/викл</div>
    </div>
  );
}
