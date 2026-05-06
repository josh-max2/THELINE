// Pure encounter pacing helpers. No Phaser. Per DESIGN §9 + build plan Task 4.7:
// pacing target ~50% travel / 25% swarm / 15% mini-boss / 10% boss.
//
// v0 ships a fixed cyclic schedule: [travel, swarm, travel, mini-boss, travel, boss],
// repeating. With v0 durations (30s / 20s / 30s / 25s / 30s / 60s = 195s/cycle),
// the breakdown is ~46% travel / 10% swarm / 13% mini-boss / 31% boss — boss-heavy
// because v0 boss is 60s. Phase 5 balance pass tunes durations.

import type { EncounterKind } from './types';

/** Default v0 schedule; Phase 4.X may load this from save data per Charter. */
export const DEFAULT_SCHEDULE: ReadonlyArray<EncounterKind> = [
  'travel',
  'swarm',
  'travel',
  'mini-boss',
  'travel',
  'boss',
];

export interface ScheduleSlot {
  index: number;
  kind: EncounterKind;
}

/** Given a tick index (cycle position), return the active encounter slot. */
export function slotAt(
  schedule: ReadonlyArray<EncounterKind>,
  index: number,
): ScheduleSlot {
  if (schedule.length === 0) {
    throw new Error('Schedule must contain at least one encounter');
  }
  // Modulo with negative-safe wrap.
  const idx = ((index % schedule.length) + schedule.length) % schedule.length;
  return { index: idx, kind: schedule[idx] };
}

/** Estimate the % of time spent in each kind over one full cycle. */
export function pacingBreakdown(
  schedule: ReadonlyArray<EncounterKind>,
  durations: Record<EncounterKind, number>,
): Record<EncounterKind, number> {
  let total = 0;
  const sums: Record<EncounterKind, number> = {
    travel: 0,
    swarm: 0,
    'mini-boss': 0,
    boss: 0,
  };
  for (const kind of schedule) {
    const d = durations[kind];
    sums[kind] += d;
    total += d;
  }
  if (total === 0) return sums;
  return {
    travel: sums.travel / total,
    swarm: sums.swarm / total,
    'mini-boss': sums['mini-boss'] / total,
    boss: sums.boss / total,
  };
}
