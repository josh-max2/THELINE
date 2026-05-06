// Pure validators for train layout rules. No Phaser imports — testable in any env.
// Per ADR-001 §Gap 4 + DESIGN §4 v1 layout rules.

import type { CarType } from './types';

export const TRAIN_MAX_LENGTH_V1 = 8;

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Decide whether `next` can be appended to a train with the given `existing` cars.
 *
 * Rules (v1, per ADR-001 §Gap 4):
 *   - First car must be the Engine.
 *   - Only one Engine allowed.
 *   - Train length capped at TRAIN_MAX_LENGTH_V1 cars.
 *
 * Type-existence (e.g. unknown CarType at runtime) is handled by the caller
 * since it requires the runtime car-data registry.
 */
export function canAddCar(
  existing: ReadonlyArray<{ type: CarType }>,
  next: CarType,
  maxLength: number = TRAIN_MAX_LENGTH_V1,
): ValidationResult {
  if (existing.length === 0 && next !== 'engine') {
    return { ok: false, reason: 'First car must be the Engine (ADR-001 Gap 4).' };
  }
  if (next === 'engine' && existing.some((c) => c.type === 'engine')) {
    return { ok: false, reason: 'Only one Engine allowed in v1 (ADR-001 Gap 4).' };
  }
  if (existing.length >= maxLength) {
    return { ok: false, reason: `v1 train length capped at ${maxLength} cars (DESIGN §4).` };
  }
  return { ok: true };
}
