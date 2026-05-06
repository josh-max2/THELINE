import { describe, expect, test, afterEach } from 'vitest';
import {
  CURRENT_SAVE_VERSION,
  createNewSave,
  defaultHubState,
  isValidV1,
  isValidV2,
  migrateSave,
  __registerTestMigrationV0toV1,
} from '../../src/lib/saveSchema';

describe('saveSchema constants', () => {
  test('CURRENT_SAVE_VERSION is 2 (Phase 4 Task 4.10)', () => {
    expect(CURRENT_SAVE_VERSION).toBe(2);
  });
});

describe('createNewSave', () => {
  test('produces a valid v2 save', () => {
    const save = createNewSave();
    expect(save.saveVersion).toBe(2);
    expect(save.totalSalvage).toBe(0);
    expect(typeof save.lastSaved).toBe('string');
    expect(new Date(save.lastSaved).toString()).not.toBe('Invalid Date');
    expect(isValidV2(save)).toBe(true);
  });

  test('includes default hubState', () => {
    const save = createNewSave();
    expect(save.hubState.modulesOwned).toContain('basic-cannon');
    expect(save.hubState.crewRoster).toHaveLength(4);
    expect(save.hubState.trainLayout).toEqual(['engine', 'weapon', 'armor', 'crew', 'cargo']);
    expect(save.hubState.completedRuns).toBe(0);
  });
});

describe('isValidV1', () => {
  test('still accepts well-formed v1 saves (legacy support)', () => {
    expect(isValidV1({ saveVersion: 1, totalSalvage: 42, lastSaved: '2026-05-05T12:00:00Z' })).toBe(true);
  });

  test('rejects v2-shaped saves (different version)', () => {
    expect(isValidV1(createNewSave())).toBe(false);
  });
});

describe('isValidV2', () => {
  test('accepts a well-formed v2 save', () => {
    expect(isValidV2(createNewSave())).toBe(true);
  });

  test('rejects v1 saves', () => {
    expect(isValidV2({ saveVersion: 1, totalSalvage: 0, lastSaved: 'x' })).toBe(false);
  });

  test('rejects null / non-object', () => {
    expect(isValidV2(null)).toBe(false);
    expect(isValidV2('hello')).toBe(false);
    expect(isValidV2(42)).toBe(false);
    expect(isValidV2([])).toBe(false);
  });

  test('rejects missing hubState', () => {
    expect(isValidV2({ saveVersion: 2, totalSalvage: 0, lastSaved: 'x' })).toBe(false);
  });

  test('rejects malformed hubState', () => {
    expect(
      isValidV2({
        saveVersion: 2,
        totalSalvage: 0,
        lastSaved: 'x',
        hubState: { modulesOwned: 'not-array' },
      }),
    ).toBe(false);
  });
});

describe('migrateSave — current-version round-trip', () => {
  test('passes through a valid v2 save unchanged', () => {
    const v2 = createNewSave();
    expect(migrateSave(v2)).toEqual(v2);
  });
});

describe('migrateSave — v1 → v2 migration (Task 4.10)', () => {
  test('preserves totalSalvage from v1', () => {
    const v1 = { saveVersion: 1, totalSalvage: 137, lastSaved: '2026-05-04T10:00:00Z' };
    const migrated = migrateSave(v1);
    expect(migrated.saveVersion).toBe(2);
    expect(migrated.totalSalvage).toBe(137);
  });

  test('preserves lastSaved from v1', () => {
    const v1 = { saveVersion: 1, totalSalvage: 0, lastSaved: '2026-05-04T10:00:00Z' };
    const migrated = migrateSave(v1);
    expect(migrated.lastSaved).toBe('2026-05-04T10:00:00Z');
  });

  test('initializes hubState with default values', () => {
    const v1 = { saveVersion: 1, totalSalvage: 50, lastSaved: 'x' };
    const migrated = migrateSave(v1);
    expect(migrated.hubState).toEqual(defaultHubState());
  });

  test('migrated save is valid V2', () => {
    const v1 = { saveVersion: 1, totalSalvage: 0, lastSaved: 'x' };
    expect(isValidV2(migrateSave(v1))).toBe(true);
  });
});

describe('migrateSave — error paths', () => {
  test('throws on null / wrong types', () => {
    expect(() => migrateSave(null)).toThrow(/not an object/);
    expect(() => migrateSave('hello')).toThrow(/not an object/);
    expect(() => migrateSave(42)).toThrow(/not an object/);
    expect(() => migrateSave([])).toThrow(/not an object/);
  });

  test('throws on missing saveVersion', () => {
    expect(() => migrateSave({ totalSalvage: 0, lastSaved: 'x' })).toThrow(/saveVersion/);
  });

  test('throws on saveVersion from the future', () => {
    expect(() => migrateSave({ saveVersion: 999, totalSalvage: 0, lastSaved: 'x' })).toThrow(
      /newer build/,
    );
  });

  test('throws when no migration is registered for an older version (v0)', () => {
    // No v0→v1 migration is registered in production. Loading a v0 save should fail loud.
    expect(() => migrateSave({ saveVersion: 0, salvage: 5 })).toThrow(/No migration registered/);
  });
});

describe('migrateSave — framework chains v0 → v1 → v2', () => {
  let unregister: (() => void) | undefined;

  afterEach(() => {
    if (unregister) {
      unregister();
      unregister = undefined;
    }
  });

  test('v0 save chains through v0→v1→v2 to current shape', () => {
    unregister = __registerTestMigrationV0toV1();
    const v0 = { saveVersion: 0, salvage: 99 };
    const migrated = migrateSave(v0);
    expect(migrated.saveVersion).toBe(2);
    // v0→v1 maps `salvage` → `totalSalvage`; v1→v2 preserves it.
    expect(migrated.totalSalvage).toBe(99);
    expect(migrated.hubState).toEqual(defaultHubState());
    expect(isValidV2(migrated)).toBe(true);
  });
});
