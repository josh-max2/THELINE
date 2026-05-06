import { describe, expect, test } from 'vitest';
import { computeAllocations, efficiency, MAX_POWER_WEIGHT } from '../../src/lib/powerMath';

describe('efficiency', () => {
  test('demand 0 → 1 (nothing to power)', () => {
    expect(efficiency(0, 0)).toBe(1);
    expect(efficiency(10, 0)).toBe(1);
  });

  test('supply 0, demand > 0 → 0', () => {
    expect(efficiency(0, 5)).toBe(0);
  });

  test('supply ≥ demand → 1 (clamped)', () => {
    expect(efficiency(10, 5)).toBe(1);
    expect(efficiency(5, 5)).toBe(1);
  });

  test('supply < demand → fraction', () => {
    expect(efficiency(2, 4)).toBe(0.5);
    expect(efficiency(3, 12)).toBe(0.25);
  });
});

describe('computeAllocations — single car', () => {
  test('one car with weight, demand', () => {
    const out = computeAllocations({
      generation: 10,
      weights: new Map([[1, 5]]),
      demands: new Map([[1, 4]]),
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      carIndex: 1,
      weight: 5,
      share: 1, // only car with weight
      supply: 10,
      demand: 4,
      efficiency: 1,
    });
  });

  test('one car with weight 0 → no supply, but no demand → efficiency 1', () => {
    const out = computeAllocations({
      generation: 10,
      weights: new Map([[1, 0]]),
      demands: new Map([[1, 0]]),
    });
    expect(out[0].supply).toBe(0);
    expect(out[0].efficiency).toBe(1);
  });

  test('one car with weight 0 + non-zero demand → efficiency 0', () => {
    const out = computeAllocations({
      generation: 10,
      weights: new Map([[1, 0]]),
      demands: new Map([[1, 5]]),
    });
    expect(out[0].efficiency).toBe(0);
  });
});

describe('computeAllocations — multiple cars', () => {
  test('two cars with equal weights split power evenly', () => {
    const out = computeAllocations({
      generation: 20,
      weights: new Map([[1, 5], [2, 5]]),
      demands: new Map([[1, 8], [2, 12]]),
    });
    expect(out[0].supply).toBe(10);
    expect(out[1].supply).toBe(10);
    expect(out[0].efficiency).toBe(1); // 10 ≥ 8
    expect(out[1].efficiency).toBeCloseTo(10 / 12);
  });

  test('weights split proportionally', () => {
    const out = computeAllocations({
      generation: 12,
      weights: new Map([[1, 1], [2, 2]]),
      demands: new Map([[1, 4], [2, 8]]),
    });
    // total weight 3 → car 1 gets 1/3 = 4 power, car 2 gets 2/3 = 8 power
    expect(out[0].supply).toBeCloseTo(4);
    expect(out[1].supply).toBeCloseTo(8);
    expect(out[0].efficiency).toBe(1);
    expect(out[1].efficiency).toBe(1);
  });

  test('all weights 0 → no power flows even if demands exist', () => {
    const out = computeAllocations({
      generation: 100,
      weights: new Map([[1, 0], [2, 0]]),
      demands: new Map([[1, 5], [2, 5]]),
    });
    expect(out[0].supply).toBe(0);
    expect(out[1].supply).toBe(0);
    expect(out[0].efficiency).toBe(0);
    expect(out[1].efficiency).toBe(0);
  });

  test('zero generation with weights → no supply', () => {
    const out = computeAllocations({
      generation: 0,
      weights: new Map([[1, 5], [2, 5]]),
      demands: new Map([[1, 1], [2, 1]]),
    });
    expect(out[0].supply).toBe(0);
    expect(out[1].supply).toBe(0);
  });
});

describe('computeAllocations — demand-only entries', () => {
  test('car with demand but no weight entry still appears with supply 0', () => {
    const out = computeAllocations({
      generation: 10,
      weights: new Map([[1, 5]]),
      demands: new Map([[1, 2], [2, 3]]),
    });
    const car2 = out.find((a) => a.carIndex === 2)!;
    expect(car2.weight).toBe(0);
    expect(car2.supply).toBe(0);
    expect(car2.efficiency).toBe(0); // demand 3 with 0 supply
  });
});

describe('MAX_POWER_WEIGHT', () => {
  test('is the slider clamp for UI', () => {
    expect(MAX_POWER_WEIGHT).toBe(10);
  });
});
