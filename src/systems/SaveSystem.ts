import type { SaveStorage } from '../lib/saveStorage';
import {
  CURRENT_SAVE_VERSION,
  createNewSave,
  defaultHubState,
  type HubState,
  type SaveData,
} from '../lib/saveSchema';
import { salvageStore } from '../lib/salvageStore';

const AUTO_SAVE_INTERVAL_SECONDS = 30;

/**
 * Orchestrates persistence:
 *   - init(): load existing save (with migration) or create fresh; restore salvage.
 *   - update(dt): periodic auto-save every AUTO_SAVE_INTERVAL_SECONDS.
 *   - registerLifecycleHandlers(): hook page-unload / visibility-hidden to
 *     flush pending state to disk before the tab dies.
 *   - flushSave(): manual save now (used by lifecycle handlers + auto-save).
 *
 * Storage is injected so tests can swap in InMemoryStorage.
 */
export class SaveSystem {
  private readonly storage: SaveStorage;
  private timeSinceLastSave = 0;
  private visibilityHandler?: () => void;
  private beforeUnloadHandler?: () => void;
  /** Cached hubState from last init/flush. Phase 5+ wires real Hub mutations through here. */
  private currentHubState: HubState = defaultHubState();

  constructor(storage: SaveStorage) {
    this.storage = storage;
  }

  /** Load (and migrate) saved data, or create a fresh save. Restores salvageStore. */
  async init(): Promise<SaveData> {
    const loaded = await this.storage.load();
    if (loaded) {
      salvageStore.setTotal(loaded.totalSalvage);
      this.currentHubState = loaded.hubState;
      return loaded;
    }
    const fresh = createNewSave();
    salvageStore.setTotal(0);
    this.currentHubState = fresh.hubState;
    await this.storage.save(fresh);
    return fresh;
  }

  /** Tick from scene update loop. Triggers auto-save when interval elapses. */
  update(deltaSeconds: number): void {
    this.timeSinceLastSave += deltaSeconds;
    if (this.timeSinceLastSave >= AUTO_SAVE_INTERVAL_SECONDS) {
      this.timeSinceLastSave = 0;
      // Fire-and-forget; we don't block the game loop on disk.
      void this.flushSave();
    }
  }

  /** Snapshot current state and persist. */
  async flushSave(): Promise<void> {
    const data: SaveData = {
      saveVersion: CURRENT_SAVE_VERSION,
      totalSalvage: salvageStore.total,
      hubState: this.currentHubState,
      lastSaved: new Date().toISOString(),
    };
    await this.storage.save(data);
  }

  /** Phase 5+ Engineering Bay/Tech Tree mutations call this to update Hub state. */
  updateHubState(patch: Partial<HubState>): void {
    this.currentHubState = { ...this.currentHubState, ...patch };
  }

  /**
   * Hook into the browser lifecycle so we don't lose state when the tab is
   * hidden or unloaded. Caller must provide window/document so SaveSystem
   * stays test-environment-agnostic.
   */
  registerLifecycleHandlers(win: Window, doc: Document): void {
    this.visibilityHandler = () => {
      if (doc.visibilityState === 'hidden') void this.flushSave();
    };
    this.beforeUnloadHandler = () => {
      // beforeunload runs synchronously; we kick off the save but can't await it.
      // localforage IndexedDB writes are best-effort here. Safari quirk: the
      // save sometimes lands, sometimes doesn't — visibility-hidden is the
      // more reliable hook.
      void this.flushSave();
    };
    doc.addEventListener('visibilitychange', this.visibilityHandler);
    win.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  destroy(win: Window, doc: Document): void {
    if (this.visibilityHandler) {
      doc.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = undefined;
    }
    if (this.beforeUnloadHandler) {
      win.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = undefined;
    }
  }
}
