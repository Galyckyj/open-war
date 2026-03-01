import type React from 'react';
import { IconSwords } from '@tabler/icons-react';

interface TroopSliderProps {
  value: number;
  onChange: (pct: number) => void;
}

const glass: React.CSSProperties = {
  background: 'rgba(8,12,20,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
};

export function TroopSlider({ value, onChange }: TroopSliderProps) {
  return (
    <div
      className="game-bottom-troop hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center gap-3 px-4 py-2 rounded-xl pointer-events-auto select-none"
      style={glass}
    >
      <IconSwords size={14} className="text-white/45 shrink-0" />
      <span className="text-white/45 text-xs whitespace-nowrap">Відправити</span>
      <input
        type="range"
        min={10}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-36 accent-emerald-500 cursor-pointer"
      />
      <span className="text-white/90 font-bold tabular-nums text-sm w-9 text-right">
        {value}%
      </span>
    </div>
  );
}
