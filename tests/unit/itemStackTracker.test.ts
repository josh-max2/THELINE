import { describe, expect, test, beforeEach } from 'vitest';
import { ItemStackTracker } from '../../src/lib/itemStackTracker';
import type { ItemData, QualifiedSlotId } from '../../src/lib/types';
import { qualifySlot } from '../../src/lib/types';

const damageItem: ItemData = {
  id: 'rivet-rounds',
  name: 'Rivet Rounds',
  category: 'damage',
  appliesTo: ['auto-fire'],
  render: { fill: '#000', stroke: '#000', shapes: [] },
  effects: [{ stat: 'damage', op: 'add', value: 5 }],
  stackCap: 3,
};

const splitShot: ItemData = {
  ...damageItem,
  id: 'split-shot',
  effects: [{ stat: 'projectileCount', op: 'add', value: 1 }],
};

let tracker: ItemStackTracker;

beforeEach(() => {
  tracker = new ItemStackTracker();
});

describe('ItemStackTracker — single slot', () => {
  test('starts empty', () => {
    expect(tracker.totalItems).toBe(0);
    expect(tracker.occupiedSlotCount).toBe(0);
  });

  test('attach + itemsAt round-trip', () => {
    const slot: QualifiedSlotId = qualifySlot(0, 'engine-top-1');
    tracker.attach(slot, damageItem);
    expect(tracker.itemsAt(slot)).toEqual([damageItem]);
    expect(tracker.countAt(slot)).toBe(1);
    expect(tracker.totalItems).toBe(1);
    expect(tracker.occupiedSlotCount).toBe(1);
  });

  test('multiple items stack on the same slot', () => {
    const slot = qualifySlot(0, 'engine-top-1');
    tracker.attach(slot, damageItem);
    tracker.attach(slot, splitShot);
    tracker.attach(slot, damageItem);
    expect(tracker.countAt(slot)).toBe(3);
    expect(tracker.itemsAt(slot).map((i) => i.id)).toEqual([
      'rivet-rounds',
      'split-shot',
      'rivet-rounds',
    ]);
  });

  test('detach removes first matching item by id', () => {
    const slot = qualifySlot(0, 'engine-top-1');
    tracker.attach(slot, damageItem);
    tracker.attach(slot, splitShot);
    tracker.attach(slot, damageItem);
    const removed = tracker.detach(slot, 'rivet-rounds');
    expect(removed).toBe(damageItem);
    expect(tracker.itemsAt(slot).map((i) => i.id)).toEqual(['split-shot', 'rivet-rounds']);
  });

  test('detach on missing item returns undefined, leaves stack untouched', () => {
    const slot = qualifySlot(0, 'engine-top-1');
    tracker.attach(slot, damageItem);
    expect(tracker.detach(slot, 'never-existed')).toBeUndefined();
    expect(tracker.countAt(slot)).toBe(1);
  });

  test('emptying a slot also removes the slot from occupiedSlotCount', () => {
    const slot = qualifySlot(0, 'engine-top-1');
    tracker.attach(slot, damageItem);
    tracker.detach(slot, 'rivet-rounds');
    expect(tracker.occupiedSlotCount).toBe(0);
    expect(tracker.itemsAt(slot)).toEqual([]);
  });
});

describe('ItemStackTracker — detachAll', () => {
  test('returns the entire stack and clears the slot', () => {
    const slot = qualifySlot(0, 'engine-top-1');
    tracker.attach(slot, damageItem);
    tracker.attach(slot, splitShot);
    const removed = tracker.detachAll(slot);
    expect(removed).toEqual([damageItem, splitShot]);
    expect(tracker.countAt(slot)).toBe(0);
  });

  test('detachAll on empty slot returns []', () => {
    expect(tracker.detachAll(qualifySlot(0, 'never'))).toEqual([]);
  });
});

describe('ItemStackTracker — qualified-slot isolation', () => {
  test('two different cars (same JSON slot id) keep their stacks separate', () => {
    const a: QualifiedSlotId = qualifySlot(1, 'weapon-top-1');
    const b: QualifiedSlotId = qualifySlot(2, 'weapon-top-1');
    tracker.attach(a, damageItem);
    tracker.attach(b, splitShot);
    expect(tracker.itemsAt(a)).toEqual([damageItem]);
    expect(tracker.itemsAt(b)).toEqual([splitShot]);
    expect(tracker.totalItems).toBe(2);
    expect(tracker.occupiedSlotCount).toBe(2);
  });
});

describe('ItemStackTracker — clear', () => {
  test('clear empties everything', () => {
    tracker.attach(qualifySlot(0, 'a'), damageItem);
    tracker.attach(qualifySlot(0, 'b'), splitShot);
    tracker.clear();
    expect(tracker.totalItems).toBe(0);
    expect(tracker.occupiedSlotCount).toBe(0);
  });
});
