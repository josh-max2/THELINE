import { describe, expect, test, beforeEach } from 'vitest';
import { InMemoryStorage } from '../../src/lib/saveStorage';
import { defaultHubState, type SaveData } from '../../src/lib/saveSchema';

let storage: InMemoryStorage;

beforeEach(() => {
  storage = new InMemoryStorage();
});

const sampleSave: SaveData = {
  saveVersion: 3,
  totalSalvage: 42,
  hubState: defaultHubState(),
  lastSaved: '2026-05-05T12:00:00.000Z',
};

describe('InMemoryStorage', () => {
  test('load() returns null when nothing saved', async () => {
    expect(await storage.load()).toBeNull();
  });

  test('save then load returns equal data (round-trip)', async () => {
    await storage.save(sampleSave);
    expect(await storage.load()).toEqual(sampleSave);
  });

  test('save deep-clones — caller mutation does not affect stored data', async () => {
    const mutable: SaveData = { ...sampleSave };
    await storage.save(mutable);
    mutable.totalSalvage = 999;
    const loaded = await storage.load();
    expect(loaded?.totalSalvage).toBe(42);
  });

  test('clear() empties storage', async () => {
    await storage.save(sampleSave);
    await storage.clear();
    expect(await storage.load()).toBeNull();
  });

  test('load() returns null on corrupted raw data (not throw)', async () => {
    storage.setRaw({ this: 'is not a save' });
    expect(await storage.load()).toBeNull();
  });

  test('load() returns null on null saveVersion', async () => {
    storage.setRaw({ saveVersion: 'v1', totalSalvage: 0, lastSaved: 'x' });
    expect(await storage.load()).toBeNull();
  });
});
