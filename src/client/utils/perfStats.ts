/**
 * Глобальний singleton для профілювання продуктивності.
 * Всі модулі пишуть сюди, DebugOverlay читає для відображення.
 * Zero-cost коли overlay прихований (значення просто перезаписуються).
 */
export const perfStats = {
  // TerritoryLayer — оновлюється щотіку коли є зміни
  tilesPainted: 0,       // кількість тайлів перемальовано
  deltaCount: 0,         // кількість змінених клітин від сервера
  paintTileMs: 0,        // час на paintTile loop (imageData update)
  gpuCmdMs: 0,           // час на clearRect+fillRect (GPU commands)
  putImageMs: 0,         // час на putImageData (тільки full redraw)
  drawImageMs: 0,        // час на drawImage (кожен кадр)
  fullRedrawCount: 0,    // кількість повних перемальовок (має бути ~1 на старті)

  // GameRenderer — загальний час кадру рендеру
  renderMs: 0,

  // WebSocket — оновлюється при кожному tick-повідомленні
  wsDeltaSize: 0,        // кількість клітин у delta
  wsProcessMs: 0,        // час обробки WS-повідомлення (JSON.parse + state update)
};
