import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGameSocket } from '../hooks/useGameSocket';
import { GameCanvas } from '../components/GameCanvas';
import { Leaderboard } from '../components/Leaderboard';
import { TroopSlider } from '../components/TroopSlider';
import { DebugOverlay } from '../components/DebugOverlay';

function getPlayerId(): string {
  let id = localStorage.getItem('ow_player_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('ow_player_id', id);
  }
  return id;
}

function getNickname(): string {
  return localStorage.getItem('ow_nickname') || 'Гравець';
}

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const playerId = getPlayerId();
  const nickname = getNickname();
  const [troopPct, setTroopPct] = useState(40);

  const { stateRef, statsRef, uiSnapshot, connected, sendSpawn, sendAttack } = useGameSocket(playerId, nickname, roomId);

  const handleCellClick = (tile: number) => {
    const st = stateRef.current;
    if (!st || !playerId) return;
    const cell = st.cells[tile];
    // Вода непрохідна (як стіна) — клік по воді ігноруємо
    if (!cell || cell.terrain !== 'land') return;
    const hasTerritory = st.cells.some((c) => c.ownerId === playerId);
    if (!hasTerritory) {
      sendSpawn(tile);
    } else {
      const me = st.players[playerId];
      const troopsToSend = me ? Math.floor(me.troops * (troopPct / 100)) : undefined;
      // Атакуємо лише по суші (дубль-перевірка, основна — terrain !== 'land' вище)
      if (cell.terrain !== 'land') return;
      if (cell.ownerId === null) {
        sendAttack(null, troopsToSend);
      } else if (cell.ownerId !== playerId) {
        sendAttack(cell.ownerId, troopsToSend);
      }
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <GameCanvas
        stateRef={stateRef}
        playerId={playerId}
        selectedCell={null}
        onCellClick={handleCellClick}
      />
      <Leaderboard uiSnapshot={uiSnapshot} playerId={playerId} />
      <DebugOverlay statsRef={statsRef} />
      <TroopSlider value={troopPct} onChange={setTroopPct} />
      {!connected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-900/90 rounded text-center text-white">
          Зʼєднання...
        </div>
      )}
    </div>
  );
}
