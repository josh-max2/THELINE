import { describe, expect, test } from 'vitest';
import {
  NORMAL_TIME_SCALE,
  SLOW_TIME_SCALE,
  timeScaleFor,
  lerpAlpha,
} from '../../src/lib/slowTimeMath';

describe('slow-time constants', () => {
  test('normal = 1.0', () => {
    expect(NORMAL_TIME_SCALE).toBe(1.0);
  });

  test('slow = 0.25 (Bastion-style 25%)', () => {
    expect(SLOW_TIME_SCALE).toBe(0.25);
  });

  test('slow is strictly less than normal', () => {
    expect(SLOW_TIME_SCALE).toBeLessThan(NORMAL_TIME_SCALE);
  });
});

describe('timeScaleFor', () => {
  test('false → normal', () => {
    expect(timeScaleFor(false)).toBe(NORMAL_TIME_SCALE);
  });

  test('true → slow', () => {
    expect(timeScaleFor(true)).toBe(SLOW_TIME_SCALE);
  });
});

describe('lerpAlpha', () => {
  test('factor 0 → unchanged', () => {
    expect(lerpAlpha(0.5, 1.0, 0)).toBe(0.5);
  });

  test('factor 1 → snap to target', () => {
    expect(lerpAlpha(0.5, 1.0, 1)).toBe(1.0);
  });

  test('factor 0.5 → halfway', () => {
    expect(lerpAlpha(0, 1, 0.5)).toBeCloseTo(0.5);
  });

  test('factor clamped above 1', () => {
    expect(lerpAlpha(0, 1, 5)).toBe(1);
  });

  test('factor clamped below 0', () => {
    expect(lerpAlpha(0.5, 1, -1)).toBe(0.5);
  });
});
