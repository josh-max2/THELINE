import { describe, expect, test } from 'vitest';
import {
  pickSpawnSide,
  spawnPositionFor,
  SPAWN_WEIGHTS,
  type SpawnSide,
} from '../../src/lib/spawnDirection';

describe('SPAWN_WEIGHTS', () => {
  test('weights sum to 1', () => {
    const sum = Object.values(SPAWN_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  test('forward is not in the side enum (chase fantasy — never spawn forward)', () => {
    const sides = Object.keys(SPAWN_WEIGHTS) as SpawnSide[];
    expect(sides).not.toContain('forward' as never);
  });
});

describe('pickSpawnSide', () => {
  test('rng=0 → first side (rear)', () => {
    expect(pickSpawnSide(() => 0)).toBe('rear');
  });

  test('rng=0.49 → still rear (just under cumulative 0.5)', () => {
    expect(pickSpawnSide(() => 0.49)).toBe('rear');
  });

  test('rng=0.5 → top (cumulative 0.75)', () => {
    expect(pickSpawnSide(() => 0.5)).toBe('top');
  });

  test('rng=0.7499 → still top (just below cumulative 0.75)', () => {
    expect(pickSpawnSide(() => 0.7499)).toBe('top');
  });

  test('rng=0.75 → bottom', () => {
    expect(pickSpawnSide(() => 0.75)).toBe('bottom');
  });

  test('rng=0.999 → bottom', () => {
    expect(pickSpawnSide(() => 0.999)).toBe('bottom');
  });

  test('seeded LCG over 10k samples falls within ±3σ of 50/25/25 expected', () => {
    // Linear-congruential generator with a fixed seed for reproducibility.
    let seed = 42;
    const rng = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const counts: Record<SpawnSide, number> = { rear: 0, top: 0, bottom: 0 };
    const N = 10_000;
    for (let i = 0; i < N; i++) counts[pickSpawnSide(rng)]++;

    // Tolerance: ±3 standard deviations on a binomial. σ = √(N·p·(1−p)).
    // For p=0.5: σ ≈ 50, so ±150. For p=0.25: σ ≈ 43, so ±130.
    expect(counts.rear).toBeGreaterThan(N * 0.5 - 150);
    expect(counts.rear).toBeLessThan(N * 0.5 + 150);
    expect(counts.top).toBeGreaterThan(N * 0.25 - 130);
    expect(counts.top).toBeLessThan(N * 0.25 + 130);
    expect(counts.bottom).toBeGreaterThan(N * 0.25 - 130);
    expect(counts.bottom).toBeLessThan(N * 0.25 + 130);
  });
});

describe('spawnPositionFor', () => {
  test('rear position is left of train and roughly at train y', () => {
    const p = spawnPositionFor('rear', 1280, 720, 360, () => 0.5);
    expect(p.x).toBeLessThan(0);
    expect(p.y).toBeGreaterThan(360 - 320 / 2);
    expect(p.y).toBeLessThan(360 + 320 / 2);
  });

  test('top position is above the screen', () => {
    const p = spawnPositionFor('top', 1280, 720, 360, () => 0.5);
    expect(p.y).toBeLessThan(0);
    expect(p.x).toBeGreaterThanOrEqual(200);
    expect(p.x).toBeLessThan(1280);
  });

  test('bottom position is below the screen', () => {
    const p = spawnPositionFor('bottom', 1280, 720, 360, () => 0.5);
    expect(p.y).toBeGreaterThan(720);
    expect(p.x).toBeGreaterThanOrEqual(200);
    expect(p.x).toBeLessThan(1280);
  });
});
