import { useState } from "react";
import { IconChartBar } from "@tabler/icons-react";
import type { GameUISnapshot } from "../hooks/useGameSocket";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.floor(n));
}

interface LeaderboardProps {
  uiSnapshot: GameUISnapshot | null;
  playerId: string | null;
  onPlayerClick?: (playerId: string) => void;
}

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(8,14,24,0.82)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.09)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

export function Leaderboard({
  uiSnapshot,
  playerId,
  onPlayerClick,
}: LeaderboardProps) {
  const [open, setOpen] = useState(true);

  const rows = uiSnapshot
    ? Object.entries(uiSnapshot.players)
        .filter(([, p]) => p.score > 0)
        .sort(([, a], [, b]) => b.score - a.score)
        .slice(0, 8)
    : [];

  const totalLand = uiSnapshot
    ? Object.values(uiSnapshot.players).reduce((s, p) => s + p.score, 0)
    : 0;

  return (
    <div
      className="absolute top-3 left-3 z-20 select-none rounded-2xl text-white text-xs overflow-hidden"
      style={{
        ...PANEL_STYLE,
        minWidth: open && rows.length > 0 ? 340 : "unset",
      }}
    >
      {/* Заголовок — завжди видимий, кнопка є його частиною */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={
          open && rows.length > 0
            ? { borderBottom: "1px solid rgba(255,255,255,0.07)" }
            : {}
        }
      >
        <button
          onClick={() => setOpen((v) => !v)}
          title={open ? "Сховати статистику" : "Показати статистику"}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <IconChartBar size={18} stroke={2} />
        </button>
        {open && rows.length > 0 && (
          <span className="font-semibold text-sm text-white/90">
            Статистика
          </span>
        )}
      </div>

      {/* Тіло панелі — тільки коли відкрито і є дані */}
      {open && rows.length > 0 && (
        <>
          {/* Заголовки колонок */}
          <div
            className="grid px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/35 font-medium"
            style={{ gridTemplateColumns: "44px 1fr 56px 64px 54px" }}
          >
            <span>Клан</span>
            <span>Нік</span>
            <span className="text-right">Золото</span>
            <span className="text-right">Військо</span>
            <span className="text-right">Терит.</span>
          </div>

          {/* Рядки гравців */}
          <div className="px-2 pb-2 flex flex-col gap-0.5">
            {rows.map(([pid, p]) => {
              const pct =
                totalLand > 0 ? ((p.score / totalLand) * 100).toFixed(1) : "0";
              const isMe = pid === playerId;
              const clan = p.name?.match(/\[(.{1,4})\]/)?.[1] ?? "";

              return (
                <div
                  key={pid}
                  onClick={() => onPlayerClick?.(pid)}
                  className={`grid items-center px-1 py-1.5 rounded-lg transition-colors ${
                    onPlayerClick ? "cursor-pointer" : ""
                  } ${
                    isMe
                      ? "bg-white/10 text-yellow-300 font-semibold"
                      : "text-white/85 hover:bg-white/8"
                  }`}
                  style={{ gridTemplateColumns: "44px 1fr 56px 64px 54px" }}
                >
                  {/* Клан */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color ?? "#888" }}
                    />
                    {clan ? (
                      <span
                        className="text-[9px] font-bold px-1 rounded leading-tight"
                        style={{
                          background: "rgba(255,255,255,0.10)",
                          color: p.color ?? "#ccc",
                        }}
                      >
                        {clan}
                      </span>
                    ) : (
                      <span className="w-6" />
                    )}
                  </div>

                  {/* Нік */}
                  <span className="truncate pr-2">{p.name}</span>

                  {/* Золото (немає в GameState поки) */}
                  <span className="text-right tabular-nums text-white/35">
                    —
                  </span>

                  {/* Військо */}
                  <span className="text-right tabular-nums">
                    {formatNum(p.troops)}
                  </span>

                  {/* Територія */}
                  <span className="text-right tabular-nums">{pct}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
