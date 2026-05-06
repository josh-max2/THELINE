// Test the TechTreeSystem purchase flow + save propagation. Pure-JS-friendly
// (no Phaser deps), so we can run it under happy-dom.

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TechTreeSystem } from '../../src/systems/TechTreeSystem';
import { salvageStore } from '../../src/lib/salvageStore';
import { nodesByTier } from '../../src/lib/techTreeMath';

describe('TechTreeSystem.purchase', () => {
  let sys: TechTreeSystem;

  beforeEach(() => {
    salvageStore.reset();
    sys = new TechTreeSystem();
  });

  afterEach(() => {
    salvageStore.reset();
  });

  test('starts with no owned ids', () => {
    expect(sys.ownedIds.size).toBe(0);
    expect(sys.unlocks().size).toBe(0);
  });

  test('loadFromSave hydrates ownership + unlocks', () => {
    const t1 = nodesByTier()[1][0];
    sys.loadFromSave([t1.id]);
    expect(sys.has(t1.id)).toBe(true);
    expect(sys.unlocks().size).toBeGreaterThan(0);
  });

  test('purchase fails when insufficient salvage (state untouched)', () => {
    const t1 = nodesByTier()[1][0];
    salvageStore.setTotal(t1.cost - 1);
    const r = sys.purchase(t1.id);
    expect(r.ok).toBe(false);
    expect(sys.has(t1.id)).toBe(false);
    expect(salvageStore.total).toBe(t1.cost - 1); // not debited
  });

  test('purchase debits cost + adds id + grants unlocks', () => {
    const t1 = nodesByTier()[1][0];
    salvageStore.setTotal(100);
    const r = sys.purchase(t1.id);
    expect(r.ok).toBe(true);
    expect(sys.has(t1.id)).toBe(true);
    expect(salvageStore.total).toBe(100 - t1.cost);
    for (const tag of t1.grants) expect(sys.unlocks().has(tag)).toBe(true);
  });

  test('purchase fails when prereqs unmet (tier 2 without tier 1)', () => {
    const t2 = nodesByTier()[2][0];
    salvageStore.setTotal(1000);
    const r = sys.purchase(t2.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('prereqs-not-met');
  });

  test('subscribe fires immediately + on purchase', () => {
    const t1 = nodesByTier()[1][0];
    salvageStore.setTotal(100);
    const calls: number[] = [];
    const unsub = sys.subscribe((owned) => calls.push(owned.size));
    expect(calls).toEqual([0]); // immediate fire
    sys.purchase(t1.id);
    expect(calls).toEqual([0, 1]);
    unsub();
  });

  test('binds save system + writes purchasedTechIds patch on purchase', () => {
    const t1 = nodesByTier()[1][0];
    salvageStore.setTotal(100);
    const updateHubState = vi.fn();
    const flushSave = vi.fn().mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sys.bindSaveSystem({ updateHubState, flushSave } as any);
    sys.purchase(t1.id);
    expect(updateHubState).toHaveBeenCalledWith({ purchasedTechIds: [t1.id] });
    expect(flushSave).toHaveBeenCalled();
  });

  test('repeated purchase of same id fails (already-owned)', () => {
    const t1 = nodesByTier()[1][0];
    salvageStore.setTotal(1000);
    sys.purchase(t1.id);
    const r = sys.purchase(t1.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('already-owned');
  });
});
