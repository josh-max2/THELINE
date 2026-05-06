// Pure constants + helpers for the slow-time system.
// Per DESIGN §7 — Bastion-style slow, NOT full pause. Hold space → 25% time.

export const NORMAL_TIME_SCALE = 1.0;
export const SLOW_TIME_SCALE = 0.25;

/** Time scale to apply given spacebar-held state. */
export function timeScaleFor(slowed: boolean): number {
  return slowed ? SLOW_TIME_SCALE : NORMAL_TIME_SCALE;
}

/** Smoothly approach a target alpha for the slow-time tint overlay. */
export function lerpAlpha(current: number, target: number, factor: number): number {
  return current + (target - current) * Math.max(0, Math.min(1, factor));
}
