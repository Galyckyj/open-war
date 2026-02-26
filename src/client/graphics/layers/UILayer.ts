/**
 * Шар UI поверх карти: нікнейм + кількість військ по центру кожної території.
 *
 * Текст розміщується у центрі НАЙБІЛЬШОЇ суцільної зони гравця (BFS),
 * а не по центроїду всіх клітин — правильно при розбитих/острівних територіях.
 */

import type { Layer, RenderContext } from '../types';

type Bounds = {
  minCol: number; maxCol: number;
  minRow: number; maxRow: number;
  count: number;
  textCol: number; textRow: number;
};

function formatTroops(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.floor(n));
}

export class UILayer implements Layer {
  visible = true;
  private boundsCache = new Map<string, Bounds>();
  private lastTick = -1;

  /**
   * BFS по всіх клітинах — знаходимо найбільшу суцільну зону кожного гравця.
   * Виконується лише при зміні state.tick.
   */
  private rebuildBounds(
    cells: RenderContext['state']['cells'],
    cols: number,
    rows: number,
  ): void {
    this.boundsCache.clear();

    const n = cells.length;
    // -1 = не відвідано; >=0 = індекс компоненти
    const visited = new Int32Array(n).fill(-1);

    interface Component {
      ownerId: string;
      size: number;
      sumCol: number; sumRow: number;
      minCol: number; maxCol: number;
      minRow: number; maxRow: number;
    }

    const components: Component[] = [];
    const queue: number[] = [];

    for (let i = 0; i < n; i++) {
      if (visited[i] !== -1) continue;
      const cell = cells[i];
      if (!cell || cell.terrain !== 'land' || !cell.ownerId) continue;

      const ownerId = cell.ownerId;
      const cmpIdx = components.length;
      const cmp: Component = {
        ownerId,
        size: 0,
        sumCol: 0, sumRow: 0,
        minCol: cols, maxCol: 0,
        minRow: rows, maxRow: 0,
      };
      components.push(cmp);

      let head = 0;
      queue.length = 0;
      queue.push(i);
      visited[i] = cmpIdx;

      while (head < queue.length) {
        const idx = queue[head++]!;
        const col = idx % cols;
        const row = (idx / cols) | 0;

        cmp.size++;
        cmp.sumCol += col;
        cmp.sumRow += row;
        if (col < cmp.minCol) cmp.minCol = col;
        if (col > cmp.maxCol) cmp.maxCol = col;
        if (row < cmp.minRow) cmp.minRow = row;
        if (row > cmp.maxRow) cmp.maxRow = row;

        // 4 сусіди
        if (col > 0)        { const nb = idx - 1;    if (visited[nb] === -1 && cells[nb]?.ownerId === ownerId) { visited[nb] = cmpIdx; queue.push(nb); } }
        if (col < cols - 1) { const nb = idx + 1;    if (visited[nb] === -1 && cells[nb]?.ownerId === ownerId) { visited[nb] = cmpIdx; queue.push(nb); } }
        if (row > 0)        { const nb = idx - cols;  if (visited[nb] === -1 && cells[nb]?.ownerId === ownerId) { visited[nb] = cmpIdx; queue.push(nb); } }
        if (row < rows - 1) { const nb = idx + cols;  if (visited[nb] === -1 && cells[nb]?.ownerId === ownerId) { visited[nb] = cmpIdx; queue.push(nb); } }
      }
    }

    // Для кожного гравця — лишаємо лише найбільшу компоненту
    const bestCmp = new Map<string, { size: number; cmpIdx: number }>();
    for (let ci = 0; ci < components.length; ci++) {
      const cmp = components[ci]!;
      const cur = bestCmp.get(cmp.ownerId);
      if (!cur || cmp.size > cur.size) bestCmp.set(cmp.ownerId, { size: cmp.size, cmpIdx: ci });
    }

    // Snap: найближча клітина компоненти до центроїду зони
    for (const [pid, { cmpIdx }] of bestCmp) {
      const cmp = components[cmpIdx]!;
      const cxT = cmp.sumCol / cmp.size;
      const cyT = cmp.sumRow / cmp.size;
      let bestDist = Infinity;
      let textCol = (cxT | 0);
      let textRow = (cyT | 0);

      for (let row = cmp.minRow; row <= cmp.maxRow; row++) {
        for (let col = cmp.minCol; col <= cmp.maxCol; col++) {
          if (visited[row * cols + col] !== cmpIdx) continue;
          const dr = row - cyT;
          const dc = col - cxT;
          const dist = dr * dr + dc * dc;
          if (dist < bestDist) { bestDist = dist; textCol = col; textRow = row; }
        }
      }

      this.boundsCache.set(pid, {
        minCol: cmp.minCol, maxCol: cmp.maxCol,
        minRow: cmp.minRow, maxRow: cmp.maxRow,
        count: cmp.size,
        textCol, textRow,
      });
    }
  }

  render(ctx: RenderContext): void {
    const { ctx: c, state, playerId, worldWidth, worldHeight, scale } = ctx;
    const cells = state.cells ?? [];
    const { players, cols, rows, tick } = state;
    if (cells.length === 0) return;

    if (tick !== this.lastTick) {
      this.rebuildBounds(cells, cols, rows);
      this.lastTick = tick;
    }

    const cellW = worldWidth / cols;
    const cellH = worldHeight / rows;

    for (const [pid, player] of Object.entries(players)) {
      if (player.score === 0) continue;
      const b = this.boundsCache.get(pid);
      if (!b) continue;

      // Розмір bounding box на екрані — для відсічення дрібних територій
      const terrWScreen = (b.maxCol - b.minCol + 1) * cellW * scale;
      const terrHScreen = (b.maxRow - b.minRow + 1) * cellH * scale;
      const terrScreen = Math.min(terrWScreen, terrHScreen);
      // Не малюємо текст якщо територія дуже маленька на екрані
      if (terrScreen < 18) continue;

      // Найближча власна клітина до центроїду — завжди на реальній частині території
      const cx = (b.textCol + 0.5) * cellW;
      const cy = (b.textRow + 0.5) * cellH;

      const isSelf = pid === playerId;

      // Screen-space розмір: читабельний при будь-якому зумі
      // Росте разом із розміром території, але затиснутий між мін і макс
      const namePxScreen = Math.max(10, Math.min(20, terrScreen * 0.13));
      const troopPxScreen = namePxScreen * 0.78;

      // Конвертуємо в world-units щоб рендерити в трансформованому контексті
      const nameWU = namePxScreen / scale;
      const troopWU = troopPxScreen / scale;

      const name = player.name || 'Гравець';
      const troopLabel = formatTroops(player.troops);
      const gap = nameWU * 0.85; // відступ між рядками

      c.textAlign = 'center';
      c.textBaseline = 'middle';

      // ── Нікнейм (трохи приглушений) ──────────────────────────────────────
      c.save();
      c.globalAlpha = isSelf ? 0.9 : 0.78;
      c.font = `${isSelf ? 'bold ' : ''}${nameWU}px sans-serif`;
      c.fillStyle = isSelf ? '#ffffff' : '#dde3e8';
      c.shadowColor = 'rgba(0,0,0,0.7)';
      c.shadowBlur = nameWU * 0.4;
      c.fillText(name, cx, cy - gap * 0.5);
      c.restore();

      // ── Кількість військ (яскрава, головна) ──────────────────────────────
      if (player.troops >= 1 && terrScreen > 28) {
        c.save();
        c.globalAlpha = isSelf ? 1 : 0.95;
        c.font = `bold ${troopWU}px sans-serif`;
        c.fillStyle = isSelf ? '#fde68a' : '#ffffff';
        c.shadowColor = 'rgba(0,0,0,0.8)';
        c.shadowBlur = troopWU * 0.5;
        c.fillText(troopLabel, cx, cy + gap * 0.7);
        c.restore();
      }
    }
  }
}
