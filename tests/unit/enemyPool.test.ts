import { describe, expect, test } from 'vitest';
import { pickFromPool } from '../../src/lib/enemyPool';

describe('pickFromPool', () => {
  test('empty pool → undefined', () => {
    expect(pickFromPool(new Map())).toBeUndefined();
  });

  test('all-zero weights → undefined', () => {
    expect(pickFromPool(new Map([['a', 0], ['b', 0]]))).toBeUndefined();
  });

  test('single non-zero entry always wins', () => {
    const pool = new Map([['a', 0], ['b', 5], ['c', 0]]);
    for (let i = 0; i < 20; i++) expect(pickFromPool(pool, () => Math.random())).toBe('b');
  });

  test('boundaries with deterministic rng', () => {
    const pool = new Map([['a', 1], ['b', 1], ['c', 1]]); // total 3
    expect(pickFromPool(pool, () => 0)).toBe('a');     // 0 < 1 → a
    expect(pickFromPool(pool, () => 1 / 3 - 0.001)).toBe('a');
    expect(pickFromPool(pool, () => 1 / 3 + 0.001)).toBe('b');
    expect(pickFromPool(pool, () => 2 / 3 + 0.001)).toBe('c');
    expect(pickFromPool(pool, () => 0.999)).toBe('c');
  });

  test('weighted distribution holds over many samples (LCG)', () => {
    const pool = new Map([['a', 1], ['b', 3]]); // 25% / 75% expected
    let seed = 7;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const counts: Record<string, number> = { a: 0, b: 0 };
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const id = pickFromPool(pool, rng)!;
      counts[id]++;
    }
    // ±3σ for binomial: σ = √(N·p·(1−p)) ≈ √(4000·0.25·0.75) ≈ 27.4
    expect(counts.a).toBeGreaterThan(N * 0.25 - 100);
    expect(counts.a).toBeLessThan(N * 0.25 + 100);
  });

  test('skips zero-weight entries', () => {
    const pool = new Map([['a', 0], ['b', 1], ['c', 0]]);
    for (let i = 0; i < 20; i++) expect(pickFromPool(pool, () => Math.random())).toBe('b');
  });
});
