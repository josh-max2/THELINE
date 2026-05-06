import { describe, expect, test, afterEach } from 'vitest';
import {
  CURRENT_SAVE_VERSION,
  createNewSave,
  defaultHubState,
  isValidV1,
  isValidV2,
  isValidV3,
  migrateSave,
  __registerTestMigrationV0toV1,
} from '../../src/lib/saveSchema';

describe('saveSchema constants', () => {
  test('CURRENT_SAVE_VERSION is 3 (Phase 5 Task 5.3)', () => {
    expect(CURRENT_SAVE_VERSION).toBe(3);
  });
});

describe('createNewSave', () => {
  test('produces a valid v3 save', () => {
    const save = createNewSave();
    expect(save.saveVersion).toBe(3);
    expect(save.totalSalvage).toBe(0);
    expect(typeof save.lastSaved).toBe('string');
    expect(new Date(save.lastSaved).toString()).not.toBe('Invalid Date');
    expect(isValidV3(save)).toBe(true);
  });

  test('includes default hubState with empty purchasedTechIds', () => {
    const save = createNewSave();
    expect(save.hubState.modulesOwned).toContain('basic-cannon');
    expect(save.hubState.crewRoster).toHaveLength(4);
    expect(save.hubState.trainLayout).toEqual(['engine', 'weapon', 'armor', 'crew', 'cargo']);
    expect(save.hubState.completedRuns).toBe(0);
    expect(save.hubState.purchasedTechIds).toEqual([]);
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
  test('accepts a well-formed v2 save (legacy)', () => {
    expect(
      isValidV2({
        saveVersion: 2,
        totalSalvage: 0,
        lastSaved: 'x',
        hubState: {
          modulesOwned: ['basic-cannon'],
          crewRoster: [],
          trainLayout: ['engine'],
          completedRuns: 0,
        },
      }),
    ).toBe(true);
  });

  test('rejects v1 saves', () => {
    expect(isValidV2({ saveVersion: 1, totalSalvage: 0, lastSaved: 'x' })).toBe(false);
  });

  test('rejects v3 saves', () => {
    expect(isValidV2(createNewSave())).toBe(false);
  });
});

describe('isValidV3', () => {
  test('accepts a well-formed v3 save', () => {
    expect(isValidV3(createNewSave())).toBe(true);
  });

  test('rejects v2 saves (missing purchasedTechIds)', () => {
    expect(
      isValidV3({
        saveVersion: 2,
        totalSalvage: 0,
        lastSaved: 'x',
        hubState: {
          modulesOwned: [],
          crewRoster: [],
          trainLayout: [],
          completedRuns: 0,
        },
      }),
    ).toBe(false);
  });

  test('rejects null / non-object', () => {
    expect(isValidV3(null)).toBe(false);
    expect(isValidV3('hello')).toBe(false);
    expect(isValidV3(42)).toBe(false);
    expect(isValidV3([])).toBe(false);
  });

  test('rejects missing hubState', () => {
    expect(isValidV3({ saveVersion: 3, totalSalvage: 0, lastSaved: 'x' })).toBe(false);
  });

  test('rejects malformed purchasedTechIds', () => {
    expect(
      isValidV3({
        saveVersion: 3,
        totalSalvage: 0,
        lastSaved: 'x',
        hubState: {
          modulesOwned: [],
          crewRoster: [],
          trainLayout: [],
          completedRuns: 0,
          purchasedTechIds: 'not-array',
        },
      }),
    ).toBe(false);
  });
});

describe('migrateSave — current-version round-trip', () => {
  test('passes through a valid v3 save unchanged', () => {
    const v3 = createNewSave();
    expect(migrateSave(v3)).toEqual(v3);
  });
});

describe('migrateSave — v1 → v3 chain', () => {
  test('preserves totalSalvage from v1 → v3', () => {
    const v1 = { saveVersion: 1, totalSalvage: 137, lastSaved: '2026-05-04T10:00:00Z' };
    const migrated = migrateSave(v1);
    expect(migrated.saveVersion).toBe(3);
    expect(migrated.totalSalvage).toBe(137);
  });

  test('preserves lastSaved from v1 through both migration steps', () => {
    const v1 = { saveVersion: 1, totalSalvage: 0, lastSaved: '2026-05-04T10:00:00Z' };
    const migrated = migrateSave(v1);
    expect(migrated.lastSaved).toBe('2026-05-04T10:00:00Z');
  });

  test('v1 ends up with default v3 hubState (incl. empty purchasedTechIds)', () => {
    const v1 = { saveVersion: 1, totalSalvage: 50, lastSaved: 'x' };
    const migrated = migrateSave(v1);
    expect(migrated.hubState).toEqual(defaultHubState());
    expect(migrated.hubState.purchasedTechIds).toEqual([]);
  });

  test('migrated chain produces a valid V3', () => {
    const v1 = { saveVersion: 1, totalSalvage: 0, lastSaved: 'x' };
    expect(isValidV3(migrateSave(v1))).toBe(true);
  });
});

describe('migrateSave — v2 → v3 (Task 5.3)', () => {
  const v2 = {
    saveVersion: 2,
    totalSalvage: 200,
    lastSaved: '2026-05-04T10:00:00Z',
    hubState: {
      modulesOwned: ['basic-cannon', 'gatling'],
      crewRoster: [{ id: 0, color: '#fff' }],
      trainLayout: ['engine', 'weapon'],
      completedRuns: 7,
    },
  };

  test('preserves totalSalvage', () => {
    expect(migrateSave(v2).totalSalvage).toBe(200);
  });

  test('preserves all v2 hubState fields', () => {
    const m = migrateSave(v2);
    expect(m.hubState.modulesOwned).toEqual(['basic-cannon', 'gatling']);
    expect(m.hubState.completedRuns).toBe(7);
    expect(m.hubState.trainLayout).toEqual(['engine', 'weapon']);
  });

  test('seeds purchasedTechIds as []', () => {
    expect(migrateSave(v2).hubState.purchasedTechIds).toEqual([]);
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

describe('migrateSave — framework chains v0 → v1 → v2 → v3', () => {
  let unregister: (() => void) | undefined;

  afterEach(() => {
    if (unregister) {
      unregister();
      unregister = undefined;
    }
  });

  test('v0 save chains through v0→v1→v2→v3 to current shape', () => {
    unregister = __registerTestMigrationV0toV1();
    const v0 = { saveVersion: 0, salvage: 99 };
    const migrated = migrateSave(v0);
    expect(migrated.saveVersion).toBe(3);
    // v0→v1 maps `salvage` → `totalSalvage`; v1→v2→v3 preserves it.
    expect(migrated.totalSalvage).toBe(99);
    expect(migrated.hubState).toEqual(defaultHubState());
    expect(isValidV3(migrated)).toBe(true);
  });
});
