import { describe, expect, test } from 'vitest';
import { composeStats, getNumStat, getStrStat } from '../../src/lib/composeStats';
import type { ItemData, ModuleBehaviorData } from '../../src/lib/types';

const baseAutoFire: ModuleBehaviorData = {
  kind: 'auto-fire',
  fireRate: 1.0,
  damage: 10,
  projectile: 'kinetic-bolt',
};

const item = (id: string, effects: ItemData['effects'], appliesTo: ItemData['appliesTo'] = ['auto-fire']): ItemData => ({
  id,
  name: id,
  category: 'damage',
  appliesTo,
  render: { fill: '#000', stroke: '#000', shapes: [] },
  effects,
  stackCap: 5,
});

describe('composeStats — empty + identity', () => {
  test('empty items returns base behavior fields (kind stripped)', () => {
    const stats = composeStats(baseAutoFire, []);
    expect(stats.fireRate).toBe(1.0);
    expect(stats.damage).toBe(10);
    expect(stats.projectile).toBe('kinetic-bolt');
    expect(stats.kind).toBeUndefined();
  });

  test('non-numeric, non-string behavior fields are stripped', () => {
    const odd: ModuleBehaviorData = { kind: 'auto-fire', enabled: true } as unknown as ModuleBehaviorData;
    const stats = composeStats(odd, []);
    expect(stats.enabled).toBeUndefined();
  });
});

describe('composeStats — single-effect ops', () => {
  test('add — base + value', () => {
    const stats = composeStats(baseAutoFire, [
      item('rivet-rounds', [{ stat: 'damage', op: 'add', value: 5 }]),
    ]);
    expect(stats.damage).toBe(15);
  });

  test('multiply — base × value', () => {
    const stats = composeStats(baseAutoFire, [
      item('hyper-cycle', [{ stat: 'fireRate', op: 'multiply', value: 2 }]),
    ]);
    expect(stats.fireRate).toBe(2.0);
  });

  test('set — overrides base value', () => {
    const stats = composeStats(baseAutoFire, [
      item('damage-fix', [{ stat: 'damage', op: 'set', value: 100 }]),
    ]);
    expect(stats.damage).toBe(100);
  });

  test('add to absent stat treats base as 0', () => {
    const stats = composeStats(baseAutoFire, [
      item('pierce-up', [{ stat: 'pierce', op: 'add', value: 2 }]),
    ]);
    expect(stats.pierce).toBe(2);
  });
});

describe('composeStats — stacking same effect', () => {
  test('multiple adds compound', () => {
    const stats = composeStats(baseAutoFire, [
      item('a', [{ stat: 'damage', op: 'add', value: 5 }]),
      item('b', [{ stat: 'damage', op: 'add', value: 5 }]),
      item('c', [{ stat: 'damage', op: 'add', value: 5 }]),
    ]);
    expect(stats.damage).toBe(25); // 10 + 5+5+5
  });

  test('multiple multiplies compound', () => {
    const stats = composeStats(baseAutoFire, [
      item('a', [{ stat: 'fireRate', op: 'multiply', value: 2 }]),
      item('b', [{ stat: 'fireRate', op: 'multiply', value: 1.5 }]),
    ]);
    expect(stats.fireRate).toBeCloseTo(3.0); // 1.0 × 2 × 1.5
  });
});

describe('composeStats — operation order (add → multiply → set)', () => {
  test('add applied before multiply', () => {
    // Order in items array is [multiply, add]; composition still adds first.
    const stats = composeStats(baseAutoFire, [
      item('a', [{ stat: 'damage', op: 'multiply', value: 2 }]),
      item('b', [{ stat: 'damage', op: 'add', value: 5 }]),
    ]);
    // Add first: 10 + 5 = 15. Then multiply: 15 × 2 = 30.
    expect(stats.damage).toBe(30);
  });

  test('set overrides both add and multiply', () => {
    const stats = composeStats(baseAutoFire, [
      item('a', [{ stat: 'damage', op: 'add', value: 50 }]),
      item('b', [{ stat: 'damage', op: 'multiply', value: 3 }]),
      item('c', [{ stat: 'damage', op: 'set', value: 7 }]),
    ]);
    expect(stats.damage).toBe(7);
  });

  test('set then add — set still wins because set runs last', () => {
    // This documents the convention. If a designer wants "set then add on top"
    // they need to express it differently (e.g., a single combined item).
    const stats = composeStats(baseAutoFire, [
      item('a', [{ stat: 'damage', op: 'set', value: 7 }]),
      item('b', [{ stat: 'damage', op: 'add', value: 3 }]),
    ]);
    // Add pass: 10 + 3 = 13. Set pass: 13 → 7. Final: 7.
    expect(stats.damage).toBe(7);
  });
});

describe('composeStats — independent stats', () => {
  test('different stats compose independently', () => {
    const stats = composeStats(baseAutoFire, [
      item('a', [
        { stat: 'damage', op: 'add', value: 5 },
        { stat: 'fireRate', op: 'multiply', value: 1.5 },
      ]),
    ]);
    expect(stats.damage).toBe(15);
    expect(stats.fireRate).toBeCloseTo(1.5);
  });
});

describe('getNumStat / getStrStat accessors', () => {
  test('getNumStat returns the number, fallback if missing or wrong type', () => {
    expect(getNumStat({ damage: 7 }, 'damage', 0)).toBe(7);
    expect(getNumStat({}, 'damage', 0)).toBe(0);
    expect(getNumStat({ damage: 'wrong' }, 'damage', 99)).toBe(99);
    expect(getNumStat({ damage: NaN }, 'damage', 99)).toBe(99);
  });

  test('getStrStat returns the string, fallback otherwise', () => {
    expect(getStrStat({ projectile: 'kinetic-bolt' }, 'projectile', 'x')).toBe('kinetic-bolt');
    expect(getStrStat({ projectile: 5 }, 'projectile', 'x')).toBe('x');
    expect(getStrStat({}, 'projectile', 'x')).toBe('x');
  });
});
