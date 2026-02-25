import type { GameState, PlayerId } from '../../shared/types';
import type { GameUISnapshot } from '../hooks/useGameSocket';

function formatTroops(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.floor(n));
}

interface LeaderboardProps {
  uiSnapshot: GameUISnapshot | null;
  playerId: string | null;
}

export function Leaderboard({ uiSnapshot, playerId }: LeaderboardProps) {
  if (!uiSnapshot) return null;

  const totalLand = Object.values(uiSnapshot.players).reduce((s, p) => s + p.score, 0);
  const players = Object.values(uiSnapshot.players)
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);

  if (players.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs min-w-[180px] pointer-events-none select-none">
      <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
        Leaderboard
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-slate-500 text-[10px]">
            <th className="text-left font-normal pb-0.5">#</th>
            <th className="text-left font-normal pb-0.5">Гравець</th>
            <th className="text-right font-normal pb-0.5">Війська</th>
            <th className="text-right font-normal pb-0.5">Золото</th>
            <th className="text-right font-normal pb-0.5">Терит.</th>
          </tr>
        </thead>
        <tbody>
          {players.slice(0, 10).map((p, i) => {
            const pct = totalLand > 0 ? ((p.score / totalLand) * 100).toFixed(1) : '0';
            const isMe = p.id === playerId;
            return (
              <tr key={p.id} className={isMe ? 'text-yellow-300 font-semibold' : ''}>
                <td className="pr-1">{i + 1}</td>
                <td className="pr-2 max-w-[80px] truncate">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </td>
                <td className="text-right tabular-nums">{formatTroops(p.troops)}</td>
                <td className="text-right tabular-nums text-slate-500">—</td>
                <td className="text-right tabular-nums">{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
