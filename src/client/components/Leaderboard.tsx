import { useState } from "react";
import { IconChartBar, IconSwords, IconMapPin, IconX } from "@tabler/icons-react";
import type { GameUISnapshot } from "../hooks/useGameSocket";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.floor(n));
}

const RANK_COLORS: Record<number, string> = {
  1: "#fbbf24",
  2: "#94a3b8",
  3: "#cd7c4b",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeaderboardProps {
  uiSnapshot: GameUISnapshot | null;
  playerId: string | null;
  onPlayerClick?: (playerId: string) => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: "rgba(8,12,20,0.78)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Leaderboard({ uiSnapshot, playerId, onPlayerClick }: LeaderboardProps) {
  const [open, setOpen] = useState(false);

  const rows = uiSnapshot
    ? Object.entries(uiSnapshot.players)
        .filter(([, p]) => p.score > 0)
        .sort(([, a], [, b]) => b.score - a.score)
        .slice(0, 8)
    : [];

  const totalLand = rows.reduce((s, [, p]) => s + p.score, 0);

  return (
    <div
      className="absolute top-3 left-3 z-20 select-none text-white"
      style={{
        ...glass,
        borderRadius: 16,
        minWidth: open && rows.length > 0 ? 280 : "unset",
        overflow: "hidden",
      }}
    >
      {/* ── Заголовок ── */}
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
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.55)",
          }}
          title={open ? "Сховати" : "Показати"}
        >
          <IconChartBar size={15} stroke={1.8} />
        </button>

        {open && rows.length > 0 && (
          <>
            <span className="text-[11px] font-semibold text-white/70 tracking-wide flex-1">
              Таблиця лідерів
            </span>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-6 h-6 rounded-md transition-all cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              <IconX size={12} stroke={2} />
            </button>
          </>
        )}
      </div>

      {/* ── Рядки ── */}
      {open && rows.length > 0 && (
        <div className="px-2 py-1.5 flex flex-col gap-0.5">
          {rows.map(([pid, p], idx) => {
            const rank = idx + 1;
            const pct = totalLand > 0 ? (p.score / totalLand) * 100 : 0;
            const isMe = pid === playerId;
            const rankColor = RANK_COLORS[rank];
            const nameClean = p.name?.replace(/\[.+?\]\s*/, "") ?? "—";
            const clan = p.name?.match(/\[(.{1,4})\]/)?.[1] ?? null;

            return (
              <div
                key={pid}
                onClick={() => onPlayerClick?.(pid)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all ${
                  onPlayerClick ? "cursor-pointer" : ""
                }`}
                style={{
                  background: isMe
                    ? "rgba(52,211,153,0.1)"
                    : "rgba(255,255,255,0.03)",
                  border: isMe
                    ? "1px solid rgba(52,211,153,0.2)"
                    : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isMe)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!isMe)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "rgba(255,255,255,0.03)";
                }}
              >
                {/* Ранг */}
                <span
                  className="text-[11px] font-bold tabular-nums w-5 text-center shrink-0"
                  style={{ color: rankColor ?? "rgba(255,255,255,0.3)" }}
                >
                  {rank}
                </span>

                {/* Колір гравця */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: p.color ?? "#888",
                    boxShadow: `0 0 5px ${p.color ?? "#888"}55`,
                  }}
                />

                {/* Ім'я + клан */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {clan && (
                      <span
                        className="text-[9px] font-bold px-1 rounded shrink-0 leading-tight"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: p.color ?? "#aaa",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {clan}
                      </span>
                    )}
                    <span
                      className="text-[12px] font-medium truncate"
                      style={{ color: isMe ? "#6ee7b7" : "rgba(255,255,255,0.85)" }}
                    >
                      {nameClean}
                    </span>
                  </div>

                  {/* Territory bar */}
                  <div
                    className="mt-1 h-0.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: isMe
                          ? "rgba(52,211,153,0.7)"
                          : (p.color ?? "rgba(255,255,255,0.35)"),
                      }}
                    />
                  </div>
                </div>

                {/* Військо */}
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  <IconSwords size={10} stroke={1.5} />
                  <span className="text-[11px] tabular-nums">
                    {formatNum(p.troops)}
                  </span>
                </div>

                {/* Територія % */}
                <div
                  className="flex items-center gap-0.5 w-10 justify-end shrink-0"
                  style={{ color: isMe ? "#6ee7b7" : "rgba(255,255,255,0.55)" }}
                >
                  <IconMapPin size={10} stroke={1.5} />
                  <span className="text-[11px] tabular-nums font-medium">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
