import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { salvageStore } from '../../src/lib/salvageStore';

// Subscribe is global state on the singleton store. Tests must unsubscribe
// every listener they create or counts leak across tests.
const cleanups: Array<() => void> = [];

beforeEach(() => {
  salvageStore.reset();
});

afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('salvageStore', () => {
  test('starts at 0', () => {
    expect(salvageStore.total).toBe(0);
  });

  test('add(n) increments total', () => {
    salvageStore.add(1);
    expect(salvageStore.total).toBe(1);
    salvageStore.add(5);
    expect(salvageStore.total).toBe(6);
  });

  test('add(0) and add(negative) are no-ops', () => {
    salvageStore.add(0);
    salvageStore.add(-3);
    expect(salvageStore.total).toBe(0);
  });

  test('reset() returns to 0', () => {
    salvageStore.add(10);
    salvageStore.reset();
    expect(salvageStore.total).toBe(0);
  });

  test('subscribe receives updates', () => {
    const listener = vi.fn();
    cleanups.push(salvageStore.subscribe(listener));
    salvageStore.add(2);
    salvageStore.add(3);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(5);
  });

  test('unsubscribe stops receiving updates', () => {
    const listener = vi.fn();
    const unsub = salvageStore.subscribe(listener);
    salvageStore.add(1);
    unsub();
    salvageStore.add(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
