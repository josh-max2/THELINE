// Round-trip integration test for the Task 5.3 tech-tree pipeline:
// purchase → SaveSystem.flushSave → fresh SaveSystem.init → loadFromSave →
// owned set restored. Catches the class of bug where data is written but no
// consumer reads it back. Mirrors the saveSystem persistence E2E pattern.

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { InMemoryStorage } from '../../src/lib/saveStorage';
import { SaveSystem } from '../../src/systems/SaveSystem';
import { TechTreeSystem } from '../../src/systems/TechTreeSystem';
import { salvageStore } from '../../src/lib/salvageStore';
import { unlocksStore } from '../../src/lib/unlocksStore';
import { nodesByTier } from '../../src/lib/techTreeMath';

describe('tech tree end-to-end round-trip', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    salvageStore.reset();
    unlocksStore.reset();
  });

  afterEach(() => {
    salvageStore.reset();
    unlocksStore.reset();
  });

  test('purchase → flushSave → reload → loadFromSave → owned restored', async () => {
    // First session: hub buys a node.
    const sess1Save = new SaveSystem(storage);
    const sess1Tech = new TechTreeSystem();
    sess1Tech.bindSaveSystem(sess1Save);
    await sess1Save.init();
    salvageStore.setTotal(50);

    const t1 = nodesByTier()[1].find((n) => n.id === 't1-frostworks')!;
    const r = sess1Tech.purchase(t1.id);
    expect(r.ok).toBe(true);
    await sess1Save.flushSave();

    // Tear down — simulate scene transition / page reload.
    salvageStore.reset();
    unlocksStore.reset();

    // Fresh session reads the same storage.
    const sess2Save = new SaveSystem(storage);
    const sess2Tech = new TechTreeSystem();
    const data = await sess2Save.init();
    sess2Tech.loadFromSave(data.hubState.purchasedTechIds);

    expect(sess2Tech.has(t1.id)).toBe(true);
    // Salvage debited (50 - 10 = 40).
    expect(data.totalSalvage).toBe(50 - t1.cost);
    // unlocksStore globally hydrated by loadFromSave.
    for (const tag of t1.grants) expect(unlocksStore.has(tag)).toBe(true);
  });

  test('two purchases survive a reload + restore both', async () => {
    const sess1Save = new SaveSystem(storage);
    const sess1Tech = new TechTreeSystem();
    sess1Tech.bindSaveSystem(sess1Save);
    await sess1Save.init();
    salvageStore.setTotal(100);

    const t1a = nodesByTier()[1].find((n) => n.id === 't1-frostworks')!;
    const t1b = nodesByTier()[1].find((n) => n.id === 't1-spare-parts')!;
    expect(sess1Tech.purchase(t1a.id).ok).toBe(true);
    expect(sess1Tech.purchase(t1b.id).ok).toBe(true);
    await sess1Save.flushSave();

    salvageStore.reset();
    unlocksStore.reset();

    const sess2Save = new SaveSystem(storage);
    const sess2Tech = new TechTreeSystem();
    const data = await sess2Save.init();
    sess2Tech.loadFromSave(data.hubState.purchasedTechIds);

    expect(sess2Tech.ownedIds.size).toBe(2);
    expect(sess2Tech.has(t1a.id)).toBe(true);
    expect(sess2Tech.has(t1b.id)).toBe(true);
  });
});
