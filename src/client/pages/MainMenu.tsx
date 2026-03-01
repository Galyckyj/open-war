import { useState } from "react";
import { generateUUID } from "../utils/uuid";
import { useNavigate } from "react-router-dom";
import {
  IconSwords,
  IconDeviceFloppy,
  IconLogin,
  IconPlayerPlay,
  IconShoppingBag,
  IconSettings,
  IconVolume,
  IconMusic,
  IconLanguage,
  IconDeviceDesktop,
  IconActivity,
  IconWifi,
  IconLock,
  IconStar,
  IconCrown,
  IconFlame,
  IconPalette,
  IconMap,
  IconSparkles,
  IconUsers,
  IconTrophy,
} from "@tabler/icons-react";
import { useRoomList } from "../hooks/useRoomList";

type Tab = "play" | "shop" | "settings";

// ─── Liquid glass (ідентично BottomActionBar) ─────────────────────────────────

const glass: React.CSSProperties = {
  background: "rgba(15,20,35,0.65)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
};

const glassCard: React.CSSProperties = {
  background: "rgba(8,12,20,0.82)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const glassInner: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function getPlayerId(): string {
  let id = localStorage.getItem("ow_player_id");
  if (!id) { id = generateUUID(); localStorage.setItem("ow_player_id", id); }
  return id;
}
getPlayerId();

function getNickname(): string { return localStorage.getItem("ow_nickname") || ""; }
function saveNickname(nick: string) { localStorage.setItem("ow_nickname", nick); }

function getSetting<T>(key: string, fallback: T): T {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}
function setSetting(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Shop data ────────────────────────────────────────────────────────────────

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "skin" | "map" | "effect" | "bundle";
  icon: React.ReactNode;
  colorFrom: string;
  colorTo: string;
  badge?: string;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "skin-gold",      name: "Золота армія",    description: "Золотий колір для вашої території та кордонів",   price: 500,  category: "skin",   icon: <IconCrown    size={28} stroke={1.5} />, colorFrom: "#f59e0b", colorTo: "#d97706", badge: "Топ" },
  { id: "skin-fire",      name: "Вогняний стиль",  description: "Палаючий ефект для захоплених земель",            price: 750,  category: "effect", icon: <IconFlame    size={28} stroke={1.5} />, colorFrom: "#f97316", colorTo: "#dc2626", badge: "Нове" },
  { id: "map-arctic",     name: "Арктична карта",  description: "Зимова тематика зі снігом та льодом",             price: 400,  category: "map",    icon: <IconMap      size={28} stroke={1.5} />, colorFrom: "#22d3ee", colorTo: "#3b82f6" },
  { id: "skin-neon",      name: "Неоновий набір",  description: "Яскраві кольори в кіберпанк-стилі",              price: 600,  category: "skin",   icon: <IconPalette  size={28} stroke={1.5} />, colorFrom: "#a855f7", colorTo: "#ec4899" },
  { id: "bundle-starter", name: "Стартовий набір", description: "3 скіни + 2 карти за зниженою ціною",            price: 999,  category: "bundle", icon: <IconStar     size={28} stroke={1.5} />, colorFrom: "#10b981", colorTo: "#0d9488", badge: "-30%" },
  { id: "effect-sparkle", name: "Іскри перемоги",  description: "Святковий ефект при захопленні ворожих земель",  price: 350,  category: "effect", icon: <IconSparkles size={28} stroke={1.5} />, colorFrom: "#6366f1", colorTo: "#7c3aed" },
  { id: "map-desert",     name: "Пустельна карта", description: "Піщані дюни та оази в центрі суперництва",       price: 400,  category: "map",    icon: <IconMap      size={28} stroke={1.5} />, colorFrom: "#eab308", colorTo: "#f97316" },
  { id: "bundle-premium", name: "Преміум пакет",   description: "Усі поточні скіни та ефекти",                    price: 2499, category: "bundle", icon: <IconCrown    size={28} stroke={1.5} />, colorFrom: "#f43f5e", colorTo: "#be185d", badge: "🔥" },
];

const CATEGORY_LABELS: Record<ShopItem["category"], string> = {
  skin: "Скіни", map: "Карти", effect: "Ефекти", bundle: "Набори",
};

// ─── Shop section ─────────────────────────────────────────────────────────────

function ShopSection() {
  const [activeCategory, setActiveCategory] = useState<ShopItem["category"] | "all">("all");
  const categories: Array<ShopItem["category"] | "all"> = ["all", "skin", "map", "effect", "bundle"];
  const filtered = activeCategory === "all" ? SHOP_ITEMS : SHOP_ITEMS.filter((i) => i.category === activeCategory);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Заголовок */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Магазин</h1>
          <p className="text-white/45 text-sm mt-0.5">Покращуйте вигляд своєї армії</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={glassCard}>
          <IconStar size={13} className="text-yellow-400" />
          <span className="text-white/80 text-sm font-semibold">0</span>
          <span className="text-white/40 text-xs">монет</span>
        </div>
      </div>

      {/* Фільтри */}
      <div className="flex gap-2 mb-5 flex-wrap p-1.5 rounded-2xl" style={glassCard}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all border ${
              activeCategory === cat
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/35"
                : "text-white/55 hover:text-white/90 border-transparent hover:bg-white/6"
            }`}
          >
            {cat === "all" ? "Усі" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Сітка товарів */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl overflow-hidden flex flex-col group cursor-pointer transition-all duration-200 hover:scale-[1.015]"
            style={{
              ...glassCard,
              boxShadow: `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
          >
            {/* Превʼю */}
            <div
              className="relative h-24 sm:h-32 flex items-center justify-center overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${item.colorFrom}22 0%, ${item.colorTo}33 100%)` }}
            >
              {/* Підсвітка іконки */}
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: `radial-gradient(circle at 50% 60%, ${item.colorFrom} 0%, transparent 70%)` }}
              />
              <div
                className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${item.colorFrom}44, ${item.colorTo}44)`,
                  border: `1px solid ${item.colorFrom}55`,
                  color: item.colorFrom,
                  boxShadow: `0 4px 16px ${item.colorFrom}33`,
                }}
              >
                {item.icon}
              </div>

              {item.badge && (
                <span
                  className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${item.colorFrom}33`, color: item.colorFrom, border: `1px solid ${item.colorFrom}44` }}
                >
                  {item.badge}
                </span>
              )}
              <span className="absolute top-2 left-2 text-[10px] text-white/50 px-2 py-0.5 rounded-full" style={glassInner}>
                {CATEGORY_LABELS[item.category]}
              </span>
            </div>

            {/* Інфо */}
            <div className="p-3 flex flex-col flex-1 gap-2">
              <div>
                <h3 className="font-semibold text-white/95 text-sm leading-tight">{item.name}</h3>
                <p className="text-white/45 text-xs mt-1 leading-snug">{item.description}</p>
              </div>
              <div className="flex items-center justify-between gap-2 mt-auto pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-white/85 font-semibold text-sm flex items-center gap-1">
                  <IconStar size={12} className="text-yellow-400/80" />
                  {item.price}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = `${item.colorFrom}22`;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = `${item.colorFrom}44`;
                    (e.currentTarget as HTMLButtonElement).style.color = item.colorFrom;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
                  }}
                >
                  <IconLock size={11} />
                  Купити
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-white/25 text-xs text-center mt-6">
        Магазин — прототип. Купівля буде доступна після запуску.
      </p>
    </div>
  );
}

// ─── Settings section ─────────────────────────────────────────────────────────

function SettingsSection() {
  const [language,    setLanguage]    = useState(() => getSetting("ow_lang",    "uk"));
  const [sfxVolume,   setSfxVolume]   = useState(() => getSetting("ow_sfx",     80));
  const [musicVolume, setMusicVolume] = useState(() => getSetting("ow_music",   50));
  const [quality,     setQuality]     = useState(() => getSetting("ow_quality", "high"));
  const [showFps,     setShowFps]     = useState(() => getSetting("ow_fps",     false));
  const [showPing,    setShowPing]    = useState(() => getSetting("ow_ping",    true));
  const [saved,       setSaved]       = useState(false);

  const handleSave = () => {
    setSetting("ow_lang",    language);
    setSetting("ow_sfx",     sfxVolume);
    setSetting("ow_music",   musicVolume);
    setSetting("ow_quality", quality);
    setSetting("ow_fps",     showFps);
    setSetting("ow_ping",    showPing);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const secTitle  = "text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-4";
  const rowCls    = "flex items-center justify-between py-3 border-b border-white/5 last:border-0";
  const labelCls  = "flex items-center gap-2.5 text-sm text-white/80";
  const selectCls = "bg-white/5 border border-white/10 text-white/90 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all";

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-all ${checked ? "bg-emerald-500/80" : "bg-white/12"}`}
      style={{ border: `1px solid ${checked ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.08)"}` }}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">Налаштування</h1>
        <p className="text-white/45 text-sm mt-0.5">Персоналізуйте свій досвід гри</p>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl p-5" style={glassCard}>
          <p className={secTitle}>Мова</p>
          <div className={rowCls}>
            <span className={labelCls}><IconLanguage size={17} className="text-white/45" />Мова інтерфейсу</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectCls}>
              <option value="uk">🇺🇦 Українська</option>
              <option value="en">🇬🇧 English</option>
              <option value="pl">🇵🇱 Polski</option>
              <option value="de">🇩🇪 Deutsch</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl p-5" style={glassCard}>
          <p className={secTitle}>Звук</p>
          {[
            { label: "Звукові ефекти", icon: <IconVolume size={17} className="text-white/45" />, val: sfxVolume, set: setSfxVolume },
            { label: "Музика",         icon: <IconMusic  size={17} className="text-white/45" />, val: musicVolume, set: setMusicVolume },
          ].map(({ label, icon, val, set }) => (
            <div key={label} className={rowCls}>
              <span className={labelCls}>{icon}{label}</span>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} value={val} onChange={(e) => set(Number(e.target.value))} className="w-24 accent-emerald-400" />
                <span className="text-white/50 text-sm w-8 text-right tabular-nums">{val}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-5" style={glassCard}>
          <p className={secTitle}>Графіка</p>
          <div className={rowCls}>
            <span className={labelCls}><IconDeviceDesktop size={17} className="text-white/45" />Якість</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value)} className={selectCls}>
              <option value="low">Низька</option>
              <option value="medium">Середня</option>
              <option value="high">Висока</option>
              <option value="ultra">Ультра</option>
            </select>
          </div>
          <div className={rowCls}>
            <span className={labelCls}><IconActivity size={17} className="text-white/45" />Показувати FPS</span>
            <Toggle checked={showFps} onChange={setShowFps} />
          </div>
          <div className={rowCls}>
            <span className={labelCls}><IconWifi size={17} className="text-white/45" />Показувати пінг</span>
            <Toggle checked={showPing} onChange={setShowPing} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all border"
          style={saved
            ? { background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.35)", color: "#6ee7b7" }
            : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.8)" }
          }
        >
          <IconDeviceFloppy size={17} />
          {saved ? "Збережено!" : "Зберегти"}
        </button>
      </div>
    </div>
  );
}

// ─── Play section ─────────────────────────────────────────────────────────────

function PlaySection() {
  const navigate = useNavigate();
  const { rooms, createRoom, error, connected } = useRoomList();
  const [nickname, setNickname] = useState(getNickname);
  const [creating, setCreating] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const handleSaveNickname = () => { saveNickname(nickname); setSaved(true); setTimeout(() => setSaved(false), 1200); };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    saveNickname(nickname);
    try {
      const roomId = await createRoom();
      navigate(`/game/${roomId}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Помилка. Спробуйте ще раз.');
      setCreating(false);
    }
  };

  const handleJoin = (roomId: string) => { saveNickname(nickname); navigate(`/game/${roomId}`); };

  const activeRoom = rooms.find((r) => r.id === selectedRoomId) ?? rooms[0];

  const topPlayers = [
    { name: "ShadowBlade",  score: 9842 },
    { name: "IronWolf",     score: 9100 },
    { name: "StormFire",    score: 8433 },
    { name: "NightRaven_UA",score: 6342 },
    { name: "PhoenixX",     score: 5782 },
  ];

  const btnBase: React.CSSProperties = { ...glassCard, transition: "all 0.15s" };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Статус підключення */}
      <div className="flex items-center gap-2 mb-4">
        {connected ? (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#34d399', boxShadow: '0 0 6px #34d39966' }} />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: '#f87171', boxShadow: '0 0 6px #f8717166' }} />
        )}
        <span className="text-xs" style={{ color: connected ? 'rgba(52,211,153,0.8)' : 'rgba(248,113,113,0.8)' }}>
          {connected ? 'Підключено до сервера' : 'Підключення до сервера...'}
        </span>
      </div>

      {(error || createError) && (
        <p className="text-red-400 text-sm mb-4 text-center rounded-xl px-4 py-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {createError ?? error}
        </p>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Ліва панель — кімнати ── */}
        <div className="lg:col-span-1 rounded-2xl p-4 flex flex-col gap-3" style={glassCard}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">Кімнати</p>
            <span className="text-[10px] text-white/25">{rooms.length} онлайн</span>
          </div>

          <div className="rounded-xl p-2 overflow-auto max-h-48 lg:max-h-none lg:flex-1" style={glassInner}>
            {rooms.length === 0 ? (
              <p className="text-white/35 text-sm p-2">Кімнат ще немає</p>
            ) : (
              <ul className="space-y-1.5">
                {rooms.map((r) => {
                  const sel = selectedRoomId === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedRoomId(r.id)}
                        className="w-full text-left rounded-xl px-3 py-2 transition-all"
                        style={sel
                          ? { background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.28)", color: "#6ee7b7" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }
                        }
                      >
                        <div className="font-medium text-sm truncate">{r.name || r.id}</div>
                        <div className="text-xs opacity-50 flex items-center gap-1 mt-0.5">
                          <IconUsers size={10} />{r.playerCount}/100
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-white/40 text-xs">{activeRoom ? `${activeRoom.playerCount}/100` : "0/100"}</span>
            <button
              type="button"
              onClick={() => activeRoom ? handleJoin(activeRoom.id) : handleCreate()}
              disabled={creating}
              className="px-5 py-1.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.35)", color: "#6ee7b7" }}
            >
              {creating && <span className="w-3 h-3 rounded-full border-2 border-emerald-300/40 border-t-emerald-300 animate-spin" />}
              {creating ? "Підключення..." : "Грати"}
            </button>
          </div>
        </div>

        {/* ── Центр — нікнейм + режими ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Поле нікнейму */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Введіть свій нікнейм"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl text-sm text-white placeholder:text-white/35 focus:outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(52,211,153,0.35)"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.09)"; }}
              aria-label="Нікнейм"
            />
            <button
              type="button"
              onClick={handleSaveNickname}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
              style={btnBase}
              title="Зберегти"
            >
              <IconDeviceFloppy size={18} style={{ color: saved ? "#6ee7b7" : "rgba(255,255,255,0.55)" }} />
            </button>
          </div>

          {/* Кнопки режимів */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { label: "Одиночна гра",     action: handleCreate,                                          disabled: creating },
              { label: "Кооперативна гра", action: () => activeRoom ? handleJoin(activeRoom.id) : handleCreate(), disabled: creating },
            ].map(({ label, action, disabled }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                disabled={disabled}
                className="h-28 sm:h-36 lg:h-40 rounded-2xl text-base sm:text-xl font-semibold transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-2"
                style={btnBase}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(52,211,153,0.1)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(52,211,153,0.25)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#6ee7b7";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(8,12,20,0.82)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)";
                }}
              >
                {creating && (
                  <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                )}
                <span style={{ color: "inherit" }}>{creating ? "Підключення..." : label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Нижній рядок — рейтинг + топ ── */}
        <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
          {[
            { title: "Ваш рейтинг",   text: "Увійдіть для відображення рейтингу",   icon: <IconTrophy size={18} className="text-yellow-400/60" /> },
            { title: "Ігор зіграно",  text: "Увійдіть для відображення статистики", icon: <IconUsers  size={18} className="text-blue-400/60"   /> },
          ].map(({ title, text, icon }) => (
            <div key={title} className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center gap-2 mb-3">
                {icon}
                <span className="text-sm font-semibold text-white/85">{title}</span>
              </div>
              <p className="text-white/40 text-xs leading-snug">{text}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center gap-2 mb-3">
            <IconTrophy size={16} className="text-yellow-400/70" />
            <h3 className="text-sm font-semibold text-white/85">Топ гравці</h3>
          </div>
          <ul className="space-y-1">
            {topPlayers.map((p, idx) => (
              <li
                key={p.name}
                className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
                style={{ background: idx === 0 ? "rgba(251,191,36,0.07)" : "rgba(255,255,255,0.025)" }}
              >
                <span className="flex items-center gap-2.5 text-sm">
                  <span
                    className="text-[11px] font-bold tabular-nums w-5 text-center"
                    style={{ color: idx === 0 ? "#fbbf24" : idx === 1 ? "#94a3b8" : idx === 2 ? "#cd7c4b" : "rgba(255,255,255,0.35)" }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-white/85">{p.name}</span>
                </span>
                <span className="tabular-nums text-sm text-white/55">{p.score.toLocaleString("uk-UA")}</span>
              </li>
            ))}
          </ul>
        </div>

      </section>
    </div>
  );
}

// ─── MainMenu ─────────────────────────────────────────────────────────────────

export function MainMenu() {
  const [tab, setTab] = useState<Tab>("play");

  return (
    <div className="min-h-screen flex flex-col text-white">

      {/* ── Navbar ── */}
      <header className="pt-4 px-4 sm:pt-5 sm:px-6 flex justify-center">
        <nav
          className="w-full max-w-5xl rounded-2xl flex items-center justify-between px-4 py-2.5 sm:px-6"
          style={glass}
        >
          <button
            type="button"
            onClick={() => setTab("play")}
            className="flex items-center gap-2 shrink-0 transition-opacity hover:opacity-80"
          >
            <IconSwords size={24} stroke={1.7} className="text-emerald-400" />
            <span className="font-bold text-base tracking-wide hidden sm:inline text-white/95">OpenWAR</span>
          </button>

          <div className="flex items-center gap-1">
            {(["play", "shop", "settings"] as Tab[]).map((id) => {
              const labels: Record<Tab, string> = { play: "Гра", shop: "Магазин", settings: "Налаштування" };
              const icons:  Record<Tab, React.ReactNode> = {
                play:     <IconPlayerPlay  size={20} className="sm:hidden" />,
                shop:     <IconShoppingBag size={20} className="sm:hidden" />,
                settings: <IconSettings    size={20} className="sm:hidden" />,
              };
              const iconsDesktop: Record<Tab, React.ReactNode> = {
                play:     <IconPlayerPlay  size={15} className="hidden sm:block" />,
                shop:     <IconShoppingBag size={15} className="hidden sm:block" />,
                settings: <IconSettings    size={15} className="hidden sm:block" />,
              };
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-sm font-medium transition-all"
                  style={active
                    ? { background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.28)", color: "#6ee7b7" }
                    : { background: "transparent", border: "1px solid transparent", color: "rgba(255,255,255,0.55)" }
                  }
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)"; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)"; }}
                >
                  {icons[id]}
                  {iconsDesktop[id]}
                  <span className="hidden sm:inline">{labels[id]}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all shrink-0 px-3 py-1.5 sm:px-4"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.95)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
          >
            <IconLogin size={20} className="sm:hidden" />
            <IconLogin size={16} className="hidden sm:block" />
            <span className="hidden sm:inline">Увійти</span>
          </button>
        </nav>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 flex flex-col items-center px-3 py-4 sm:px-6 sm:py-8 w-full">
        {tab === "play"     && <PlaySection />}
        {tab === "shop"     && <ShopSection />}
        {tab === "settings" && <SettingsSection />}
      </main>
    </div>
  );
}
