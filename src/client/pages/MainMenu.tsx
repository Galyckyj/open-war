import { useState } from 'react';
import { generateUUID } from '../utils/uuid';
import { useNavigate } from 'react-router-dom';
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
} from '@tabler/icons-react';
import { useRoomList } from '../hooks/useRoomList';

type Tab = 'play' | 'shop' | 'settings';

function getPlayerId(): string {
  let id = localStorage.getItem('ow_player_id');
  if (!id) {
    id = generateUUID();
    localStorage.setItem('ow_player_id', id);
  }
  return id;
}

function getNickname(): string {
  return localStorage.getItem('ow_nickname') || '';
}

function saveNickname(nick: string) {
  localStorage.setItem('ow_nickname', nick);
}

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
  category: 'skin' | 'map' | 'effect' | 'bundle';
  icon: React.ReactNode;
  gradient: string;
  badge?: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'skin-gold',
    name: 'Золота армія',
    description: 'Золотий колір для вашої території та кордонів',
    price: 500,
    category: 'skin',
    icon: <IconCrown size={36} />,
    gradient: 'from-yellow-500 to-amber-600',
    badge: 'Топ продаж',
  },
  {
    id: 'skin-fire',
    name: 'Вогняний стиль',
    description: 'Палаючий ефект для захоплених земель',
    price: 750,
    category: 'effect',
    icon: <IconFlame size={36} />,
    gradient: 'from-orange-500 to-red-600',
    badge: 'Новинка',
  },
  {
    id: 'map-arctic',
    name: 'Арктична карта',
    description: 'Зимова тематика зі снігом та льодом',
    price: 400,
    category: 'map',
    icon: <IconMap size={36} />,
    gradient: 'from-cyan-400 to-blue-600',
  },
  {
    id: 'skin-neon',
    name: 'Неоновий набір',
    description: 'Яскраві кольори в кіберпанк-стилі',
    price: 600,
    category: 'skin',
    icon: <IconPalette size={36} />,
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 'bundle-starter',
    name: 'Стартовий набір',
    description: '3 скіни + 2 карти за зниженою ціною',
    price: 999,
    category: 'bundle',
    icon: <IconStar size={36} />,
    gradient: 'from-emerald-500 to-teal-600',
    badge: '-30%',
  },
  {
    id: 'effect-sparkle',
    name: 'Іскри перемоги',
    description: 'Святковий ефект при захопленні ворожих земель',
    price: 350,
    category: 'effect',
    icon: <IconSparkles size={36} />,
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    id: 'map-desert',
    name: 'Пустельна карта',
    description: 'Піщані дюни та оази в центрі суперництва',
    price: 400,
    category: 'map',
    icon: <IconMap size={36} />,
    gradient: 'from-yellow-600 to-orange-500',
  },
  {
    id: 'bundle-premium',
    name: 'Преміум пакет',
    description: 'Усі поточні скіни та ефекти',
    price: 2499,
    category: 'bundle',
    icon: <IconCrown size={36} />,
    gradient: 'from-rose-500 to-pink-700',
    badge: 'Найкраща ціна',
  },
];

const CATEGORY_LABELS: Record<ShopItem['category'], string> = {
  skin: 'Скіни',
  map: 'Карти',
  effect: 'Ефекти',
  bundle: 'Набори',
};

// ─── Shop section ─────────────────────────────────────────────────────────────

function ShopSection() {
  const [activeCategory, setActiveCategory] = useState<ShopItem['category'] | 'all'>('all');
  const categories: Array<ShopItem['category'] | 'all'> = ['all', 'skin', 'map', 'effect', 'bundle'];

  const filtered = activeCategory === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter((i) => i.category === activeCategory);

  const glassCard = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Магазин</h1>
        <p className="text-white/50 text-sm">Покращуйте вигляд своєї армії</p>
      </div>

      {/* Фільтр категорій */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-white/20 text-white border border-white/30'
                : 'text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            {cat === 'all' ? 'Усі' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Сітка товарів */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl overflow-hidden flex flex-col group hover:scale-[1.02] transition-transform duration-200"
            style={glassCard}
          >
            {/* Превʼю */}
            <div className={`relative h-36 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
              <div className="text-white/90 drop-shadow-lg">{item.icon}</div>
              {item.badge && (
                <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wide bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full border border-white/20">
                  {item.badge}
                </span>
              )}
              <span className="absolute top-2 left-2 text-[10px] text-white/60 bg-black/30 px-2 py-0.5 rounded-full">
                {CATEGORY_LABELS[item.category]}
              </span>
            </div>
            {/* Інфо */}
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-semibold text-white text-sm mb-1">{item.name}</h3>
              <p className="text-white/50 text-xs mb-4 flex-1">{item.description}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-white font-bold text-sm flex items-center gap-1">
                  <IconStar size={14} className="text-yellow-400" />
                  {item.price}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 hover:text-white text-xs font-medium transition-colors"
                >
                  <IconLock size={12} />
                  Купити
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-white/30 text-xs text-center mt-8">
        Магазин — прототип. Купівля буде доступна після запуску.
      </p>
    </div>
  );
}

// ─── Settings section ─────────────────────────────────────────────────────────

function SettingsSection() {
  const [language, setLanguage] = useState(() => getSetting('ow_lang', 'uk'));
  const [sfxVolume, setSfxVolume] = useState(() => getSetting('ow_sfx', 80));
  const [musicVolume, setMusicVolume] = useState(() => getSetting('ow_music', 50));
  const [quality, setQuality] = useState(() => getSetting('ow_quality', 'high'));
  const [showFps, setShowFps] = useState(() => getSetting('ow_fps', false));
  const [showPing, setShowPing] = useState(() => getSetting('ow_ping', true));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSetting('ow_lang', language);
    setSetting('ow_sfx', sfxVolume);
    setSetting('ow_music', musicVolume);
    setSetting('ow_quality', quality);
    setSetting('ow_fps', showFps);
    setSetting('ow_ping', showPing);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const glass = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
  };

  const sectionTitle = 'text-xs font-semibold text-white/40 uppercase tracking-widest mb-4';
  const rowClass = 'flex items-center justify-between py-3 border-b border-white/5 last:border-0';
  const labelClass = 'flex items-center gap-2.5 text-sm text-white/85';
  const inputBase = 'bg-white/5 border border-white/10 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all';

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-white/15'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Налаштування</h1>
        <p className="text-white/50 text-sm">Персоналізуйте свій досвід гри</p>
      </div>

      <div className="space-y-4">
        {/* Мова і регіон */}
        <div className="rounded-2xl p-5" style={glass}>
          <p className={sectionTitle}>Мова і регіон</p>
          <div className={rowClass}>
            <span className={labelClass}><IconLanguage size={18} className="text-white/50" />Мова інтерфейсу</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`${inputBase} px-3 py-2 appearance-none pr-8`}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23ffffff60' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
            >
              <option value="uk">🇺🇦 Українська</option>
              <option value="en">🇬🇧 English</option>
              <option value="pl">🇵🇱 Polski</option>
              <option value="de">🇩🇪 Deutsch</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="es">🇪🇸 Español</option>
            </select>
          </div>
        </div>

        {/* Звук */}
        <div className="rounded-2xl p-5" style={glass}>
          <p className={sectionTitle}>Звук</p>
          <div className={rowClass}>
            <span className={labelClass}><IconVolume size={18} className="text-white/50" />Звукові ефекти</span>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} value={sfxVolume}
                onChange={(e) => setSfxVolume(Number(e.target.value))}
                className="w-28 accent-emerald-400"
              />
              <span className="text-white/60 text-sm w-8 text-right">{sfxVolume}%</span>
            </div>
          </div>
          <div className={rowClass}>
            <span className={labelClass}><IconMusic size={18} className="text-white/50" />Музика</span>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} value={musicVolume}
                onChange={(e) => setMusicVolume(Number(e.target.value))}
                className="w-28 accent-emerald-400"
              />
              <span className="text-white/60 text-sm w-8 text-right">{musicVolume}%</span>
            </div>
          </div>
        </div>

        {/* Графіка */}
        <div className="rounded-2xl p-5" style={glass}>
          <p className={sectionTitle}>Графіка</p>
          <div className={rowClass}>
            <span className={labelClass}><IconDeviceDesktop size={18} className="text-white/50" />Якість графіки</span>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className={`${inputBase} px-3 py-2`}
            >
              <option value="low">Низька</option>
              <option value="medium">Середня</option>
              <option value="high">Висока</option>
              <option value="ultra">Ультра</option>
            </select>
          </div>
          <div className={rowClass}>
            <span className={labelClass}><IconActivity size={18} className="text-white/50" />Показувати FPS</span>
            <Toggle checked={showFps} onChange={setShowFps} />
          </div>
          <div className={rowClass}>
            <span className={labelClass}><IconWifi size={18} className="text-white/50" />Показувати пінг</span>
            <Toggle checked={showPing} onChange={setShowPing} />
          </div>
        </div>
      </div>

      {/* Кнопка збереження */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
          }`}
        >
          <IconDeviceFloppy size={18} />
          {saved ? 'Збережено!' : 'Зберегти'}
        </button>
      </div>
    </div>
  );
}

// ─── Play section (існуючий контент) ─────────────────────────────────────────

function PlaySection() {
  const navigate = useNavigate();
  const { rooms, createRoom, error } = useRoomList();
  const [nickname, setNickname] = useState(getNickname);
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveNickname = () => {
    saveNickname(nickname);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const handleCreate = async () => {
    setCreating(true);
    saveNickname(nickname);
    const promise = createRoom(roomName);
    if (!promise) { setCreating(false); return; }
    const roomId = await promise;
    navigate(`/game/${roomId}`);
  };

  const handleJoin = (roomId: string) => {
    saveNickname(nickname);
    navigate(`/game/${roomId}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {error && (
        <p className="text-red-400 text-sm mb-4 text-center" role="alert">{error}</p>
      )}

      <div className="flex gap-2 w-full mb-4">
        <input
          type="text"
          placeholder="Нікнейм"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="flex-1 min-h-[48px] sm:min-h-[44px] px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
          aria-label="Нікнейм"
        />
        <button
          type="button"
          onClick={handleSaveNickname}
          className="shrink-0 w-12 h-12 sm:w-[44px] sm:h-[44px] rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 hover:text-white transition-colors"
          aria-label="Зберегти нікнейм"
          title="Зберегти"
        >
          <IconDeviceFloppy size={22} className={saved ? 'text-emerald-400' : ''} />
        </button>
      </div>

      <section
        className="w-full rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Назва кімнати"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="flex-1 min-h-[48px] sm:min-h-[44px] px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              aria-label="Назва кімнати"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="min-h-[48px] sm:min-h-[44px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition-colors"
            >
              {creating ? '...' : 'Створити кімнату'}
            </button>
          </div>
        </div>
        <div className="p-4">
          <h2 className="text-sm font-medium text-white/70 mb-3">Кімнати для підключення</h2>
          {rooms.length === 0 ? (
            <p className="text-white/40 text-sm py-4">Немає доступних кімнат. Створіть нову.</p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-white/95 truncate block">{r.name || r.id}</span>
                    <span className="text-xs text-white/50">{r.playerCount} грав.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoin(r.id)}
                    className="min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 hover:text-white text-sm font-medium transition-colors shrink-0"
                  >
                    Увійти
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── MainMenu ─────────────────────────────────────────────────────────────────

export function MainMenu() {
  const [tab, setTab] = useState<Tab>('play');

  const navItem = (id: Tab, icon: React.ReactNode, label: string) => {
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] sm:min-h-0 ${
          active
            ? 'bg-white/15 text-white border border-white/20'
            : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
        }`}
        aria-current={active ? 'page' : undefined}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen text-white flex flex-col">
      {/* Header */}
      <header className="pt-4 px-4 sm:pt-6 sm:px-6 flex justify-center">
        <nav
          className="w-full max-w-4xl rounded-2xl flex items-center justify-between gap-2 sm:gap-4 px-4 py-3 sm:px-6 sm:py-3"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <button
            type="button"
            onClick={() => setTab('play')}
            className="flex items-center gap-2 shrink-0 text-white/95 hover:text-white transition-colors"
          >
            <IconSwords size={28} stroke={1.8} className="shrink-0" />
            <span className="font-semibold text-lg hidden sm:inline">Open War</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            {navItem('play', <IconPlayerPlay size={18} />, 'Грати')}
            {navItem('shop', <IconShoppingBag size={18} />, 'Магазин')}
            {navItem('settings', <IconSettings size={18} />, 'Налаштування')}
          </div>

          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] sm:min-h-0 shrink-0"
          >
            <IconLogin size={20} />
            <span className="hidden sm:inline">Увійти</span>
          </button>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 sm:px-6 sm:py-8 w-full">
        {tab === 'play' && <PlaySection />}
        {tab === 'shop' && <ShopSection />}
        {tab === 'settings' && <SettingsSection />}
      </main>
    </div>
  );
}
