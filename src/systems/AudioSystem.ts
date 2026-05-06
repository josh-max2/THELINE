// Web-Audio-driven SFX synth. Per Task 5.6.
//
// Uses oscillator + gain envelope per SFX rather than loaded audio files —
// keeps the bundle small and avoids asset pipeline work for v0. Phase 6 may
// swap in pre-rendered audio if the synthesized sound feels too retro.
//
// AudioContext starts suspended in modern browsers until a user gesture; the
// HubScene DEPART click triggers `resume()`. If not resumed, `playSfx` is a
// no-op (browsers silently drop scheduled sounds in suspended contexts).

import { SFX, effectiveGain, type SfxId } from '../lib/audioMath';
import { audioStore } from '../lib/audioStore';

export class AudioSystem {
  private ctx?: AudioContext;
  private master?: GainNode;
  private resumed = false;

  /** Lazily create the AudioContext. Done on first sound to keep boot light. */
  private ensureContext(): { ctx: AudioContext; master: GainNode } | undefined {
    if (this.ctx && this.master) return { ctx: this.ctx, master: this.master };
    // Older Safari uses webkitAudioContext.
    type AudioCtx = typeof AudioContext;
    const w = globalThis as unknown as { AudioContext?: AudioCtx; webkitAudioContext?: AudioCtx };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return undefined;
    try {
      this.ctx = new Ctor();
    } catch {
      return undefined;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = audioStore.muted ? 0 : audioStore.volume;
    this.master.connect(this.ctx.destination);
    audioStore.subscribe(({ volume, muted }) => {
      if (this.master) this.master.gain.value = muted ? 0 : volume;
    });
    return { ctx: this.ctx, master: this.master };
  }

  /** Call from a user-gesture handler (e.g., DEPART click) to unlock audio. */
  async resumeOnGesture(): Promise<void> {
    if (this.resumed) return;
    const ensured = this.ensureContext();
    if (!ensured) return;
    if (ensured.ctx.state === 'suspended') {
      try {
        await ensured.ctx.resume();
      } catch {
        // Some browsers reject resume outside a gesture — try again later.
        return;
      }
    }
    this.resumed = true;
  }

  playSfx(id: SfxId): void {
    const desc = SFX[id];
    if (!desc) return;
    const ensured = this.ensureContext();
    if (!ensured) return;
    if (ensured.ctx.state !== 'running') return; // not yet unlocked

    const { ctx, master } = ensured;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = desc.type;
    osc.frequency.setValueAtTime(desc.startHz, now);
    if (typeof desc.endHz === 'number') {
      osc.frequency.linearRampToValueAtTime(desc.endHz, now + desc.durationSec);
    }
    const env = ctx.createGain();
    const peak = effectiveGain({
      masterVolume: 1, // master node owns the volume; per-sfx envelope owns the peak shape
      peakGain: desc.peakGain,
      muted: false,
    });
    // ADSR-ish — instant attack, exponential decay to a non-zero floor (Web
    // Audio doesn't allow ramps to literal 0 from non-zero).
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, now + desc.durationSec);
    osc.connect(env);
    env.connect(master);
    osc.start(now);
    osc.stop(now + desc.durationSec + 0.05);
  }

  destroy(): void {
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = undefined;
      this.master = undefined;
    }
  }
}

/**
 * Singleton — Web Audio constraints + lazy ctx mean we want exactly one
 * instance across all scenes. Both HubScene and RunScene import this and
 * share state via audioStore (which AudioSystem subscribes to internally).
 */
export const audioSystem = new AudioSystem();
