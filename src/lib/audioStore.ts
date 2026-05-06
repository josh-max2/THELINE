// Cross-scene singleton holding mute state + master volume. Mirrors
// salvageStore/unlocksStore/loadoutStore. Hub mute toggle writes here;
// AudioSystem subscribes to update its master gain in real time.

import { DEFAULT_MASTER_VOLUME } from './audioMath';

interface AudioState {
  volume: number;
  muted: boolean;
}

type Listener = (state: AudioState) => void;

class AudioStore {
  private _volume = DEFAULT_MASTER_VOLUME;
  private _muted = false;
  private readonly listeners = new Set<Listener>();

  get volume(): number {
    return this._volume;
  }

  get muted(): boolean {
    return this._muted;
  }

  /** Replace state from save data on hub load. */
  setState(s: { volume?: number; muted?: boolean }): void {
    if (typeof s.volume === 'number' && Number.isFinite(s.volume)) {
      this._volume = Math.max(0, Math.min(1, s.volume));
    }
    if (typeof s.muted === 'boolean') {
      this._muted = s.muted;
    }
    this.fire();
  }

  setMuted(muted: boolean): void {
    if (this._muted === muted) return;
    this._muted = muted;
    this.fire();
  }

  setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, v));
    if (clamped === this._volume) return;
    this._volume = clamped;
    this.fire();
  }

  reset(): void {
    this._volume = DEFAULT_MASTER_VOLUME;
    this._muted = false;
    this.fire();
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  private fire(): void {
    const snap: AudioState = { volume: this._volume, muted: this._muted };
    for (const l of this.listeners) l(snap);
  }
}

export const audioStore = new AudioStore();
