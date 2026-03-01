import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import type { Attack, GameState } from "../../shared/types";
import { useParams, useNavigate } from "react-router-dom";
import { useGameSocket } from "../hooks/useGameSocket";
import { generateUUID } from "../utils/uuid";
import { GameCanvas, type GameCameraHandle } from "../components/GameCanvas";
import { Leaderboard } from "../components/Leaderboard";
import { TroopSlider } from "../components/TroopSlider";
import { DebugOverlay } from "../components/DebugOverlay";
import { BottomActionBar } from "../components/BottomActionBar";
import { RadialMenu } from "../components/RadialMenu";
import type { BuildingType } from "../../shared/types";
import type { TabId } from "../components/BottomActionBar";

function getPlayerId(): string {
  let id = localStorage.getItem("ow_player_id");
  if (!id) {
    id = generateUUID();
    localStorage.setItem("ow_player_id", id);
  }
  return id;
}

function getNickname(): string {
  return localStorage.getItem("ow_nickname") || "Гравець";
}

// ─── Таймер лобі ─────────────────────────────────────────────────────────────

function LobbyTimer({ lobbyEndsAt }: { lobbyEndsAt: number }) {
  const [msLeft, setMsLeft] = useState(() =>
    Math.max(0, lobbyEndsAt - Date.now()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, lobbyEndsAt - Date.now());
      setMsLeft(left);
      if (left === 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [lobbyEndsAt]);

  const totalMs = 10_000;
  const progress = Math.max(0, Math.min(1, msLeft / totalMs));
  const seconds = Math.ceil(msLeft / 1000);
  const hasSpawned = false; // UI only — підказка показується завжди

  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex flex-col items-center pt-3 px-4 pointer-events-none">
      {/* Скляна панель */}
      <div
        className="w-full max-w-lg rounded-2xl px-5 py-3 flex flex-col gap-2"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Верхній рядок: текст + лічильник */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">
              Підготовка до бою
            </p>
            <p className="text-white/55 text-xs mt-0.5">
              Оберіть місце спавну — натисніть на сушу
            </p>
          </div>
          {/* Кругла цифра */}
          <div
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold tabular-nums
              ${seconds <= 3 ? "text-red-400" : seconds <= 6 ? "text-amber-400" : "text-emerald-400"}`}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: `2px solid ${seconds <= 3 ? "rgba(248,113,113,0.6)" : seconds <= 6 ? "rgba(251,191,36,0.6)" : "rgba(52,211,153,0.6)"}`,
            }}
          >
            {seconds}
          </div>
        </div>

        {/* Прогрес-бар */}
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              seconds <= 3
                ? "bg-red-400"
                : seconds <= 6
                  ? "bg-amber-400"
                  : "bg-emerald-400"
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {hasSpawned && (
          <p className="text-white/40 text-xs text-center">
            Можна змінити позицію — клікніть в інше місце
          </p>
        )}
      </div>
    </div>
  );
}

// ─── AttackDebugPanel ─────────────────────────────────────────────────────────

interface AssaultSnap {
  id: string;
  troops: number;
  targetName: string;
  targetColor: string;
}

function AttackDebugPanel({
  stateRef,
  playerId,
}: {
  stateRef: RefObject<GameState | null>;
  playerId: string;
}) {
  const [assaults, setAssaults] = useState<AssaultSnap[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      const st = stateRef.current;
      if (st) {
        const next: AssaultSnap[] = (st.attacks ?? [])
          .filter(
            (a: Attack) => a.attackerId === playerId && a.targetId !== null,
          )
          .map((a: Attack) => {
            const target = st.players[a.targetId!];
            return {
              id: a.id,
              troops: a.troops,
              targetName: target?.name ?? a.targetId!,
              targetColor: target?.color ?? "#94a3b8",
            };
          });
        setAssaults((prev) => {
          if (prev.length !== next.length) return next;
          for (let i = 0; i < next.length; i++) {
            if (
              prev[i]!.troops !== next[i]!.troops ||
              prev[i]!.id !== next[i]!.id
            )
              return next;
          }
          return prev;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stateRef, playerId]);

  if (assaults.length === 0) return null;

  return (
    <div
      className="hidden sm:block absolute bottom-4 left-4 z-40 text-xs font-mono pointer-events-none select-none rounded-xl px-3 py-2"
      style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">
        {assaults.length === 1 ? "Штурм" : `Штурми (${assaults.length})`}
      </div>
      {assaults.map((a) => (
        <div key={a.id} className="flex items-center gap-2 text-white mt-0.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: a.targetColor }}
          />
          <span className="flex-1">{a.targetName}</span>
          <span className="text-amber-400 font-bold pl-3">
            {a.troops.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── GamePage ─────────────────────────────────────────────────────────────────

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const playerId = getPlayerId();
  const nickname = getNickname();
  const [troopPct, setTroopPct] = useState(40);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(
    null,
  );
  const [hasSpawnedInLobby, setHasSpawnedInLobby] = useState(false);
  const [radialMenu, setRadialMenu] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<Exclude<TabId, null> | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const {
    stateRef,
    statsRef,
    uiSnapshot,
    connected,
    sendSpawn,
    sendAttack,
    sendBuild,
    sendDemolish,
  } = useGameSocket(playerId, nickname, roomId);

  const cameraRef = useRef<GameCameraHandle>(null);

  // Забороняємо скрол сторінки поки в грі
  useEffect(() => {
    document.body.classList.add("game-active");
    return () => document.body.classList.remove("game-active");
  }, []);

  const handlePlayerClick = (pid: string) => {
    const st = stateRef.current;
    const cam = cameraRef.current;
    if (!st || !cam) return;
    // Один прохід по cells для знаходження центру території гравця
    const { cells, cols, rows } = st;
    let sumCol = 0,
      sumRow = 0,
      count = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]?.ownerId === pid) {
        sumCol += i % cols;
        sumRow += (i / cols) | 0;
        count++;
      }
    }
    if (count === 0) return;
    const { w: worldW, h: worldH } = cam.getWorldSize();
    cam.flyTo(
      (sumCol / count / cols) * worldW,
      (sumRow / count / rows) * worldH,
    );
  };

  const handleCellClick = (tile: number) => {
    const st = stateRef.current;
    if (!st || !playerId) return;
    const cell = st.cells[tile];
    if (!cell || cell.terrain !== "land") return;

    // ── Лобі: оберіть або змініть місце спавну ──────────────────────────────
    if (st.phase === "lobby") {
      sendSpawn(tile);
      setHasSpawnedInLobby(true);
      return;
    }

    // ── Режим будівництва: клік на своїй клітині ─────────────────────────────
    if (selectedBuilding && cell.ownerId === playerId) {
      const existing = stateRef.current?.buildings.find(
        (b) => b.tileIndex === tile && b.ownerId === playerId,
      );
      if (existing) {
        sendDemolish(tile);
      } else {
        sendBuild(tile, selectedBuilding);
      }
      return;
    }

    // ── Гра: нормальна механіка ─────────────────────────────────────────────
    const hasTerritory = st.cells.some((c) => c.ownerId === playerId);
    if (!hasTerritory) {
      sendSpawn(tile);
    } else {
      const me = st.players[playerId];
      const troopsToSend = me
        ? Math.floor(me.troops * (troopPct / 100))
        : undefined;
      if (cell.ownerId === null) {
        sendAttack(null, troopsToSend);
      } else if (cell.ownerId !== playerId) {
        sendAttack(cell.ownerId, troopsToSend);
      }
    }
  };

  const inLobby = uiSnapshot?.phase === "lobby";

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inLobby) setRadialMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRadialSelect = (tab: Exclude<TabId, null>) => {
    setActiveTab(tab);
    setRadialMenu(null);
  };

  // ── Тач на мобільних: тап = радіал меню, центр меню = атака ─────────────
  const touchStartPos  = useRef<{ x: number; y: number } | null>(null);
  const touchMoved     = useRef(false);
  const pendingTile    = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (inLobby) return;
    // Ігноруємо тачі по UI-елементах — лише canvas відкриває меню
    if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
    // Блокуємо генерацію сумісних mouse/click подій після touch
    e.preventDefault();
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchMoved.current = false;
  }, [inLobby]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (inLobby || touchMoved.current || !touchStartPos.current) return;
    touchStartPos.current = null;
    const touch = e.changedTouches[0];
    // Відкриваємо меню лише якщо тап потрапив на тайл мапи
    const tile = cameraRef.current?.getTileAtScreen(touch.clientX, touch.clientY) ?? null;
    if (tile === null) return;
    // Критично: прибирає synthetic click/pointer після touchend
    e.preventDefault();
    pendingTile.current = tile;
    setRadialMenu({ x: touch.clientX, y: touch.clientY });
  }, [inLobby, cameraRef]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) touchMoved.current = true;
  }, []);

  const handleCellClickRef = useRef(handleCellClick);
  handleCellClickRef.current = handleCellClick;

  const handleRadialAttack = useCallback(() => {
    const tile = pendingTile.current;
    if (tile !== null) handleCellClickRef.current(tile);
    setRadialMenu(null);
    pendingTile.current = null;
  }, []);

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchMoved.current = true; touchStartPos.current = null; }}
      onTouchMove={handleTouchMove}
    >
      <GameCanvas
        ref={cameraRef}
        stateRef={stateRef}
        playerId={playerId}
        selectedCell={null}
        onCellClick={handleCellClick}
      />

      {/* Таймер лобі — поверх усього */}
      {inLobby && uiSnapshot?.lobbyEndsAt && (
        <LobbyTimer lobbyEndsAt={uiSnapshot.lobbyEndsAt} />
      )}

      {/* Підказка після спавну у лобі */}
      {inLobby && hasSpawnedInLobby && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs text-white/70 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
        >
          Клікніть в інше місце щоб змінити позицію
        </div>
      )}

      <Leaderboard
        uiSnapshot={uiSnapshot}
        playerId={playerId}
        onPlayerClick={handlePlayerClick}
      />

      {/* Кнопка виходу — праворуч зверху */}
      <button
        className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all"
        style={{
          background: "rgba(8,12,20,0.78)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          color: "rgba(255,255,255,0.55)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color =
            "rgba(248,113,113,0.9)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(248,113,113,0.25)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color =
            "rgba(255,255,255,0.55)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(255,255,255,0.08)";
        }}
        onClick={() => setShowLeaveConfirm(true)}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Вийти
      </button>

      {/* Модальне підтвердження виходу */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="flex flex-col gap-5 p-6 rounded-2xl w-72"
            style={{
              background: "rgba(8,12,20,0.95)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-white font-semibold text-base">
                Вийти з кімнати?
              </span>
              <span className="text-white/45 text-sm">
                Ваш прогрес у цій грі буде втрачено.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.65)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.06)";
                }}
                onClick={() => setShowLeaveConfirm(false)}
              >
                Залишитись
              </button>
              <button
                className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "rgba(248,113,113,0.95)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(239,68,68,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(239,68,68,0.15)";
                }}
                onClick={() => navigate("/")}
              >
                Вийти
              </button>
            </div>
          </div>
        </div>
      )}

      <DebugOverlay statsRef={statsRef} />
      <AttackDebugPanel stateRef={stateRef} playerId={playerId} />

      {/* Нижнє меню — тільки в грі */}
      {!inLobby && (
        <BottomActionBar
          selectedBuilding={selectedBuilding}
          onSelectBuilding={setSelectedBuilding}
          activeTabOverride={activeTab}
          onTabClose={() => setActiveTab(null)}
        />
      )}

      {/* Радіальне меню */}
      {radialMenu && (
        <RadialMenu
          x={radialMenu.x}
          y={radialMenu.y}
          onSelect={handleRadialSelect}
          onClose={() => { setRadialMenu(null); pendingTile.current = null; }}
          onAttack={handleRadialAttack}
        />
      )}
      {/* Слайдер тільки в грі, не в лобі */}
      {!inLobby && <TroopSlider value={troopPct} onChange={setTroopPct} />}

      {!connected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-900/90 rounded text-center text-white">
          Зʼєднання...
        </div>
      )}
    </div>
  );
}
