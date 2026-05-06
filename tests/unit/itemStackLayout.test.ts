import { describe, expect, test } from 'vitest';
import {
  computeStackedItemPosition,
  STACK_BASE_Y_OFFSET,
  STACK_STEP,
} from '../../src/lib/itemStackLayout';

describe('computeStackedItemPosition', () => {
  test('first item sits STACK_BASE_Y_OFFSET above the slot', () => {
    const pos = computeStackedItemPosition({ x: 200, y: 360 }, 0);
    expect(pos.x).toBe(200);
    expect(pos.y).toBe(360 - STACK_BASE_Y_OFFSET);
  });

  test('subsequent items each STACK_STEP further up', () => {
    const pos1 = computeStackedItemPosition({ x: 200, y: 360 }, 1);
    const pos2 = computeStackedItemPosition({ x: 200, y: 360 }, 2);
    expect(pos1.y).toBe(360 - STACK_BASE_Y_OFFSET - STACK_STEP);
    expect(pos2.y).toBe(360 - STACK_BASE_Y_OFFSET - 2 * STACK_STEP);
  });

  test('x is unchanged across stack indices (vertical stacking)', () => {
    const pos0 = computeStackedItemPosition({ x: 176, y: 324 }, 0);
    const pos5 = computeStackedItemPosition({ x: 176, y: 324 }, 5);
    expect(pos0.x).toBe(176);
    expect(pos5.x).toBe(176);
  });

  test('does not mutate the input slot position', () => {
    const slot = { x: 100, y: 200 };
    computeStackedItemPosition(slot, 3);
    expect(slot).toEqual({ x: 100, y: 200 });
  });
});
