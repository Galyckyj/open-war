import { useState } from 'react';
import {
  IconAnchor,
  IconBuildingCastle,
  IconWheat,
  IconBolt,
  IconLock,
} from '@tabler/icons-react';

export type BuildingId = 'port' | 'fortress' | 'farm' | 'barracks' | null;

interface Building {
  id: BuildingId;
  label: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
}

const BUILDINGS: Building[] = [
  {
    id: 'port',
    label: 'Порт',
    icon: <IconAnchor size={22} stroke={1.8} />,
    description: '+50% швидкість атаки через воду',
    available: true,
  },
  {
    id: 'fortress',
    label: 'Фортеця',
    icon: <IconBuildingCastle size={22} stroke={1.8} />,
    description: '+100% захист від штурму',
    available: true,
  },
  {
    id: 'farm',
    label: 'Ферма',
    icon: <IconWheat size={22} stroke={1.8} />,
    description: '+25% приріст військ за тік',
    available: true,
  },
  {
    id: 'barracks',
    label: 'Казарми',
    icon: <IconBolt size={22} stroke={1.8} />,
    description: '+40% швидкість атаки',
    available: false,
  },
];

interface BuildingMenuProps {
  selected: BuildingId;
  onSelect: (id: BuildingId) => void;
}

export function BuildingMenu({ selected, onSelect }: BuildingMenuProps) {
  const [hovered, setHovered] = useState<BuildingId>(null);

  const tooltip = hovered !== null
    ? BUILDINGS.find((b) => b.id === hovered)
    : null;

  return (
    <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2 pointer-events-auto select-none">
      {/* Підказка */}
      {tooltip && (
        <div
          className="px-3 py-1.5 rounded-xl text-xs text-white/90 font-mono whitespace-nowrap"
          style={{
            background: 'rgba(8,14,24,0.88)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="font-semibold text-white">{tooltip.label}</span>
          <span className="text-slate-400 ml-2">{tooltip.description}</span>
        </div>
      )}

      {/* Панель будівель */}
      <div
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl"
        style={{
          background: 'rgba(8,14,24,0.82)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {BUILDINGS.map((b) => {
          const isSelected = selected === b.id;
          const isDisabled = !b.available;

          return (
            <button
              key={b.id}
              onClick={() => !isDisabled && onSelect(isSelected ? null : b.id)}
              onMouseEnter={() => setHovered(b.id)}
              onMouseLeave={() => setHovered(null)}
              disabled={isDisabled}
              title={b.label}
              className={`
                relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all duration-150
                ${isDisabled
                  ? 'opacity-30 cursor-not-allowed text-slate-500'
                  : isSelected
                    ? 'text-emerald-300 cursor-pointer scale-105'
                    : 'text-slate-300 hover:text-white cursor-pointer hover:scale-105'
                }
              `}
              style={{
                background: isSelected
                  ? 'rgba(52,211,153,0.18)'
                  : 'rgba(255,255,255,0.05)',
                border: isSelected
                  ? '1px solid rgba(52,211,153,0.5)'
                  : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {b.icon}
              <span className="text-[9px] font-medium leading-none tracking-wide uppercase">
                {b.label}
              </span>
              {isDisabled && (
                <IconLock
                  size={10}
                  className="absolute top-1 right-1 text-slate-500"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
