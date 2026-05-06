import { describe, expect, test } from 'vitest';
import {
  computeCarPositions,
  CAR_GAP,
  TRAIN_ANCHOR_X,
  TRAIN_CENTER_Y,
} from '../../src/lib/trainLayout';

describe('computeCarPositions', () => {
  test('first car anchored at TRAIN_ANCHOR_X / TRAIN_CENTER_Y', () => {
    const positions = computeCarPositions([{ width: 96 }]);
    expect(positions).toHaveLength(1);
    expect(positions[0]).toEqual({ x: TRAIN_ANCHOR_X, y: TRAIN_CENTER_Y });
  });

  test('second car positioned to the right of the first with CAR_GAP between edges', () => {
    const positions = computeCarPositions([{ width: 96 }, { width: 96 }]);
    // First car center: 200. Right edge: 200 + 48 = 248.
    // Gap: 8. Second car left edge: 256. Second car center: 256 + 48 = 304.
    expect(positions[1]).toEqual({ x: 200 + 48 + CAR_GAP + 48, y: TRAIN_CENTER_Y });
    expect(positions[1].x).toBe(304);
  });

  test('handles cars of different widths', () => {
    const positions = computeCarPositions([{ width: 96 }, { width: 80 }, { width: 120 }]);
    // Car 0 center 200. Right edge 248.
    // Car 1: left edge 256, width 80, center 296. Right edge 336.
    // Car 2: left edge 344, width 120, center 404.
    expect(positions[0].x).toBe(200);
    expect(positions[1].x).toBe(296);
    expect(positions[2].x).toBe(404);
  });

  test('all cars share the same y (train is horizontal)', () => {
    const positions = computeCarPositions([{ width: 96 }, { width: 96 }, { width: 96 }]);
    expect(new Set(positions.map((p) => p.y)).size).toBe(1);
  });

  test('empty input returns empty output', () => {
    expect(computeCarPositions([])).toEqual([]);
  });

  test('respects custom anchor and gap', () => {
    const positions = computeCarPositions(
      [{ width: 100 }, { width: 100 }],
      0,
      0,
      0,
    );
    expect(positions[0]).toEqual({ x: 0, y: 0 });
    expect(positions[1]).toEqual({ x: 100, y: 0 }); // 0 + 50 + 0 + 50
  });

  test('default v1 train [Engine, Weapon, Armor, Crew, Cargo] fits in 1280px viewport', () => {
    // All v1 cars are 96 wide; gap is CAR_GAP=8.
    // 5 cars × 96 + 4 gaps × 8 = 480 + 32 = 512 train width.
    // Anchor at TRAIN_ANCHOR_X=200 → leftmost edge = 200-48 = 152;
    // rightmost edge = 200-48 + 512 = 664. Well within 1280.
    const positions = computeCarPositions([
      { width: 96 },
      { width: 96 },
      { width: 96 },
      { width: 96 },
      { width: 96 },
    ]);
    expect(positions).toHaveLength(5);
    expect(positions[0].x).toBe(TRAIN_ANCHOR_X); // engine
    expect(positions[4].x).toBeLessThan(1280 - 48); // cargo right edge under viewport
    // Successive cars 104 px apart center-to-center (96/2 + 8 + 96/2 = 104).
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].x - positions[i - 1].x).toBe(104);
    }
  });
});
