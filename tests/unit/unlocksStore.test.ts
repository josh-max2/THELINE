import { afterEach, describe, expect, test } from 'vitest';
import { unlocksStore } from '../../src/lib/unlocksStore';
import { nodesByTier } from '../../src/lib/techTreeMath';

describe('unlocksStore', () => {
  afterEach(() => {
    unlocksStore.reset();
  });

  test('starts empty', () => {
    expect(unlocksStore.ownedIds.size).toBe(0);
    expect(unlocksStore.activeTags.size).toBe(0);
    expect(unlocksStore.has('global-damage-buff')).toBe(false);
  });

  test('setOwned recomputes tags from owned nodes', () => {
    const t1 = nodesByTier()[1].find((n) => n.id === 't1-frostworks')!;
    unlocksStore.setOwned([t1.id]);
    expect(unlocksStore.has('category-cryo')).toBe(true);
    expect(unlocksStore.ownedIds.has(t1.id)).toBe(true);
  });

  test('subscribe fires on setOwned', () => {
    const calls: number[] = [];
    const unsub = unlocksStore.subscribe((tags) => calls.push(tags.size));
    unlocksStore.setOwned(['t1-spare-parts']);
    unlocksStore.setOwned(['t1-spare-parts', 't1-frostworks']);
    unsub();
    expect(calls).toEqual([1, 2]);
  });

  test('reset clears everything + notifies', () => {
    unlocksStore.setOwned(['t1-spare-parts']);
    expect(unlocksStore.has('extra-turret-slot')).toBe(true);
    unlocksStore.reset();
    expect(unlocksStore.has('extra-turret-slot')).toBe(false);
    expect(unlocksStore.ownedIds.size).toBe(0);
  });

  test('unknown ids in setOwned do not throw', () => {
    expect(() => unlocksStore.setOwned(['nope', 't1-spare-parts', 'never'])).not.toThrow();
    expect(unlocksStore.has('extra-turret-slot')).toBe(true);
  });
});
