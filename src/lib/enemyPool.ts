// Pure weighted-random enemy picker. Per Task 4.6 — for v0 EnemySpawner uses
// equal-weight selection across regular (non-boss) enemies. Phase 4.7
// (encounter grammar) replaces the pool per-encounter.

export type EnemyPool = ReadonlyMap<string, number>;

/**
 * Pick an enemy id from a weighted pool. Returns undefined if the pool is
 * empty or all weights are zero.
 */
export function pickFromPool(pool: EnemyPool, rng: () => number = Math.random): string | undefined {
  let total = 0;
  for (const w of pool.values()) total += Math.max(0, w);
  if (total <= 0) return undefined;
  const target = rng() * total;
  let cumulative = 0;
  for (const [id, w] of pool) {
    cumulative += Math.max(0, w);
    if (target < cumulative) return id;
  }
  // Floating-point edge fallback — return last entry.
  let last: string | undefined;
  for (const [id] of pool) last = id;
  return last;
}
