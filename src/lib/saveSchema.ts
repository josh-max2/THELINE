// Save schema + migration runner. Pure — no Phaser, no localforage, no DOM.
// Per CLAUDE.md hard rule "Save versioning is sacred. Every save change
// requires a migration."

import { DEFAULT_CREW, type CarType } from './types';
import { DEFAULT_MASTER_VOLUME } from './audioMath';

export const CURRENT_SAVE_VERSION = 4;

// ─── Schema versions ──────────────────────────────────────────────────────

export interface SaveDataV1 {
  saveVersion: 1;
  totalSalvage: number;
  lastSaved: string;
}

/**
 * v2 added `hubState` for between-run UI; v3 extends HubState with
 * `purchasedTechIds` for Task 5.3 tech-tree progression.
 */
export interface SaveDataV2 {
  saveVersion: 2;
  totalSalvage: number;
  hubState: HubStateV2;
  lastSaved: string;
}

export interface SaveDataV3 {
  saveVersion: 3;
  totalSalvage: number;
  hubState: HubStateV3;
  lastSaved: string;
}

export interface SaveDataV4 {
  saveVersion: 4;
  totalSalvage: number;
  hubState: HubState;
  lastSaved: string;
}

export interface HubStateV3 {
  modulesOwned: string[];
  crewRoster: ReadonlyArray<{ id: number; color: string }>;
  trainLayout: CarType[];
  completedRuns: number;
  purchasedTechIds: string[];
}

export interface HubStateV2 {
  modulesOwned: string[];
  crewRoster: ReadonlyArray<{ id: number; color: string }>;
  trainLayout: CarType[];
  completedRuns: number;
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
  /** Tech-tree node ids the player has purchased. Consumer systems read via `activeUnlocks`. */
  purchasedTechIds: string[];
  /** Audio mute flag — persisted so the player's preference survives reloads. */
  audioMuted: boolean;
  /** Master volume in [0, 1]. Default DEFAULT_MASTER_VOLUME. */
  audioVolume: number;
}

/** Canonical "current save" shape. */
export type SaveData = SaveDataV4;

// ─── Defaults ─────────────────────────────────────────────────────────────

export function defaultHubState(): HubState {
  return {
    modulesOwned: ['basic-cannon'],
    // Derive from DEFAULT_CREW so Phase 5 expansion (named crew with specialties)
    // doesn't drift the save shape. Advisor catch — dedup hardcoded array.
    crewRoster: DEFAULT_CREW.map((c) => ({ id: c.id, color: c.color })),
    trainLayout: ['engine', 'weapon', 'armor', 'crew', 'cargo'],
    completedRuns: 0,
    purchasedTechIds: [],
    audioMuted: false,
    audioVolume: DEFAULT_MASTER_VOLUME,
  };
}

export function createNewSave(): SaveData {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    totalSalvage: 0,
    hubState: defaultHubState(),
    lastSaved: new Date().toISOString(),
  };
}

// ─── Migrations ───────────────────────────────────────────────────────────

type Migration = (prev: unknown) => unknown;

const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: keep totalSalvage + lastSaved verbatim, init hubState defaults.
  // (Walked through v3 directly for fresh installs; v1→v2 still needed for legacy saves.)
  1: (prev: unknown): unknown => {
    if (!isPlainObject(prev)) throw new Error('v1 migration: not an object');
    const v2HubDefaults = defaultHubState();
    return {
      saveVersion: 2,
      totalSalvage: typeof prev.totalSalvage === 'number' ? prev.totalSalvage : 0,
      hubState: {
        modulesOwned: v2HubDefaults.modulesOwned,
        crewRoster: v2HubDefaults.crewRoster,
        trainLayout: v2HubDefaults.trainLayout,
        completedRuns: v2HubDefaults.completedRuns,
      },
      lastSaved: typeof prev.lastSaved === 'string' ? prev.lastSaved : new Date().toISOString(),
    };
  },
  // v2 → v3: extend HubState with purchasedTechIds.
  2: (prev: unknown): unknown => {
    if (!isPlainObject(prev)) throw new Error('v2 migration: not an object');
    const prevHub = isPlainObject(prev.hubState) ? prev.hubState : {};
    return {
      saveVersion: 3,
      totalSalvage: typeof prev.totalSalvage === 'number' ? prev.totalSalvage : 0,
      hubState: {
        modulesOwned: Array.isArray(prevHub.modulesOwned) ? prevHub.modulesOwned : ['basic-cannon'],
        crewRoster: Array.isArray(prevHub.crewRoster)
          ? prevHub.crewRoster
          : DEFAULT_CREW.map((c) => ({ id: c.id, color: c.color })),
        trainLayout: Array.isArray(prevHub.trainLayout)
          ? prevHub.trainLayout
          : ['engine', 'weapon', 'armor', 'crew', 'cargo'],
        completedRuns: typeof prevHub.completedRuns === 'number' ? prevHub.completedRuns : 0,
        purchasedTechIds: [],
      },
      lastSaved: typeof prev.lastSaved === 'string' ? prev.lastSaved : new Date().toISOString(),
    };
  },
  // v3 → v4: extend HubState with audio prefs.
  3: (prev: unknown): unknown => {
    if (!isPlainObject(prev)) throw new Error('v3 migration: not an object');
    const prevHub = isPlainObject(prev.hubState) ? prev.hubState : {};
    return {
      saveVersion: 4,
      totalSalvage: typeof prev.totalSalvage === 'number' ? prev.totalSalvage : 0,
      hubState: {
        modulesOwned: Array.isArray(prevHub.modulesOwned) ? prevHub.modulesOwned : ['basic-cannon'],
        crewRoster: Array.isArray(prevHub.crewRoster)
          ? prevHub.crewRoster
          : DEFAULT_CREW.map((c) => ({ id: c.id, color: c.color })),
        trainLayout: Array.isArray(prevHub.trainLayout)
          ? prevHub.trainLayout
          : ['engine', 'weapon', 'armor', 'crew', 'cargo'],
        completedRuns: typeof prevHub.completedRuns === 'number' ? prevHub.completedRuns : 0,
        purchasedTechIds: Array.isArray(prevHub.purchasedTechIds) ? prevHub.purchasedTechIds : [],
        audioMuted: false,
        audioVolume: DEFAULT_MASTER_VOLUME,
      },
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
  if (!isValidV4(current)) {
    throw new Error('Save data failed v4 validation after migration');
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

export function isValidV3(data: unknown): data is SaveDataV3 {
  if (!isPlainObject(data)) return false;
  const r = data as Record<string, unknown>;
  if (
    r.saveVersion !== 3 ||
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
    typeof h.completedRuns === 'number' &&
    Array.isArray(h.purchasedTechIds)
  );
}

export function isValidV4(data: unknown): data is SaveDataV4 {
  if (!isPlainObject(data)) return false;
  const r = data as Record<string, unknown>;
  if (
    r.saveVersion !== 4 ||
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
    typeof h.completedRuns === 'number' &&
    Array.isArray(h.purchasedTechIds) &&
    typeof h.audioMuted === 'boolean' &&
    typeof h.audioVolume === 'number'
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
