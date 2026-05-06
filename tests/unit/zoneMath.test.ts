import { describe, expect, test } from 'vitest';
import { categoryToDamageType, fadeAlpha, tickDamage } from '../../src/lib/zoneMath';

describe('categoryToDamageType', () => {
  test('weapon categories map to themselves', () => {
    expect(categoryToDamageType('kinetic')).toBe('kinetic');
    expect(categoryToDamageType('fire')).toBe('fire');
    expect(categoryToDamageType('cryo')).toBe('cryo');
    expect(categoryToDamageType('explosive')).toBe('explosive');
    expect(categoryToDamageType('electric')).toBe('electric');
  });

  test('non-weapon categories → undefined (no env zone)', () => {
    expect(categoryToDamageType('support')).toBeUndefined();
    expect(categoryToDamageType('exotic')).toBeUndefined();
  });
});

describe('fadeAlpha', () => {
  test('1 at spawn (elapsed=0)', () => {
    expect(fadeAlpha(0, 5)).toBe(1);
  });

  test('0 at expiry (elapsed=duration)', () => {
    expect(fadeAlpha(5, 5)).toBe(0);
  });

  test('halfway through → 0.5', () => {
    expect(fadeAlpha(2.5, 5)).toBeCloseTo(0.5);
  });

  test('past expiry → 0 (clamped)', () => {
    expect(fadeAlpha(10, 5)).toBe(0);
  });

  test('zero duration → 0', () => {
    expect(fadeAlpha(0, 0)).toBe(0);
    expect(fadeAlpha(5, 0)).toBe(0);
  });
});

describe('tickDamage', () => {
  test('rate × dt', () => {
    expect(tickDamage(10, 0.5)).toBe(5);
    expect(tickDamage(2, 1)).toBe(2);
  });

  test('zero / negative rate → 0', () => {
    expect(tickDamage(0, 1)).toBe(0);
    expect(tickDamage(-5, 1)).toBe(0);
  });

  test('zero / negative dt → 0', () => {
    expect(tickDamage(10, 0)).toBe(0);
    expect(tickDamage(10, -0.5)).toBe(0);
  });
});
