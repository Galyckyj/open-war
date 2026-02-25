interface TroopSliderProps {
  value: number;
  onChange: (pct: number) => void;
}

export function TroopSlider({ value, onChange }: TroopSliderProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-3 text-white text-sm pointer-events-auto select-none min-w-[260px]">
      <span className="text-slate-400 text-xs whitespace-nowrap">Відправити:</span>
      <input
        type="range"
        min={10}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-emerald-500 cursor-pointer"
      />
      <span className="font-bold tabular-nums w-10 text-right">{value}%</span>
    </div>
  );
}
