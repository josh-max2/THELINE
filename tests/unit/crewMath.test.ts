import { describe, expect, test } from 'vitest';
import {
  fireRateMultiplier,
  enginePowerGenMultiplier,
  validateAssignment,
  crewCountAt,
} from '../../src/lib/crewMath';
import { CREW_FIRE_RATE_BUFF, CREW_ENGINE_POWER_BUFF_PER } from '../../src/lib/types';

describe('fireRateMultiplier', () => {
  test('returns CREW_FIRE_RATE_BUFF on Weapon Car with crew', () => {
    expect(fireRateMultiplier('weapon', 1)).toBe(CREW_FIRE_RATE_BUFF);
    expect(fireRateMultiplier('weapon', 4)).toBe(CREW_FIRE_RATE_BUFF); // flat, not per-crew
  });

  test('returns 1 on Weapon Car with no crew', () => {
    expect(fireRateMultiplier('weapon', 0)).toBe(1);
  });

  test('returns 1 on non-Weapon cars regardless of crew', () => {
    expect(fireRateMultiplier('engine', 4)).toBe(1);
    expect(fireRateMultiplier('armor', 2)).toBe(1);
    expect(fireRateMultiplier('crew', 4)).toBe(1);
    expect(fireRateMultiplier('cargo', 4)).toBe(1);
  });
});

describe('enginePowerGenMultiplier', () => {
  test('1 with no crew', () => {
    expect(enginePowerGenMultiplier(0)).toBe(1);
  });

  test('+10% per crew, linear, no cap', () => {
    expect(enginePowerGenMultiplier(1)).toBeCloseTo(1.1);
    expect(enginePowerGenMultiplier(4)).toBeCloseTo(1.4);
    expect(enginePowerGenMultiplier(10)).toBeCloseTo(2.0);
  });

  test('matches CREW_ENGINE_POWER_BUFF_PER constant', () => {
    expect(enginePowerGenMultiplier(1)).toBe(1 + CREW_ENGINE_POWER_BUFF_PER);
  });

  test('clamps negative input to 0', () => {
    expect(enginePowerGenMultiplier(-3)).toBe(1);
  });
});

describe('validateAssignment', () => {
  test('empty assignments → ok', () => {
    expect(validateAssignment(new Map(), 4)).toEqual({ ok: true });
  });

  test('valid assignments → ok', () => {
    const m = new Map<number, number | null>([
      [0, 1],
      [1, 2],
      [2, null],
      [3, 0],
    ]);
    expect(validateAssignment(m, 4).ok).toBe(true);
  });

  test('crew id out of range → rejected', () => {
    const r = validateAssignment(new Map([[5, 0]]), 4);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('out of range');
  });

  test('negative car index → rejected', () => {
    const r = validateAssignment(new Map([[0, -1]]), 4);
    expect(r.ok).toBe(false);
  });

  test('null car index allowed (unassigned)', () => {
    expect(validateAssignment(new Map([[0, null]]), 4).ok).toBe(true);
  });
});

describe('crewCountAt', () => {
  test('counts crew at a specific car', () => {
    const m = new Map<number, number | null>([
      [0, 1],
      [1, 1],
      [2, 0],
      [3, null],
    ]);
    expect(crewCountAt(m, 1)).toBe(2);
    expect(crewCountAt(m, 0)).toBe(1);
    expect(crewCountAt(m, 99)).toBe(0);
  });

  test('null assignments do not count toward any car', () => {
    const m = new Map<number, number | null>([
      [0, null],
      [1, null],
    ]);
    expect(crewCountAt(m, 0)).toBe(0);
    expect(crewCountAt(m, 1)).toBe(0);
  });
});
