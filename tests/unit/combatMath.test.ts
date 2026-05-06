import { describe, expect, test } from 'vitest';
import {
  closestTarget,
  targetsInRadius,
  distanceSquared,
  type Targetable,
} from '../../src/lib/combatMath';

const a: Targetable = { x: 100, y: 100, hp: 10 };
const b: Targetable = { x: 200, y: 100, hp: 10 };
const c: Targetable = { x: 150, y: 150, hp: 10 };
const far: Targetable = { x: 1000, y: 1000, hp: 10 };

describe('closestTarget', () => {
  test('empty array → undefined', () => {
    expect(closestTarget([], 0, 0)).toBeUndefined();
  });

  test('returns the nearest item by Euclidean distance', () => {
    expect(closestTarget([a, b, c], 100, 100)).toBe(a); // distance 0
    expect(closestTarget([a, b, c], 250, 100)).toBe(b); // 50 away vs 100/~158
  });

  test('respects maxRange — items beyond are ignored', () => {
    expect(closestTarget([a, b, far], 0, 0, 200)).toBe(a); // far is ~1414 away
    expect(closestTarget([far], 0, 0, 100)).toBeUndefined();
  });

  test('maxRange equal to distance is exclusive (item NOT returned)', () => {
    // a is sqrt(100² + 100²) ≈ 141.42 from origin. maxRange=141 → excluded; 142 → included.
    const aFromOrigin = Math.hypot(100, 100);
    expect(closestTarget([a], 0, 0, aFromOrigin - 1)).toBeUndefined();
    expect(closestTarget([a], 0, 0, aFromOrigin + 1)).toBe(a);
  });
});

describe('targetsInRadius', () => {
  test('empty array → empty', () => {
    expect(targetsInRadius([], 0, 0, 100)).toEqual([]);
  });

  test('returns items within radius (boundary inclusive)', () => {
    // From (100,100): a=(100,100) is at distance 0; c=(150,150) is sqrt(50²+50²) ≈ 70.7.
    const r50 = targetsInRadius([a, b, c], 100, 100, 50);
    expect(r50).toContain(a);
    expect(r50).not.toContain(c); // 70.7 > 50 — outside radius
    // Widen the radius and c comes back in.
    expect(targetsInRadius([a, b, c], 100, 100, 80)).toContain(c);
  });

  test('boundary case — exact radius returns the item', () => {
    const exactly100Away: Targetable = { x: 100, y: 0, hp: 1 };
    expect(targetsInRadius([exactly100Away], 0, 0, 100)).toEqual([exactly100Away]);
  });

  test('returns multiple matches', () => {
    const result = targetsInRadius([a, b, c, far], 150, 100, 70);
    // a is 50 away, b is 50 away, c is sqrt(0² + 50²) = 50. far is ~1500.
    expect(result).toHaveLength(3);
    expect(result).toEqual(expect.arrayContaining([a, b, c]));
  });

  test('zero radius — only items exactly at center', () => {
    const exact: Targetable = { x: 5, y: 5, hp: 1 };
    expect(targetsInRadius([exact, a], 5, 5, 0)).toEqual([exact]);
  });
});

describe('distanceSquared', () => {
  test('returns squared Euclidean distance', () => {
    expect(distanceSquared(0, 0, 3, 4)).toBe(25);
    expect(distanceSquared(10, 10, 10, 10)).toBe(0);
    expect(distanceSquared(-5, 0, 5, 0)).toBe(100);
  });
});
