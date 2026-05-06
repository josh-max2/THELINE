// Pure stat composition. Per ADR-002: turret base stats ⊕ item effects.
// No Phaser. Used by every behavior handler each frame.
//
// Effect-application order is fixed: **all `add` first, then all `multiply`,
// then `set` last**. This is the BoI convention — additive bonuses combine
// freely, multipliers scale the final additive total, and `set` is an absolute
// override (ignores everything previous to it).
//
// Within each pass, items are walked in stack-attach order and an item's
// effects in declaration order. Determinism guarantees the same {base,
// items[]} always produces the same effective stats.

import type { ItemData, ModuleBehaviorData } from './types';

/**
 * Effective stats are a flat key → number|string map. Behavior `kind` is
 * stripped — it identifies the archetype, not a tunable stat.
 */
export type EffectiveStats = Record<string, number | string>;

export function composeStats(
  behavior: ModuleBehaviorData,
  items: ReadonlyArray<ItemData>,
): EffectiveStats {
  // Seed with the behavior's primitive fields (excluding `kind`).
  const stats: EffectiveStats = {};
  for (const [k, v] of Object.entries(behavior)) {
    if (k === 'kind') continue;
    if (typeof v === 'number' || typeof v === 'string') stats[k] = v;
  }

  // Pass 1: additive
  for (const item of items) {
    for (const e of item.effects) {
      if (e.op !== 'add') continue;
      const cur = typeof stats[e.stat] === 'number' ? (stats[e.stat] as number) : 0;
      stats[e.stat] = cur + e.value;
    }
  }
  // Pass 2: multiplicative
  for (const item of items) {
    for (const e of item.effects) {
      if (e.op !== 'multiply') continue;
      const cur = typeof stats[e.stat] === 'number' ? (stats[e.stat] as number) : 0;
      stats[e.stat] = cur * e.value;
    }
  }
  // Pass 3: set (overrides everything before it)
  for (const item of items) {
    for (const e of item.effects) {
      if (e.op !== 'set') continue;
      stats[e.stat] = e.value;
    }
  }

  return stats;
}

/** Read a numeric stat with a fallback. Used by behavior handlers. */
export function getNumStat(stats: EffectiveStats, key: string, fallback: number): number {
  const v = stats[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Read a string stat with a fallback. */
export function getStrStat(stats: EffectiveStats, key: string, fallback: string): string {
  const v = stats[key];
  return typeof v === 'string' ? v : fallback;
}
