import { describe, expect, test } from 'vitest';
import { DEFAULT_SCHEDULE, slotAt, pacingBreakdown } from '../../src/lib/encounterPacing';

describe('DEFAULT_SCHEDULE', () => {
  test('has 6 entries', () => {
    expect(DEFAULT_SCHEDULE).toHaveLength(6);
  });

  test('includes all 4 kinds at least once', () => {
    expect(new Set(DEFAULT_SCHEDULE)).toEqual(new Set(['travel', 'swarm', 'mini-boss', 'boss']));
  });

  test('travel appears most often (≥ half)', () => {
    const travelCount = DEFAULT_SCHEDULE.filter((k) => k === 'travel').length;
    expect(travelCount).toBeGreaterThanOrEqual(DEFAULT_SCHEDULE.length / 2);
  });
});

describe('slotAt', () => {
  test('throws on empty schedule', () => {
    expect(() => slotAt([], 0)).toThrow();
  });

  test('returns first slot at index 0', () => {
    const r = slotAt(DEFAULT_SCHEDULE, 0);
    expect(r.index).toBe(0);
    expect(r.kind).toBe(DEFAULT_SCHEDULE[0]);
  });

  test('wraps around at end', () => {
    const r = slotAt(DEFAULT_SCHEDULE, DEFAULT_SCHEDULE.length);
    expect(r.index).toBe(0);
  });

  test('handles negative indices', () => {
    const r = slotAt(DEFAULT_SCHEDULE, -1);
    expect(r.index).toBe(DEFAULT_SCHEDULE.length - 1);
  });

  test('cycles correctly', () => {
    for (let i = 0; i < 20; i++) {
      const r = slotAt(DEFAULT_SCHEDULE, i);
      expect(r.kind).toBe(DEFAULT_SCHEDULE[i % DEFAULT_SCHEDULE.length]);
    }
  });
});

describe('pacingBreakdown', () => {
  test('returns ratios summing to 1', () => {
    const breakdown = pacingBreakdown(DEFAULT_SCHEDULE, {
      travel: 30,
      swarm: 20,
      'mini-boss': 25,
      boss: 60,
    });
    const sum = breakdown.travel + breakdown.swarm + breakdown['mini-boss'] + breakdown.boss;
    expect(sum).toBeCloseTo(1);
  });

  test('with v0 durations, travel is the largest single share', () => {
    const breakdown = pacingBreakdown(DEFAULT_SCHEDULE, {
      travel: 30,
      swarm: 20,
      'mini-boss': 25,
      boss: 60,
    });
    expect(breakdown.travel).toBeGreaterThan(breakdown.swarm);
    expect(breakdown.travel).toBeGreaterThan(breakdown['mini-boss']);
  });

  test('zero total returns zero breakdown without dividing by zero', () => {
    const breakdown = pacingBreakdown([], {
      travel: 0,
      swarm: 0,
      'mini-boss': 0,
      boss: 0,
    });
    expect(breakdown.travel).toBe(0);
  });
});
