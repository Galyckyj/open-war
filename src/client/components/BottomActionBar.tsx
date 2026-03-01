import { useState, useEffect } from "react";
import {
  IconHammer,
  IconChevronsUp,
  IconSwords,
  IconBuildingBank,
  IconX,
  IconAnchor,
  IconBuildingCastle,
  IconWheat,
  IconBolt,
  IconLock,
} from "@tabler/icons-react";
import type { BuildingType } from "../../shared/types";

type TabId = "construction" | "development" | "operations" | "politics" | null;
export type { BuildingType, TabId };

// ─── Liquid glass стилі ───────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: "rgba(15,20,35,0.65)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
};

const glassPanel: React.CSSProperties = {
  background: "rgba(8,12,20,0.92)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
};

// ─── Будівлі ──────────────────────────────────────────────────────────────────

interface BuildingDef {
  id: BuildingType;
  label: string;
  icon: React.ReactNode;
  description: string;
  cost: number;
  available: boolean;
}

const BUILDINGS: BuildingDef[] = [
  {
    id: "port",
    label: "Порт",
    icon: <IconAnchor size={22} stroke={1.6} />,
    description: "Дозволяє атаки через море",
    cost: 150,
    available: true,
  },
  {
    id: "fortress",
    label: "Фортеця",
    icon: <IconBuildingCastle size={22} stroke={1.6} />,
    description: "+100% захист від штурму",
    cost: 200,
    available: true,
  },
  {
    id: "farm",
    label: "Ферма",
    icon: <IconWheat size={22} stroke={1.6} />,
    description: "+3 війська за тік",
    cost: 100,
    available: true,
  },
  {
    id: "barracks",
    label: "Казарми",
    icon: <IconBolt size={22} stroke={1.6} />,
    description: "+40% швидкість атаки",
    cost: 250,
    available: false,
  },
];

function ConstructionPanel({
  selected,
  onSelect,
}: {
  selected: BuildingType | null;
  onSelect: (id: BuildingType | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {BUILDINGS.map((b) => {
        const isSelected = selected === b.id;
        return (
          <button
            key={b.id}
            disabled={!b.available}
            onClick={() => b.available && onSelect(isSelected ? null : b.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150
              ${
                !b.available
                  ? "opacity-30 cursor-not-allowed"
                  : isSelected
                    ? "text-emerald-300"
                    : "text-white/80 hover:text-white cursor-pointer"
              }`}
            style={
              isSelected
                ? {
                    background: "rgba(52,211,153,0.14)",
                    border: "1px solid rgba(52,211,153,0.35)",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }
            }
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {b.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                {b.label}
                {!b.available && (
                  <IconLock size={11} className="text-slate-500" />
                )}
              </div>
              <div className="text-xs text-white/40 mt-0.5">
                {b.description}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                style={{
                  background: isSelected
                    ? "rgba(52,211,153,0.15)"
                    : "rgba(255,255,255,0.06)",
                  color: isSelected
                    ? "rgba(110,231,183,0.9)"
                    : "rgba(255,255,255,0.35)",
                  border: isSelected
                    ? "1px solid rgba(52,211,153,0.2)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                ⚔ {b.cost}
              </span>
              {isSelected && (
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  ✓
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-white/25 text-sm gap-2">
      <span className="text-4xl">🚧</span>
      <span>{label} — незабаром</span>
    </div>
  );
}

// ─── BottomActionBar ──────────────────────────────────────────────────────────

interface BottomActionBarProps {
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (id: BuildingType | null) => void;
  /** Якщо передано — примусово відкриває цю вкладку (з радіального меню) */
  activeTabOverride?: Exclude<TabId, null> | null;
  onTabClose?: () => void;
}

const TABS: {
  id: Exclude<TabId, null>;
  label: string;
  icon: React.ReactNode;
  /** event.code — фізична клавіша, незалежно від розкладки */
  codes: string[];
  /** Відображення в UI */
  keyLabel: string;
}[] = [
  {
    id: "construction",
    label: "Будівництво",
    icon: <IconHammer size={19} stroke={1.8} />,
    codes: ["Digit1", "KeyE"],
    keyLabel: "E",
  },
  {
    id: "development",
    label: "Розвиток",
    icon: <IconChevronsUp size={19} stroke={1.8} />,
    codes: ["Digit2", "KeyF"],
    keyLabel: "F",
  },
  {
    id: "operations",
    label: "Операції",
    icon: <IconSwords size={19} stroke={1.8} />,
    codes: ["Digit3", "KeyR"],
    keyLabel: "R",
  },
  {
    id: "politics",
    label: "Політика",
    icon: <IconBuildingBank size={19} stroke={1.8} />,
    codes: ["Digit4", "KeyT"],
    keyLabel: "T",
  },
];

export function BottomActionBar({
  selectedBuilding,
  onSelectBuilding,
  activeTabOverride,
  onTabClose,
}: BottomActionBarProps) {
  const [activeTab, setActiveTab] = useState<TabId>(null);

  // Якщо прийшов override з радіального меню — відкриваємо вкладку
  useEffect(() => {
    if (activeTabOverride != null) {
      setActiveTab(activeTabOverride);
      if (activeTabOverride !== "construction") onSelectBuilding(null);
    }
  }, [activeTabOverride]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTab = (id: Exclude<TabId, null>) => {
    setActiveTab((prev) => {
      if (prev === id) {
        onSelectBuilding(null);
        onTabClose?.();
        return null;
      }
      if (id !== "construction") onSelectBuilding(null);
      return id;
    });
  };

  // Клавіатурні скорочення
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      for (const tab of TABS) {
        if (tab.codes.includes(e.code)) {
          e.preventDefault();
          toggleTab(tab.id);
          return;
        }
      }
      if (e.key === "Escape") {
        setActiveTab(null);
        onSelectBuilding(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="game-bottom-bar absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-30 flex flex-col items-center sm:items-end gap-2 pointer-events-auto select-none"
    >
      {/* ── Відкрита панель ── */}
      {activeTab && (
        <div className="w-76 rounded-2xl overflow-hidden" style={glassPanel}>
          {/* Відблиск зверху (liquid glass ефект) */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            }}
          />

          {/* Заголовок */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="text-white font-semibold text-sm tracking-wide">
              {TABS.find((t) => t.id === activeTab)?.label}
            </span>
            <button
              onClick={() => {
                setActiveTab(null);
                onSelectBuilding(null);
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <IconX size={14} stroke={2.2} />
            </button>
          </div>

          {/* Вміст */}
          <div className="px-2 py-2">
            {activeTab === "construction" && (
              <ConstructionPanel
                selected={selectedBuilding}
                onSelect={onSelectBuilding}
              />
            )}
            {activeTab === "development" && (
              <PlaceholderPanel label="Розвиток території" />
            )}
            {activeTab === "operations" && (
              <PlaceholderPanel label="Бойові операції" />
            )}
            {activeTab === "politics" && (
              <PlaceholderPanel label="Дипломатія" />
            )}
          </div>
        </div>
      )}

      {/* ── Рядок кнопок ── */}
      <div className="flex items-center gap-1.5 p-2 rounded-2xl" style={glass}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => toggleTab(tab.id)}
              title={`${tab.label} [${tab.keyLabel}]`}
              className="relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-150 cursor-pointer"
              style={
                isActive
                  ? {
                      background: "rgba(52,211,153,0.18)",
                      border: "1px solid rgba(52,211,153,0.45)",
                      boxShadow:
                        "0 0 10px rgba(52,211,153,0.18), inset 0 1px 0 rgba(255,255,255,0.14)",
                      color: "#6ee7b7",
                    }
                  : {
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.65)",
                    }
              }
            >
              {tab.icon}
              {/* Цифра хоткею — знизу справа */}
              <span
                className="absolute bottom-1 right-2 text-[9px] font-bold leading-none"
                style={{
                  color: isActive
                    ? "rgba(110,231,183,0.7)"
                    : "rgba(255,255,255,0.3)",
                }}
              >
                {tab.keyLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
