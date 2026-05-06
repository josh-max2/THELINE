import { describe, expect, test } from 'vitest';
import {
  resolveCell,
  biomeData,
  validateMatrixCompleteness,
  ENVIRONMENT_MATRIX,
  BIOMES,
} from '../../src/lib/environmentMath';
import type { BiomeId, WeaponDamageType } from '../../src/lib/types';

const DAMAGE_TYPES: WeaponDamageType[] = ['kinetic', 'fire', 'cryo', 'explosive', 'electric'];
const BIOME_IDS: BiomeId[] = ['rock', 'forest', 'sand', 'swamp', 'snow'];

describe('environment matrix completeness', () => {
  test('validateMatrixCompleteness does not throw', () => {
    expect(() => validateMatrixCompleteness()).not.toThrow();
  });

  test('all 25 cells exist', () => {
    for (const d of DAMAGE_TYPES) {
      for (const b of BIOME_IDS) {
        expect(ENVIRONMENT_MATRIX[d][b]).toBeDefined();
      }
    }
  });

  test('all biomes defined', () => {
    for (const b of BIOME_IDS) {
      expect(BIOMES[b]).toBeDefined();
      expect(BIOMES[b].name).toBeTruthy();
      expect(BIOMES[b].tint).toMatch(/^#/);
    }
  });
});

describe('resolveCell — signature DESIGN §8 cells', () => {
  test('fire + forest → wildfire (high damage, long duration)', () => {
    const cell = resolveCell('fire', 'forest');
    expect(cell.effect).toBe('wildfire');
    expect(cell.damagePerSec).toBeGreaterThan(5);
    expect(cell.durationSec).toBeGreaterThanOrEqual(5);
  });

  test('cryo + snow → 2× duration vs other cryo cells', () => {
    const snow = resolveCell('cryo', 'snow');
    const rock = resolveCell('cryo', 'rock');
    expect(snow.durationSec).toBeGreaterThanOrEqual(rock.durationSec * 2);
  });

  test('electric + swamp → chain (highest electric damage)', () => {
    const swamp = resolveCell('electric', 'swamp');
    const rock = resolveCell('electric', 'rock');
    expect(swamp.effect).toBe('chain-lightning');
    expect(swamp.damagePerSec).toBeGreaterThan(rock.damagePerSec);
  });

  test('explosive + sand → glass shrapnel', () => {
    const cell = resolveCell('explosive', 'sand');
    expect(cell.effect).toBe('glass-shrapnel');
  });
});

describe('resolveCell — error paths', () => {
  test('throws on unknown damage type', () => {
    expect(() => resolveCell('unknown' as WeaponDamageType, 'rock')).toThrow(/damage type/);
  });

  test('throws on unknown biome', () => {
    expect(() => resolveCell('kinetic', 'unknown' as BiomeId)).toThrow(/biome/);
  });
});

describe('biomeData', () => {
  test('returns the biome record', () => {
    expect(biomeData('forest').name).toBe('Forest');
  });

  test('throws on unknown id', () => {
    expect(() => biomeData('unknown' as BiomeId)).toThrow();
  });
});
