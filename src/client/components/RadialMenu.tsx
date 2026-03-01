import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IconHammer,
  IconChevronsUp,
  IconSwords,
  IconBuildingBank,
} from '@tabler/icons-react';
import type { TabId } from './BottomActionBar';

// ─── Геометрія ────────────────────────────────────────────────────────────────

const CX       = 130;   // центр SVG
const CY       = 130;
const SVG_SIZE = 260;
const INNER_R  = 34;    // радіус центральної дірки
const OUTER_R  = 112;   // зовнішній радіус секторів
const GAP_DEG  = 4;     // проміжок між секторами (градуси)

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** SVG path для сектора-кільця (donut slice) */
function sectorPath(
  cx: number, cy: number,
  r1: number, r2: number,
  startDeg: number, endDeg: number,
): string {
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const x1 = cx + r2 * Math.cos(s), y1 = cy + r2 * Math.sin(s);
  const x2 = cx + r2 * Math.cos(e), y2 = cy + r2 * Math.sin(e);
  const x3 = cx + r1 * Math.cos(e), y3 = cy + r1 * Math.sin(e);
  const x4 = cx + r1 * Math.cos(s), y4 = cy + r1 * Math.sin(s);
  return [
    `M ${x1} ${y1}`,
    `A ${r2} ${r2} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${r1} ${r1} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

// ─── Конфігурація сегментів ───────────────────────────────────────────────────

const SEGMENTS: {
  id: Exclude<TabId, null>;
  label: string;
  icon: React.ReactNode;
  /** Напрямок центру сектора (0 = праворуч, -90 = вгору) */
  centerDeg: number;
}[] = [
  { id: 'construction', label: 'Будівництво', icon: <IconHammer     size={19} stroke={1.8} />, centerDeg: -90  },
  { id: 'operations',   label: 'Операції',    icon: <IconSwords     size={19} stroke={1.8} />, centerDeg:   0  },
  { id: 'development',  label: 'Розвиток',    icon: <IconChevronsUp size={19} stroke={1.8} />, centerDeg:  90  },
  { id: 'politics',     label: 'Політика',    icon: <IconBuildingBank size={19} stroke={1.8} />, centerDeg: 180  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface RadialMenuProps {
  x: number;
  y: number;
  onSelect: (tab: Exclude<TabId, null>) => void;
  onClose: () => void;
  /** Якщо передано — центральна кнопка стає кнопкою атаки (для мобільного тапу) */
  onAttack?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RadialMenu({ x, y, onSelect, onClose, onAttack }: RadialMenuProps) {
  const [hovered, setHovered] = useState<Exclude<TabId, null> | null>(null);
  const [centerHovered, setCenterHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  // Захист від синтезованих mouse/pointer-подій після touchend
  const createdAt = useRef(Date.now());

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSelect = useCallback((id: Exclude<TabId, null>) => {
    onSelect(id);
    onClose();
  }, [onSelect, onClose]);

  // Зсуваємо щоб не виходити за межі екрану
  const cx = Math.min(Math.max(x, OUTER_R + 16), window.innerWidth  - OUTER_R - 16);
  const cy = Math.min(Math.max(y, OUTER_R + 16), window.innerHeight - OUTER_R - 16);

  // Радіус розміщення іконок (середина між inner та outer)
  const iconR = (INNER_R + OUTER_R) / 2;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        onPointerDown={(e) => {
          // Ігноруємо перші ~650мс, щоб synthetic події не закривали меню одразу.
          if (Date.now() - createdAt.current <= 650) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />

      {/* Контейнер меню */}
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          left: cx - CX,
          top:  cy - CY,
          width: SVG_SIZE,
          height: SVG_SIZE,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.75)',
          transition: 'opacity 0.14s ease, transform 0.14s ease',
          transformOrigin: `${CX}px ${CY}px`,
        }}
      >
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          {/* Зовнішнє пунктирне кільце */}
          <circle
            cx={CX} cy={CY} r={OUTER_R + 8}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.5"
            strokeDasharray="7 5"
          />

          {/* Центральний кружок / кнопка атаки */}
          <circle
            cx={CX} cy={CY} r={INNER_R - 2}
            fill={onAttack
              ? (centerHovered ? 'rgba(239,68,68,0.55)' : 'rgba(239,68,68,0.30)')
              : 'rgba(15,20,35,0.85)'}
            stroke={onAttack
              ? (centerHovered ? 'rgba(239,68,68,0.9)' : 'rgba(239,68,68,0.55)')
              : 'rgba(255,255,255,0.25)'}
            strokeWidth={onAttack && centerHovered ? 1.5 : 1}
            style={{
              cursor: onAttack ? 'pointer' : 'default',
              pointerEvents: onAttack ? 'all' : 'none',
              transition: 'fill 0.1s, stroke 0.1s',
              filter: onAttack && centerHovered ? 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' : 'none',
            }}
            onMouseEnter={() => onAttack && setCenterHovered(true)}
            onMouseLeave={() => setCenterHovered(false)}
            onMouseDown={(e) => { if (onAttack) { e.stopPropagation(); onAttack(); } }}
            onTouchEnd={(e) => { if (onAttack) { e.stopPropagation(); onAttack(); } }}
          />

          {/* Сектори */}
          {SEGMENTS.map((seg) => {
            const startDeg = seg.centerDeg - 45 + GAP_DEG / 2;
            const endDeg   = seg.centerDeg + 45 - GAP_DEG / 2;
            const isHovered = hovered === seg.id;

            return (
              <path
                key={seg.id}
                d={sectorPath(CX, CY, INNER_R, OUTER_R, startDeg, endDeg)}
                fill={
                  isHovered
                    ? 'rgba(52,211,153,0.40)'
                    : 'rgba(15,20,35,0.80)'
                }
                stroke={
                  isHovered
                    ? 'rgba(52,211,153,0.75)'
                    : 'rgba(255,255,255,0.22)'
                }
                strokeWidth={isHovered ? 1.5 : 1}
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'all',
                  transition: 'fill 0.1s, stroke 0.1s',
                  filter: isHovered
                    ? 'drop-shadow(0 0 8px rgba(52,211,153,0.4))'
                    : 'none',
                }}
                onMouseEnter={() => setHovered(seg.id)}
                onMouseLeave={() => setHovered(null)}
                onMouseDown={(e) => { e.stopPropagation(); handleSelect(seg.id); }}
              />
            );
          })}
        </svg>

        {/* Іконки (div поверх SVG) */}
        {SEGMENTS.map((seg) => {
          const rad = toRad(seg.centerDeg);
          const ix = CX + iconR * Math.cos(rad);
          const iy = CY + iconR * Math.sin(rad);
          const isHovered = hovered === seg.id;
          const ICON_BOX = 32;

          return (
            <div
              key={seg.id}
              style={{
                position: 'absolute',
                left: ix - ICON_BOX / 2,
                top:  iy - ICON_BOX / 2,
                width: ICON_BOX,
                height: ICON_BOX,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: isHovered ? '#6ee7b7' : 'rgba(255,255,255,0.75)',
                transition: 'color 0.1s',
              }}
            >
              {seg.icon}
            </div>
          );
        })}

        {/* Центральна іконка атаки */}
        {onAttack && (
          <div
            style={{
              position: 'absolute',
              left: CX - 12,
              top:  CY - 12,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              color: centerHovered ? '#fca5a5' : 'rgba(239,68,68,0.75)',
              transition: 'color 0.1s',
            }}
          >
            <IconSwords size={16} stroke={2} />
          </div>
        )}

        {/* Підпис при ховері */}
        {hovered && (() => {
          const seg = SEGMENTS.find(s => s.id === hovered)!;
          const labelR = OUTER_R + 22;
          const rad = toRad(seg.centerDeg);
          const lx = CX + labelR * Math.cos(rad);
          const ly = CY + labelR * Math.sin(rad);
          return (
            <div
              style={{
                position: 'absolute',
                left: lx,
                top: ly,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontSize: 11,
                fontWeight: 600,
                color: '#6ee7b7',
                background: 'rgba(0,0,0,0.65)',
                border: '1px solid rgba(52,211,153,0.25)',
                borderRadius: 6,
                padding: '2px 8px',
              }}
            >
              {seg.label}
            </div>
          );
        })()}
      </div>
    </>
  );
}
