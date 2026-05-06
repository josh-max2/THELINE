import localforage from 'localforage';
import { migrateSave, type SaveData } from './saveSchema';

/**
 * Storage adapter for the SaveSystem. Production uses LocalforageStorage
 * (IndexedDB-backed); tests use InMemoryStorage. The interface keeps the
 * Phaser-aware SaveSystem from caring about either.
 */
export interface SaveStorage {
  save(data: SaveData): Promise<void>;
  /**
   * Returns the migrated current-shape save, or null if none exists or the
   * stored data is unrecoverable. Does NOT throw on corruption — load failure
   * means "start fresh," logged to console for diagnosis.
   */
  load(): Promise<SaveData | null>;
  clear(): Promise<void>;
}

const SAVE_KEY = 'the-line:save';

export class LocalforageStorage implements SaveStorage {
  constructor() {
    localforage.config({
      name: 'the-line',
      storeName: 'save',
      description: 'THE LINE — persistent player progress',
    });
  }

  async save(data: SaveData): Promise<void> {
    await localforage.setItem(SAVE_KEY, data);
  }

  async load(): Promise<SaveData | null> {
    let raw: unknown;
    try {
      raw = await localforage.getItem(SAVE_KEY);
    } catch (err) {
      console.warn('[SaveSystem] localforage.getItem threw — starting fresh.', err);
      return null;
    }
    if (raw == null) return null;
    try {
      return migrateSave(raw);
    } catch (err) {
      console.warn('[SaveSystem] save data unreadable, starting fresh.', err);
      return null;
    }
  }

  async clear(): Promise<void> {
    await localforage.removeItem(SAVE_KEY);
  }
}

/** Test-friendly storage with no persistence. Constructed fresh per test. */
export class InMemoryStorage implements SaveStorage {
  private stored: unknown = null;

  async save(data: SaveData): Promise<void> {
    // Clone to mimic localforage round-trip.
    this.stored = JSON.parse(JSON.stringify(data));
  }

  async load(): Promise<SaveData | null> {
    if (this.stored == null) return null;
    try {
      return migrateSave(this.stored);
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    this.stored = null;
  }

  /** Tests use this to seed a "save from prior version" scenario. */
  setRaw(raw: unknown): void {
    this.stored = raw;
  }

  getRaw(): unknown {
    return this.stored;
  }
}
