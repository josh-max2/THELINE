// Pure crew-buff math. No Phaser. Tested in isolation.
// Per DESIGN §7 + Task 4.4:
//   - Crew on Weapon Car → +50% fire rate (CREW_FIRE_RATE_BUFF)
//   - Crew on Engine → +10% powerGen per crew (CREW_ENGINE_POWER_BUFF_PER)
//   - Crew on damaged car → repair (deferred until cars take damage)

import type { CarType } from './types';
import { CREW_FIRE_RATE_BUFF, CREW_ENGINE_POWER_BUFF_PER } from './types';

/** carIndex → number of crew assigned. Cars not in the map have 0. */
export type CrewCounts = ReadonlyMap<number, number>;

/**
 * Fire-rate multiplier for modules on the given car. Per build plan only
 * Weapon Car-type cars receive the buff. Single +50% buff regardless of
 * how many crew are stacked there (encourages spreading crew across cars).
 */
export function fireRateMultiplier(
  carType: CarType,
  crewOnCar: number,
): number {
  if (carType !== 'weapon') return 1;
  return crewOnCar > 0 ? CREW_FIRE_RATE_BUFF : 1;
}

/**
 * Multiplicative powerGen bonus from crew on the Engine.
 * Linear: +10% per crew, no cap. 4 crew on Engine → ×1.4 generation.
 */
export function enginePowerGenMultiplier(crewOnEngine: number): number {
  return 1 + CREW_ENGINE_POWER_BUFF_PER * Math.max(0, crewOnEngine);
}

/**
 * Validate an assignment: each crew member assigned to at most one car.
 * For v0 we don't cap crew per car; build plan's 4 crew can all stack
 * anywhere (spreading is the player's strategic choice).
 */
export type AssignmentValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateAssignment(
  assignments: ReadonlyMap<number, number | null>, // crewId → carIndex (or null = unassigned)
  totalCrew: number,
): AssignmentValidationResult {
  if (assignments.size > totalCrew) {
    return { ok: false, reason: `Too many crew (${assignments.size} > ${totalCrew})` };
  }
  for (const [crewId, carIndex] of assignments) {
    if (crewId < 0 || crewId >= totalCrew) {
      return { ok: false, reason: `Crew id ${crewId} out of range` };
    }
    if (carIndex !== null && carIndex < 0) {
      return { ok: false, reason: `Invalid car index ${carIndex} for crew ${crewId}` };
    }
  }
  return { ok: true };
}

/** Helper: count crew assigned to a given carIndex. */
export function crewCountAt(
  assignments: ReadonlyMap<number, number | null>,
  carIndex: number,
): number {
  let n = 0;
  for (const ci of assignments.values()) if (ci === carIndex) n++;
  return n;
}
