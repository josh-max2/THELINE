import { afterEach, describe, expect, test } from 'vitest';
import { autoRunStore } from '../../src/lib/autoRunStore';

describe('autoRunStore', () => {
  afterEach(() => {
    autoRunStore.reset();
  });

  test('starts disabled', () => {
    expect(autoRunStore.enabled).toBe(false);
  });

  test('setEnabled toggles + notifies', () => {
    const seen: boolean[] = [];
    const unsub = autoRunStore.subscribe((v) => seen.push(v));
    autoRunStore.setEnabled(true);
    autoRunStore.setEnabled(false);
    unsub();
    expect(seen).toEqual([true, false]);
  });

  test('setEnabled is idempotent (no listener spam)', () => {
    let n = 0;
    const unsub = autoRunStore.subscribe(() => n++);
    autoRunStore.setEnabled(false); // already false
    autoRunStore.setEnabled(false);
    unsub();
    expect(n).toBe(0);
  });

  test('reset returns to disabled', () => {
    autoRunStore.setEnabled(true);
    autoRunStore.reset();
    expect(autoRunStore.enabled).toBe(false);
  });
});
