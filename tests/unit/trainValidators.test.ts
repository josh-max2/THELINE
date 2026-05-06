import { describe, expect, test } from 'vitest';
import { canAddCar, TRAIN_MAX_LENGTH_V1 } from '../../src/lib/trainValidators';
import type { CarType } from '../../src/lib/types';

describe('canAddCar — v1 layout rules (ADR-001 §Gap 4)', () => {
  describe('first car must be Engine', () => {
    test('Engine first → ok', () => {
      expect(canAddCar([], 'engine')).toEqual({ ok: true });
    });

    test('Weapon first → rejected', () => {
      const result = canAddCar([], 'weapon');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('Engine');
    });

    test('Cargo first → rejected', () => {
      expect(canAddCar([], 'cargo').ok).toBe(false);
    });

    test('every non-engine first → rejected', () => {
      const others: CarType[] = ['weapon', 'armor', 'crew', 'cargo'];
      for (const t of others) expect(canAddCar([], t).ok).toBe(false);
    });
  });

  describe('only one Engine in v1', () => {
    test('second Engine → rejected', () => {
      const result = canAddCar([{ type: 'engine' }], 'engine');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('one Engine');
    });

    test('weapon after engine → ok', () => {
      expect(canAddCar([{ type: 'engine' }], 'weapon').ok).toBe(true);
    });
  });

  describe('train length cap', () => {
    test('adding 9th car (cap is 8) → rejected', () => {
      const eight: { type: CarType }[] = [
        { type: 'engine' },
        { type: 'weapon' },
        { type: 'weapon' },
        { type: 'armor' },
        { type: 'armor' },
        { type: 'crew' },
        { type: 'cargo' },
        { type: 'cargo' },
      ];
      expect(eight.length).toBe(TRAIN_MAX_LENGTH_V1);
      const result = canAddCar(eight, 'weapon');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('8');
    });

    test('adding 8th car still ok', () => {
      const seven: { type: CarType }[] = [
        { type: 'engine' },
        { type: 'weapon' },
        { type: 'armor' },
        { type: 'crew' },
        { type: 'cargo' },
        { type: 'weapon' },
        { type: 'armor' },
      ];
      expect(canAddCar(seven, 'cargo').ok).toBe(true);
    });

    test('custom maxLength override respected', () => {
      const result = canAddCar([{ type: 'engine' }], 'weapon', 1);
      expect(result.ok).toBe(false);
    });
  });

  describe('valid sequences', () => {
    test('full default-style train builds without rejection', () => {
      const seq: CarType[] = ['engine', 'weapon', 'armor', 'crew', 'cargo'];
      const built: { type: CarType }[] = [];
      for (const t of seq) {
        const r = canAddCar(built, t);
        expect(r.ok).toBe(true);
        built.push({ type: t });
      }
      expect(built).toHaveLength(5);
    });
  });
});
