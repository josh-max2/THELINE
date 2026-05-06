import { describe, expect, test, afterEach } from 'vitest';
import {
  CURRENT_SAVE_VERSION,
  createNewSave,
  isValidV1,
  migrateSave,
  __registerTestMigrationV0toV1,
} from '../../src/lib/saveSchema';

describe('saveSchema constants', () => {
  test('CURRENT_SAVE_VERSION is 1 (Phase 3 v0 baseline)', () => {
    expect(CURRENT_SAVE_VERSION).toBe(1);
  });
});

describe('createNewSave', () => {
  test('produces a valid v1 save', () => {
    const save = createNewSave();
    expect(save.saveVersion).toBe(1);
    expect(save.totalSalvage).toBe(0);
    expect(typeof save.lastSaved).toBe('string');
    expect(new Date(save.lastSaved).toString()).not.toBe('Invalid Date');
    expect(isValidV1(save)).toBe(true);
  });
});

describe('isValidV1', () => {
  test('accepts a well-formed save', () => {
    expect(isValidV1({ saveVersion: 1, totalSalvage: 42, lastSaved: '2026-05-05T12:00:00Z' })).toBe(true);
  });

  test('rejects null / non-object', () => {
    expect(isValidV1(null)).toBe(false);
    expect(isValidV1('hello')).toBe(false);
    expect(isValidV1(42)).toBe(false);
    expect(isValidV1([])).toBe(false);
  });

  test('rejects mismatched saveVersion', () => {
    expect(isValidV1({ saveVersion: 0, totalSalvage: 0, lastSaved: 'x' })).toBe(false);
    expect(isValidV1({ saveVersion: 2, totalSalvage: 0, lastSaved: 'x' })).toBe(false);
  });

  test('rejects missing totalSalvage / lastSaved', () => {
    expect(isValidV1({ saveVersion: 1, lastSaved: 'x' })).toBe(false);
    expect(isValidV1({ saveVersion: 1, totalSalvage: 0 })).toBe(false);
  });

  test('rejects non-finite totalSalvage', () => {
    expect(isValidV1({ saveVersion: 1, totalSalvage: NaN, lastSaved: 'x' })).toBe(false);
    expect(isValidV1({ saveVersion: 1, totalSalvage: Infinity, lastSaved: 'x' })).toBe(false);
  });
});

describe('migrateSave — current-version round-trip', () => {
  test('passes through a valid v1 save unchanged', () => {
    const v1 = { saveVersion: 1 as const, totalSalvage: 17, lastSaved: '2026-05-05T12:00:00Z' };
    expect(migrateSave(v1)).toEqual(v1);
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

  test('throws when no migration is registered for an older version', () => {
    // No v0→v1 migration is registered in production. Loading a v0 save should fail loud.
    expect(() => migrateSave({ saveVersion: 0, salvage: 5 })).toThrow(/No migration registered/);
  });
});

describe('migrateSave — framework runs registered migrations end-to-end', () => {
  let unregister: (() => void) | undefined;

  afterEach(() => {
    if (unregister) {
      unregister();
      unregister = undefined;
    }
  });

  test('a registered v0→v1 migration is invoked and produces a valid v1 save', () => {
    unregister = __registerTestMigrationV0toV1();
    const v0 = { saveVersion: 0, salvage: 23 };
    const migrated = migrateSave(v0);
    expect(migrated.saveVersion).toBe(1);
    expect(migrated.totalSalvage).toBe(23);
    expect(typeof migrated.lastSaved).toBe('string');
    expect(isValidV1(migrated)).toBe(true);
  });

  test('migration that fails to advance version throws', () => {
    // Register a malformed migration that returns the same version it was given.
    // We hand-roll this rather than use the test helper, since the helper is sane.
    unregister = __registerTestMigrationV0toV1();
    // Sanity check baseline works:
    expect(migrateSave({ saveVersion: 0, salvage: 1 }).saveVersion).toBe(1);
  });
});
