// Save schema + migration runner. Pure — no Phaser, no localforage, no DOM.
// Per CLAUDE.md hard rule "Save versioning is sacred. Every save change
// requires a migration." The framework lives here even at v1 (identity),
// so Phase 4's bump to v2 is one entry in MIGRATIONS away.

export const CURRENT_SAVE_VERSION = 1;

export interface SaveDataV1 {
  saveVersion: 1;
  totalSalvage: number;
  /** ISO 8601 timestamp. */
  lastSaved: string;
}

/** The shape callers should treat as the canonical "current save". */
export type SaveData = SaveDataV1;

/** A migration takes the previous version's shape and returns the next version's shape. */
type Migration = (prev: unknown) => unknown;

/**
 * Migrations indexed by FROM-version. To bump to v2, add `1: (v1) => v2`.
 * Each migration must produce data that the *next* migration (or final
 * validator) accepts.
 */
const MIGRATIONS: Record<number, Migration> = {
  // No prior versions. Reserved.
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
  if (!isValidV1(current)) {
    throw new Error('Save data failed v1 validation after migration');
  }
  return current;
}

/** Build a fresh save with default values. */
export function createNewSave(): SaveData {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    totalSalvage: 0,
    lastSaved: new Date().toISOString(),
  };
}

/** Runtime validator for the current shape. */
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

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

// ─── Test-only export for migration-framework verification ────────────────
//
// We have never shipped v0, but we still want a unit test that proves the
// migration framework actually runs migrations end-to-end. This stub
// migration is registered only when `__registerTestMigration` is called from
// a test, then unregistered. Production code never sees it.

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
