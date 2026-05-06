import { describe, expect, test } from 'vitest';
import {
  IDLE_CAP_SEC,
  IDLE_CAP_SALVAGE,
  IDLE_RATE_PER_SEC,
  accruedSalvage,
} from '../../src/lib/idleIncomeMath';

describe('accruedSalvage', () => {
  const NOW = 1_700_000_000_000;

  test('lastExitMs=0 (never exited) → 0', () => {
    expect(accruedSalvage(0, NOW)).toBe(0);
  });

  test('elapsedMs <= 0 (clock skew) → 0', () => {
    expect(accruedSalvage(NOW + 1000, NOW)).toBe(0);
    expect(accruedSalvage(NOW, NOW)).toBe(0);
  });

  test('1 minute elapsed → 1 salvage (rate is 1/min)', () => {
    expect(accruedSalvage(NOW - 60_000, NOW)).toBe(1);
  });

  test('30 seconds elapsed → 0 (floor)', () => {
    expect(accruedSalvage(NOW - 30_000, NOW)).toBe(0);
  });

  test('59 seconds → 0; 60 → 1; 119 → 1; 120 → 2', () => {
    expect(accruedSalvage(NOW - 59_000, NOW)).toBe(0);
    expect(accruedSalvage(NOW - 60_000, NOW)).toBe(1);
    expect(accruedSalvage(NOW - 119_000, NOW)).toBe(1);
    expect(accruedSalvage(NOW - 120_000, NOW)).toBe(2);
  });

  test('clamps at IDLE_CAP_SEC (4h)', () => {
    const days = NOW - 8 * 24 * 60 * 60 * 1000; // 8 days
    expect(accruedSalvage(days, NOW)).toBe(IDLE_CAP_SALVAGE);
  });

  test('exact cap → IDLE_CAP_SALVAGE', () => {
    expect(accruedSalvage(NOW - IDLE_CAP_SEC * 1000, NOW)).toBe(IDLE_CAP_SALVAGE);
  });

  test('NaN / Infinity → 0', () => {
    expect(accruedSalvage(Number.NaN, NOW)).toBe(0);
    expect(accruedSalvage(NOW, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('idle constants', () => {
  test('rate is 1/60 per second (1 salvage per minute)', () => {
    expect(IDLE_RATE_PER_SEC * 60).toBeCloseTo(1);
  });

  test('cap is 4 hours = 14400 seconds', () => {
    expect(IDLE_CAP_SEC).toBe(4 * 60 * 60);
  });

  test('cap salvage is integer (matches floor of rate*cap)', () => {
    expect(IDLE_CAP_SALVAGE).toBe(Math.floor(IDLE_RATE_PER_SEC * IDLE_CAP_SEC));
    expect(IDLE_CAP_SALVAGE).toBe(240);
  });
});
