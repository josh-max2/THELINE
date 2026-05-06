// Pure helpers for audio gain math + SFX descriptors. Per Task 5.6.
//
// No Web Audio access here — these are pure data + functions so they can be
// unit-tested under happy-dom without booting an AudioContext.

/** A single SFX recipe. AudioSystem reads this to drive its oscillators. */
export interface SfxDescriptor {
  /** Oscillator wave shape. */
  type: 'sine' | 'square' | 'triangle' | 'sawtooth';
  /** Starting frequency in Hz. */
  startHz: number;
  /** Optional ending frequency for a linear sweep. */
  endHz?: number;
  /** Duration of the SFX in seconds. */
  durationSec: number;
  /** Peak gain (0..1) before master/mute scaling. */
  peakGain: number;
}

/** SFX library — consumers call `audio.playSfx('fire')` etc. */
export const SFX: Record<string, SfxDescriptor> = {
  fire: { type: 'square', startHz: 220, endHz: 110, durationSec: 0.06, peakGain: 0.18 },
  hit: { type: 'sine', startHz: 480, endHz: 320, durationSec: 0.08, peakGain: 0.22 },
  kill: { type: 'triangle', startHz: 640, endHz: 120, durationSec: 0.16, peakGain: 0.28 },
  depart: { type: 'sine', startHz: 220, endHz: 660, durationSec: 0.28, peakGain: 0.22 },
  purchase: { type: 'triangle', startHz: 330, endHz: 660, durationSec: 0.12, peakGain: 0.22 },
};

export type SfxId = keyof typeof SFX;

/**
 * Final gain = master × peak when not muted; 0 when muted. Master is clamped
 * to [0,1] so a save with bad data can't blow eardrums.
 */
export function effectiveGain(opts: {
  masterVolume: number;
  peakGain: number;
  muted: boolean;
}): number {
  if (opts.muted) return 0;
  const master = Math.max(0, Math.min(1, opts.masterVolume));
  const peak = Math.max(0, Math.min(1, opts.peakGain));
  return master * peak;
}

/** v0 default master volume — moderate so initial play isn't startling. */
export const DEFAULT_MASTER_VOLUME = 0.5;
