// End-to-end round-trip for Task 5.8 idle income.
// Hub session 1 records lastHubExitMs → save → time passes → session 2 reads
// lastHubExitMs + computes accruedSalvage + adds to total. Catches the
// "data written but no consumer reads it" pattern (5x same-shape catches in
// prior tasks).

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { InMemoryStorage } from '../../src/lib/saveStorage';
import { SaveSystem } from '../../src/systems/SaveSystem';
import { salvageStore } from '../../src/lib/salvageStore';
import { autoRunStore } from '../../src/lib/autoRunStore';
import { accruedSalvage } from '../../src/lib/idleIncomeMath';

describe('idle income round-trip', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    salvageStore.reset();
    autoRunStore.reset();
  });

  afterEach(() => {
    salvageStore.reset();
    autoRunStore.reset();
  });

  test('exit → 5 minutes pass → re-enter applies +5 salvage', async () => {
    const exit = 1_700_000_000_000;
    const reenter = exit + 5 * 60 * 1000; // 5 minutes later

    const sess1 = new SaveSystem(storage);
    await sess1.init();
    salvageStore.setTotal(10);
    sess1.updateHubState({ lastHubExitMs: exit });
    await sess1.flushSave();

    salvageStore.reset();
    const sess2 = new SaveSystem(storage);
    const data = await sess2.init();

    const accrued = accruedSalvage(data.hubState.lastHubExitMs, reenter);
    expect(accrued).toBe(5);
    salvageStore.setTotal(data.totalSalvage + accrued);
    expect(salvageStore.total).toBe(15);
  });

  test('lastHubExitMs persists + restores via save', async () => {
    const exit = 1_700_000_000_000;
    const sess1 = new SaveSystem(storage);
    await sess1.init();
    sess1.updateHubState({ lastHubExitMs: exit });
    await sess1.flushSave();

    const sess2 = new SaveSystem(storage);
    const data = await sess2.init();
    expect(data.hubState.lastHubExitMs).toBe(exit);
  });

  test('autoRunEnabled persists + restores', async () => {
    const sess1 = new SaveSystem(storage);
    await sess1.init();
    sess1.updateHubState({ autoRunEnabled: true });
    await sess1.flushSave();

    const sess2 = new SaveSystem(storage);
    const data = await sess2.init();
    expect(data.hubState.autoRunEnabled).toBe(true);
    autoRunStore.setEnabled(data.hubState.autoRunEnabled);
    expect(autoRunStore.enabled).toBe(true);
  });

  test('first-ever load (lastHubExitMs=0) accrues 0', async () => {
    const sess = new SaveSystem(storage);
    const data = await sess.init();
    expect(data.hubState.lastHubExitMs).toBe(0);
    expect(accruedSalvage(data.hubState.lastHubExitMs, Date.now())).toBe(0);
  });

  test('v1 save migrates to v5 with lastHubExitMs=0 (no idle on first load post-migration)', async () => {
    storage.setRaw({ saveVersion: 1, totalSalvage: 0, lastSaved: 'x' });
    const sess = new SaveSystem(storage);
    const data = await sess.init();
    expect(data.saveVersion).toBe(5);
    expect(data.hubState.lastHubExitMs).toBe(0);
    expect(data.hubState.autoRunEnabled).toBe(false);
  });
});
