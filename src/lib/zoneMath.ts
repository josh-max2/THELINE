// Pure helpers for environmental damage zones. No Phaser.
// Per ADR-003 + Task 5.2.

import type { ModuleCategory, WeaponDamageType } from './types';

/** v0 visual: zone radius is fixed; Phase 5+ may scale per cell. */
export const ZONE_VISUAL_RADIUS = 60;

/**
 * Map a module's category → environmental matrix damage axis. Returns
 * undefined for categories that don't trigger env zones (support, exotic).
 */
export function categoryToDamageType(cat: ModuleCategory): WeaponDamageType | undefined {
  switch (cat) {
    case 'kinetic':
    case 'fire':
    case 'cryo':
    case 'explosive':
    case 'electric':
      return cat;
    default:
      return undefined;
  }
}

/** 0..1 fade ratio: 1 at spawn, 0 at expiry. Linear decay. */
export function fadeAlpha(elapsedSec: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  const remaining = Math.max(0, durationSec - elapsedSec);
  return remaining / durationSec;
}

/** Damage applied this tick from a per-second rate. */
export function tickDamage(damagePerSec: number, deltaSeconds: number): number {
  if (damagePerSec <= 0) return 0;
  return damagePerSec * Math.max(0, deltaSeconds);
}
