import { afterEach, describe, expect, test } from 'vitest';
import { DEFAULT_TRAIN_LAYOUT, loadoutStore } from '../../src/lib/loadoutStore';

describe('loadoutStore', () => {
  afterEach(() => {
    loadoutStore.reset();
  });

  test('starts at the canonical default', () => {
    expect(loadoutStore.layout).toEqual(DEFAULT_TRAIN_LAYOUT);
    expect(loadoutStore.isCanonicalDefault()).toBe(true);
  });

  test('setLayout replaces the layout', () => {
    loadoutStore.setLayout(['engine', 'weapon']);
    expect(loadoutStore.layout).toEqual(['engine', 'weapon']);
    expect(loadoutStore.isCanonicalDefault()).toBe(false);
  });

  test('empty input falls back to default', () => {
    loadoutStore.setLayout([]);
    expect(loadoutStore.layout).toEqual(DEFAULT_TRAIN_LAYOUT);
    expect(loadoutStore.isCanonicalDefault()).toBe(true);
  });

  test('non-engine-first input falls back to default (validator-driven)', () => {
    loadoutStore.setLayout(['weapon', 'engine']);
    expect(loadoutStore.layout).toEqual(DEFAULT_TRAIN_LAYOUT);
  });

  test('subscribe fires on setLayout + reset', () => {
    const calls: number[] = [];
    const unsub = loadoutStore.subscribe((l) => calls.push(l.length));
    loadoutStore.setLayout(['engine']);
    loadoutStore.setLayout(['engine', 'weapon', 'cargo']);
    loadoutStore.reset();
    unsub();
    expect(calls).toEqual([1, 3, DEFAULT_TRAIN_LAYOUT.length]);
  });

  test('isCanonicalDefault detects equivalent shape, not reference equality', () => {
    loadoutStore.setLayout(['engine', 'weapon', 'armor', 'crew', 'cargo']);
    expect(loadoutStore.isCanonicalDefault()).toBe(true);
  });

  test('layout returned is read-only-shaped (defensive copy on set)', () => {
    const input: Array<'engine' | 'weapon'> = ['engine', 'weapon'];
    loadoutStore.setLayout(input);
    input.push('weapon'); // mutate caller copy
    expect(loadoutStore.layout).toEqual(['engine', 'weapon']);
  });
});
