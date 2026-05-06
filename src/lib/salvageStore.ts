// Tiny observable store for the Salvage counter. No Zustand for v0 — we have
// exactly one piece of state and a couple of listeners. Phase 4 may migrate
// to Zustand if state surface grows enough to justify the dep.

type Listener = (total: number) => void;

class SalvageStore {
  private _total = 0;
  private readonly listeners = new Set<Listener>();

  get total(): number {
    return this._total;
  }

  add(amount: number): void {
    if (amount <= 0) return;
    this._total += amount;
    for (const l of this.listeners) l(this._total);
  }

  /** Set the total directly — used by SaveSystem to restore on load.
   * Fires one listener notification (vs. reset() + add() which fires twice). */
  setTotal(value: number): void {
    if (value === this._total) return;
    this._total = value;
    for (const l of this.listeners) l(this._total);
  }

  reset(): void {
    this._total = 0;
    for (const l of this.listeners) l(0);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Singleton; one Salvage counter per running game. */
export const salvageStore = new SalvageStore();
