// Pure power-distribution math. No Phaser. No system coupling.
// Per build plan Task 4.3 + DESIGN §7. v0 model:
//
//   - Each non-engine, non-cargo car has a "weight" (0..10) the player controls.
//   - Total engine output is split proportionally to weights.
//   - Each car's modules contribute to its `demand`.
//   - Efficiency = clamp(supply / demand, 0, 1). Demand 0 → efficiency 1.

export interface PowerInputs {
  /** Total power per second produced by the train (sum of all powerGens). */
  generation: number;
  /** carIndex → 0..MAX_WEIGHT, set by player via slider. */
  weights: ReadonlyMap<number, number>;
  /** carIndex → power demand (sum of attached modules' `power`). */
  demands: ReadonlyMap<number, number>;
}

export interface PowerAllocation {
  carIndex: number;
  weight: number;
  share: number;     // 0..1, normalized fraction of total weights
  supply: number;    // share * generation
  demand: number;
  efficiency: number; // 0..1
}

export const MAX_POWER_WEIGHT = 10;

/**
 * Compute per-car allocation given weights, demands, and total generation.
 * Returns one entry per (weighted-or-demanding) car, in carIndex order.
 *
 * Cars with weight=0 still appear in output (for UI completeness) with
 * supply=0, efficiency=0 (unless demand=0 in which case efficiency=1 — they
 * don't need power so they're fine).
 */
export function computeAllocations(input: PowerInputs): PowerAllocation[] {
  const totalWeight = sumValues(input.weights);

  // Union of carIndices appearing in either map, deduped.
  const indices = new Set<number>();
  for (const i of input.weights.keys()) indices.add(i);
  for (const i of input.demands.keys()) indices.add(i);
  const sortedIndices = Array.from(indices).sort((a, b) => a - b);

  const out: PowerAllocation[] = [];
  for (const carIndex of sortedIndices) {
    const weight = input.weights.get(carIndex) ?? 0;
    const demand = input.demands.get(carIndex) ?? 0;
    const share = totalWeight > 0 ? weight / totalWeight : 0;
    const supply = share * input.generation;
    out.push({ carIndex, weight, share, supply, demand, efficiency: efficiency(supply, demand) });
  }
  return out;
}

/** clamp(supply / demand, 0, 1); demand 0 → 1 (nothing to power). */
export function efficiency(supply: number, demand: number): number {
  if (demand <= 0) return 1;
  if (supply <= 0) return 0;
  return Math.min(1, supply / demand);
}

function sumValues(m: ReadonlyMap<number, number>): number {
  let n = 0;
  for (const v of m.values()) n += v;
  return n;
}
