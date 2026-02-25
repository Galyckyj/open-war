import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGameSocket } from '../hooks/useGameSocket';
import { GameCanvas } from '../components/GameCanvas';
import { Leaderboard } from '../components/Leaderboard';
import { TroopSlider } from '../components/TroopSlider';

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

  const { state, stateRef, connected, sendSpawn, sendAttack } = useGameSocket(playerId, nickname, roomId);

  const handleCellClick = (tile: number) => {
    if (!state || !playerId) return;
    const cell = state.cells[tile];
    // Воду захопити не можна — тільки суша
    if (!cell || cell.terrain !== 'land') return;
    const hasTerritory = state.cells.some((c) => c.ownerId === playerId);
    if (!hasTerritory) {
      sendSpawn(tile);
    } else {
      const me = state.players[playerId];
      const troopsToSend = me ? Math.floor(me.troops * (troopPct / 100)) : undefined;
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
        state={state}
        stateRef={stateRef}
        playerId={playerId}
        selectedCell={null}
        onCellClick={handleCellClick}
      />
      <Leaderboard state={state} playerId={playerId} />
      <TroopSlider value={troopPct} onChange={setTroopPct} />
      {!connected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-900/90 rounded text-center text-white">
          Зʼєднання...
        </div>
      )}
    </div>
  );
}
