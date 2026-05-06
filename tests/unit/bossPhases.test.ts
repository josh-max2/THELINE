import { describe, expect, test } from 'vitest';
import { currentPhase, currentPhaseIndex } from '../../src/lib/bossPhases';
import type { BossPhaseSpec } from '../../src/lib/types';

const phases: BossPhaseSpec[] = [
  { hpRatio: 0.66, tint: '#aaa', speedMult: 1 },
  { hpRatio: 0.33, tint: '#bbb', speedMult: 1.5 },
  { hpRatio: 0.0, tint: '#ccc', speedMult: 2 },
];

describe('currentPhaseIndex', () => {
  test('full HP → phase 0', () => {
    expect(currentPhaseIndex(phases, 1.0)).toBe(0);
    expect(currentPhaseIndex(phases, 0.66)).toBe(0);
  });

  test('mid HP → phase 1', () => {
    expect(currentPhaseIndex(phases, 0.65)).toBe(1);
    expect(currentPhaseIndex(phases, 0.5)).toBe(1);
    expect(currentPhaseIndex(phases, 0.33)).toBe(1);
  });

  test('low HP → phase 2', () => {
    expect(currentPhaseIndex(phases, 0.32)).toBe(2);
    expect(currentPhaseIndex(phases, 0.1)).toBe(2);
    expect(currentPhaseIndex(phases, 0)).toBe(2);
  });

  test('empty array → 0 (caller should validate)', () => {
    expect(currentPhaseIndex([], 0.5)).toBe(0);
  });
});

describe('currentPhase', () => {
  test('returns the active phase spec', () => {
    expect(currentPhase(phases, 1)?.tint).toBe('#aaa');
    expect(currentPhase(phases, 0.5)?.tint).toBe('#bbb');
    expect(currentPhase(phases, 0)?.tint).toBe('#ccc');
  });

  test('empty array → undefined', () => {
    expect(currentPhase([], 0.5)).toBeUndefined();
  });
});
