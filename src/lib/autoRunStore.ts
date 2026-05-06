// Cross-scene singleton for the auto-run preference. Mirrors the pattern of
// salvageStore / unlocksStore / loadoutStore / audioStore.
//
// Per Task 5.8: when enabled AND `auto-run` unlock owned, DeathScene
// re-launches RunScene on click instead of returning to Hub.

type Listener = (enabled: boolean) => void;

class AutoRunStore {
  private _enabled = false;
  private readonly listeners = new Set<Listener>();

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(v: boolean): void {
    if (this._enabled === v) return;
    this._enabled = v;
    for (const l of this.listeners) l(v);
  }

  reset(): void {
    if (!this._enabled) return;
    this._enabled = false;
    for (const l of this.listeners) l(false);
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
}

export const autoRunStore = new AutoRunStore();
