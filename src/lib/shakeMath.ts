// Pure helpers for screen-shake tuning. Per Task 5.5 + Phase 6 juice pass.
//
// Phaser's camera.shake(durationMs, intensity) handles the actual transform.
// We just decide *which* tier a given event uses so the magic numbers live
// in one place + we can cap stacking when many enemies die in the same frame.

/** Tier presets — duration in ms, intensity is fraction-of-canvas. */
export interface ShakePreset {
  durationMs: number;
  intensity: number;
}

// Phase 6 juice bump: roughly +60-70% on kill/explosion/boss tiers, plus a
// new `impact` tier so non-fatal projectile hits get a tactile bump. `hit`
// stays at 0 so flash-only events (beam tick) don't shake every frame.
export const SHAKE_PRESETS = {
  hit: { durationMs: 0, intensity: 0 } satisfies ShakePreset,
  impact: { durationMs: 60, intensity: 0.0015 } satisfies ShakePreset,
  smallKill: { durationMs: 100, intensity: 0.004 } satisfies ShakePreset,
  bigKill: { durationMs: 180, intensity: 0.0085 } satisfies ShakePreset,
  explosion: { durationMs: 280, intensity: 0.013 } satisfies ShakePreset,
  bossKill: { durationMs: 500, intensity: 0.022 } satisfies ShakePreset,
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
