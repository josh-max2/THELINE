// Pure spatial / targeting math. No Phaser. No CombatSystem coupling — accepts
// any read-only array of objects with x/y/hp fields. Used by CombatSystem
// (live enemies) and behavior handlers (target picking).
//
// O(n) linear scan is fine through Phase 4 (≤50 enemies typical).
// Phase 5 bullet-hell density (200+) needs spatial partitioning — flagged
// in REVIEW_NOTES.md Phase 3 audit, perf NIT.

export interface Targetable {
  x: number;
  y: number;
  hp: number;
}

/**
 * Closest of `items` to (x, y), optionally bounded by maxRange. Returns
 * undefined if no item is within range. Ties broken by iteration order.
 *
 * Uses squared distances to avoid Math.sqrt in the hot loop.
 */
export function closestTarget<T extends Targetable>(
  items: ReadonlyArray<T>,
  x: number,
  y: number,
  maxRange?: number,
): T | undefined {
  let best: T | undefined;
  let bestSq = maxRange == null ? Infinity : maxRange * maxRange;
  for (const it of items) {
    const dx = it.x - x;
    const dy = it.y - y;
    const dsq = dx * dx + dy * dy;
    if (dsq < bestSq) {
      bestSq = dsq;
      best = it;
    }
  }
  return best;
}

/** All `items` within `radius` of (x, y). Empty array if none. */
export function targetsInRadius<T extends Targetable>(
  items: ReadonlyArray<T>,
  x: number,
  y: number,
  radius: number,
): T[] {
  const r2 = radius * radius;
  const out: T[] = [];
  for (const it of items) {
    const dx = it.x - x;
    const dy = it.y - y;
    if (dx * dx + dy * dy <= r2) out.push(it);
  }
  return out;
}

/** Squared distance — handy when only relative magnitude matters. */
export function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}
