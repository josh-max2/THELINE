// Pure boss-phase resolution. No Phaser. Per build plan Task 4.6:
// "boss has 3 phases with different attack patterns."
//
// `phases` is sorted *high to low* by `hpRatio`: the first entry with
// `hpRatio <= currentRatio` is the active phase. (Stored high-to-low is the
// natural ordering of "the boss starts here, transitions down through each.")

import type { BossPhaseSpec } from './types';

/**
 * Index of the currently-active phase. Returns 0 if the array is empty (so
 * callers always have a valid index, but should validate non-emptiness).
 */
export function currentPhaseIndex(phases: ReadonlyArray<BossPhaseSpec>, hpRatio: number): number {
  if (phases.length === 0) return 0;
  for (let i = 0; i < phases.length; i++) {
    if (hpRatio >= phases[i].hpRatio) return i;
  }
  return phases.length - 1;
}

/** Convenience: read the active phase spec (or undefined if empty). */
export function currentPhase(
  phases: ReadonlyArray<BossPhaseSpec>,
  hpRatio: number,
): BossPhaseSpec | undefined {
  return phases[currentPhaseIndex(phases, hpRatio)];
}
