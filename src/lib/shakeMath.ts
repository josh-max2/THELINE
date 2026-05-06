// Pure helpers for screen-shake tuning. Per Task 5.5.
//
// Phaser's camera.shake(durationMs, intensity) handles the actual transform.
// We just decide *which* tier a given event uses so the magic numbers live
// in one place + we can cap stacking when many enemies die in the same frame.

/** Tier presets — duration in ms, intensity is fraction-of-canvas. */
export interface ShakePreset {
  durationMs: number;
  intensity: number;
}

export const SHAKE_PRESETS = {
  hit: { durationMs: 0, intensity: 0 } satisfies ShakePreset, // hit flashes don't shake
  smallKill: { durationMs: 80, intensity: 0.0025 } satisfies ShakePreset,
  bigKill: { durationMs: 140, intensity: 0.005 } satisfies ShakePreset,
  explosion: { durationMs: 220, intensity: 0.008 } satisfies ShakePreset,
  bossKill: { durationMs: 420, intensity: 0.014 } satisfies ShakePreset,
} as const;

export type ShakeTier = keyof typeof SHAKE_PRESETS;

/** Pick the preset for a kill event from the enemy's HP class. */
export function shakeTierForKill(opts: { hp: number; isBoss?: boolean }): ShakeTier {
  if (opts.isBoss) return 'bossKill';
  if (opts.hp >= 30) return 'bigKill';
  return 'smallKill';
}

/**
 * Combine two shake intensities — used when multiple shakes overlap on the
 * same frame. We don't sum (a swarm wipe would teleport the camera); we take
 * the louder of (active, requested) and only restart when requested > active.
 */
export function combineShake(active: ShakePreset, requested: ShakePreset): ShakePreset {
  if (requested.intensity <= active.intensity) return active;
  return requested;
}

/** v0 cap so a 100-enemy swarm-kill frame doesn't lock the camera. */
export const MAX_SHAKE_INTENSITY = SHAKE_PRESETS.bossKill.intensity;
