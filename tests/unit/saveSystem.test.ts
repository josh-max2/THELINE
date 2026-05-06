import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { SaveSystem } from '../../src/systems/SaveSystem';
import { InMemoryStorage } from '../../src/lib/saveStorage';
import { salvageStore } from '../../src/lib/salvageStore';
import { defaultHubState } from '../../src/lib/saveSchema';

let storage: InMemoryStorage;
let system: SaveSystem;

beforeEach(() => {
  storage = new InMemoryStorage();
  system = new SaveSystem(storage);
  salvageStore.reset();
});

afterEach(() => {
  salvageStore.reset();
});

describe('SaveSystem.init', () => {
  test('creates a fresh save when no data exists, persists it', async () => {
    const data = await system.init();
    expect(data.saveVersion).toBe(2);
    expect(data.totalSalvage).toBe(0);
    expect(salvageStore.total).toBe(0);
    expect(await storage.load()).not.toBeNull();
  });

  test('loads existing save and restores salvageStore', async () => {
    await storage.save({
      saveVersion: 2,
      totalSalvage: 42,
      hubState: defaultHubState(),
      lastSaved: '2026-05-05T12:00:00Z',
    });
    const data = await system.init();
    expect(data.totalSalvage).toBe(42);
    expect(salvageStore.total).toBe(42);
  });

  test('restoring fires only one listener notification (no flicker)', async () => {
    await storage.save({
      saveVersion: 2,
      totalSalvage: 7,
      hubState: defaultHubState(),
      lastSaved: '2026-05-05T12:00:00Z',
    });
    const calls: number[] = [];
    const unsub = salvageStore.subscribe((v) => calls.push(v));
    await system.init();
    unsub();
    expect(calls).toEqual([7]); // single fire — no intermediate 0 → 7 flicker
  });

  test('migrates v1 → v2 on load and preserves totalSalvage', async () => {
    storage.setRaw({ saveVersion: 1, totalSalvage: 99, lastSaved: '2026-05-04T10:00:00Z' });
    const data = await system.init();
    expect(data.saveVersion).toBe(2);
    expect(data.totalSalvage).toBe(99);
    expect(data.hubState).toEqual(defaultHubState());
  });
});

describe('SaveSystem.flushSave', () => {
  test('writes current salvageStore total to storage', async () => {
    await system.init();
    salvageStore.add(5);
    salvageStore.add(3);
    await system.flushSave();
    const loaded = await storage.load();
    expect(loaded?.totalSalvage).toBe(8);
  });

  test('updates lastSaved with each flush', async () => {
    await system.init();
    const t0 = (await storage.load())!.lastSaved;
    // Hold for a millisecond so the ISO string differs.
    await new Promise((r) => setTimeout(r, 5));
    await system.flushSave();
    const t1 = (await storage.load())!.lastSaved;
    expect(t1).not.toBe(t0);
  });
});

describe('SaveSystem.update — auto-save interval', () => {
  test('does not auto-save before 30s elapsed', async () => {
    await system.init();
    salvageStore.add(1);
    system.update(10); // 10s
    system.update(10); // 20s
    // No auto-save fired yet — storage should still hold the init's totalSalvage=0.
    const loaded = await storage.load();
    expect(loaded?.totalSalvage).toBe(0);
  });

  test('auto-saves once 30s threshold crosses', async () => {
    await system.init();
    salvageStore.add(11);
    system.update(20);
    system.update(11); // crosses 30s
    // Auto-save is fire-and-forget; let microtasks flush.
    await new Promise((r) => setTimeout(r, 0));
    const loaded = await storage.load();
    expect(loaded?.totalSalvage).toBe(11);
  });

  test('counter resets after auto-save fires (next save needs another 30s)', async () => {
    await system.init();
    salvageStore.add(1);
    system.update(31); // first auto-save
    await new Promise((r) => setTimeout(r, 0));

    salvageStore.add(99);
    system.update(10); // only 10s since last auto-save
    await new Promise((r) => setTimeout(r, 0));

    // Storage should reflect the FIRST auto-save (totalSalvage=1), not the bumped 100.
    const loaded = await storage.load();
    expect(loaded?.totalSalvage).toBe(1);
  });
});
