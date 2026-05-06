// Save schema + migration runner. Pure — no Phaser, no localforage, no DOM.
// Per CLAUDE.md hard rule "Save versioning is sacred. Every save change
// requires a migration."

import type { CarType } from './types';

export const CURRENT_SAVE_VERSION = 2;

// ─── Schema versions ──────────────────────────────────────────────────────

export interface SaveDataV1 {
  saveVersion: 1;
  totalSalvage: number;
  lastSaved: string;
}

/**
 * v2 adds `hubState` to support Phase 4 Task 4.9's between-run UI:
 * persistent module unlocks, crew roster, train layout, completed-run count.
 * `totalSalvage` and `lastSaved` keep their semantics; only the inner shape grows.
 */
export interface SaveDataV2 {
  saveVersion: 2;
  totalSalvage: number;
  hubState: HubState;
  lastSaved: string;
}

export interface HubState {
  /** Module ids the player has unlocked across all runs (Phase 5 wires Engineering Bay). */
  modulesOwned: string[];
  /** Crew the player has recruited (v0 ships DEFAULT_CREW; Phase 5 expands). */
  crewRoster: ReadonlyArray<{ id: number; color: string }>;
  /** Train composition saved in the Engineering Bay. */
  trainLayout: CarType[];
  /** Lifetime count of completed runs. */
  completedRuns: number;
}

/** Canonical "current save" shape. */
export type SaveData = SaveDataV2;

// ─── Defaults ─────────────────────────────────────────────────────────────

export function defaultHubState(): HubState {
  return {
    modulesOwned: ['basic-cannon'],
    crewRoster: [
      { id: 0, color: '#e08040' },
      { id: 1, color: '#40a0e0' },
      { id: 2, color: '#80c060' },
      { id: 3, color: '#d8c040' },
    ],
    trainLayout: ['engine', 'weapon', 'armor', 'crew', 'cargo'],
    completedRuns: 0,
  };
}

export function createNewSave(): SaveData {
  return {
    saveVersion: 2,
    totalSalvage: 0,
    hubState: defaultHubState(),
    lastSaved: new Date().toISOString(),
  };
}

// ─── Migrations ───────────────────────────────────────────────────────────

type Migration = (prev: unknown) => unknown;

const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: keep totalSalvage + lastSaved verbatim, init hubState defaults.
  1: (prev: unknown): unknown => {
    if (!isPlainObject(prev)) throw new Error('v1 migration: not an object');
    return {
      saveVersion: 2,
      totalSalvage: typeof prev.totalSalvage === 'number' ? prev.totalSalvage : 0,
      hubState: defaultHubState(),
      lastSaved: typeof prev.lastSaved === 'string' ? prev.lastSaved : new Date().toISOString(),
    };
  },
};

/**
 * Walk a save through every migration until it matches CURRENT_SAVE_VERSION.
 * Throws on:
 *   - missing/non-numeric saveVersion
 *   - saveVersion higher than CURRENT_SAVE_VERSION (save from a future build)
 *   - missing migration for an older version
 *   - final validation failure
 */
export function migrateSave(raw: unknown): SaveData {
  if (!isPlainObject(raw)) {
    throw new Error('Save data is not an object');
  }
  let current: Record<string, unknown> = raw as Record<string, unknown>;
  const v = current.saveVersion;
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`Save data missing or invalid saveVersion (got: ${String(v)})`);
  }
  if (v > CURRENT_SAVE_VERSION) {
    throw new Error(
      `Save was written by a newer build (saveVersion=${v}, this build supports up to ${CURRENT_SAVE_VERSION}). Refusing to load.`,
    );
  }
  let version = v;
  while (version < CURRENT_SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      throw new Error(`No migration registered from saveVersion ${version}`);
    }
    const next = migrate(current);
    if (!isPlainObject(next)) {
      throw new Error(`Migration from v${version} did not return an object`);
    }
    current = next as Record<string, unknown>;
    const nv = current.saveVersion;
    if (typeof nv !== 'number' || nv <= version) {
      throw new Error(`Migration from v${version} did not advance the version field`);
    }
    version = nv;
  }
  if (!isValidV2(current)) {
    throw new Error('Save data failed v2 validation after migration');
  }
  return current;
}

// ─── Validators ───────────────────────────────────────────────────────────

export function isValidV1(data: unknown): data is SaveDataV1 {
  if (!isPlainObject(data)) return false;
  const r = data as Record<string, unknown>;
  return (
    r.saveVersion === 1 &&
    typeof r.totalSalvage === 'number' &&
    Number.isFinite(r.totalSalvage) &&
    typeof r.lastSaved === 'string'
  );
}

export function isValidV2(data: unknown): data is SaveDataV2 {
  if (!isPlainObject(data)) return false;
  const r = data as Record<string, unknown>;
  if (
    r.saveVersion !== 2 ||
    typeof r.totalSalvage !== 'number' ||
    !Number.isFinite(r.totalSalvage) ||
    typeof r.lastSaved !== 'string'
  ) {
    return false;
  }
  if (!isPlainObject(r.hubState)) return false;
  const h = r.hubState as Record<string, unknown>;
  return (
    Array.isArray(h.modulesOwned) &&
    Array.isArray(h.crewRoster) &&
    Array.isArray(h.trainLayout) &&
    typeof h.completedRuns === 'number'
  );
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

// ─── Test-only migration framework verification ───────────────────────────
// Phase 3's __registerTestMigrationV0toV1 hook stays for the framework
// regression test (proves the runner walks registered migrations end-to-end
// even though we never shipped v0).

export function __registerTestMigrationV0toV1(): () => void {
  if (MIGRATIONS[0]) {
    throw new Error('Test migration already registered');
  }
  MIGRATIONS[0] = (prev: unknown): unknown => {
    if (!isPlainObject(prev)) throw new Error('v0 migration: not an object');
    return {
      saveVersion: 1,
      totalSalvage: typeof prev.salvage === 'number' ? prev.salvage : 0,
      lastSaved: new Date().toISOString(),
    };
  };
  return () => {
    delete MIGRATIONS[0];
  };
}
