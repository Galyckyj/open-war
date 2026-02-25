import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconSwords,
  IconDeviceFloppy,
  IconLogin,
  IconPlayerPlay,
  IconShoppingBag,
  IconSettings,
} from '@tabler/icons-react';
import { useRoomList } from '../hooks/useRoomList';

function getPlayerId(): string {
  let id = localStorage.getItem('ow_player_id');
  if (!id) {
    id = crypto.randomUUID();
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

export function MainMenu() {
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
    if (!promise) {
      setCreating(false);
      return;
    }
    const roomId = await promise;
    navigate(`/game/${roomId}`);
  };

  const handleJoin = (roomId: string) => {
    saveNickname(nickname);
    navigate(`/game/${roomId}`);
  };

  const navLink =
    'px-3 py-2 rounded-xl text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] flex items-center justify-center sm:min-h-0';

  return (
    <div className="min-h-screen text-white flex flex-col">
      {/* Liquid glass header — закруглений, не на всю ширину */}
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
          {/* Логотип */}
          <a href="/" className="flex items-center gap-2 shrink-0 text-white/95 hover:text-white transition-colors">
            <IconSwords size={28} stroke={1.8} className="shrink-0" />
            <span className="font-semibold text-lg hidden sm:inline">Open War</span>
          </a>

          {/* Центр: Грати, Магазин, Налаштування */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => {}}
              className={`${navLink} bg-white/10 text-white`}
              aria-label="Грати"
            >
              <IconPlayerPlay size={20} className="sm:mr-1.5" />
              <span className="hidden sm:inline">Грати</span>
            </button>
            <button type="button" onClick={() => {}} className={navLink} aria-label="Магазин">
              <IconShoppingBag size={20} className="sm:mr-1.5" />
              <span className="hidden sm:inline">Магазин</span>
            </button>
            <button type="button" onClick={() => {}} className={navLink} aria-label="Налаштування">
              <IconSettings size={20} className="sm:mr-1.5" />
              <span className="hidden sm:inline">Налаштування</span>
            </button>
          </div>

          {/* Право: Увійти */}
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] sm:min-h-0 shrink-0"
            aria-label="Увійти"
          >
            <IconLogin size={20} />
            <span className="hidden sm:inline">Увійти</span>
          </button>
        </nav>
      </header>

      {/* Контент під хедером */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto w-full">
        {error && (
          <p className="text-red-400 text-sm mb-4 text-center" role="alert">
            {error}
          </p>
        )}

        {/* Ряд: нікнейм + кнопка збереження */}
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

        {/* Блок кімнат: створити + список */}
        <section className="w-full rounded-2xl overflow-hidden" style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
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
      </main>
    </div>
  );
}
