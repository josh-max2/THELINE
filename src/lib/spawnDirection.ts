// Pure spawn-side picker. No Phaser, no DOM — testable everywhere.
// Per ADR-001 §Gap 2 amendment + ADR-002: enemies spawn from any direction
// EXCEPT forward (+x). Train is being chased.

export type SpawnSide = 'rear' | 'top' | 'bottom';

/** v1 weights — tunable per encounter type in Phase 4. */
export const SPAWN_WEIGHTS: Record<SpawnSide, number> = {
  rear: 0.5,
  top: 0.25,
  bottom: 0.25,
};

const SIDES: SpawnSide[] = ['rear', 'top', 'bottom'];

/**
 * Weighted-random pick of one of the three legal spawn sides.
 * Caller can inject `rng` for deterministic tests; defaults to Math.random.
 */
export function pickSpawnSide(rng: () => number = Math.random): SpawnSide {
  const r = rng();
  let cumulative = 0;
  for (const side of SIDES) {
    cumulative += SPAWN_WEIGHTS[side];
    if (r < cumulative) return side;
  }
  // Floating-point edge — fallback to most-likely side.
  return 'rear';
}

/**
 * Compute a spawn position offscreen on the chosen side, given screen
 * dimensions and the train's screen anchor. Margins keep enemies from
 * popping in visibly.
 */
export function spawnPositionFor(
  side: SpawnSide,
  screenWidth: number,
  screenHeight: number,
  trainCenterY: number,
  rng: () => number = Math.random,
): { x: number; y: number } {
  const margin = 50;
  switch (side) {
    case 'rear':
      // Behind the train (left side, since train is at left-anchored x≈200).
      return {
        x: -margin,
        y: trainCenterY + (rng() - 0.5) * 320,
      };
    case 'top':
      // Anywhere along the top edge, biased toward where enemies can engage.
      return {
        x: rng() * (screenWidth - 200) + 200,
        y: -margin,
      };
    case 'bottom':
      return {
        x: rng() * (screenWidth - 200) + 200,
        y: screenHeight + margin,
      };
  }
}
