/**
 * Мінімальна пріоритетна черга (min-heap).
 * Низький пріоритет = витягується ПЕРШИМ.
 */
export class MinPriorityQueue {
  private heap: Array<{ tile: number; priority: number }> = [];

  enqueue(tile: number, priority: number) {
    this.heap.push({ tile, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  dequeue(): number | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0]!.tile;
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() { return this.heap.length; }
  clear() { this.heap = []; }

  private _bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent]!.priority <= this.heap[i]!.priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i]!, this.heap[parent]!];
      i = parent;
    }
  }

  private _sinkDown(i: number) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l]!.priority < this.heap[smallest]!.priority) smallest = l;
      if (r < n && this.heap[r]!.priority < this.heap[smallest]!.priority) smallest = r;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest]!, this.heap[i]!];
      i = smallest;
    }
  }
}
