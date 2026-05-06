// Pure environment-matrix lookup. Per ADR-003 + DESIGN §8.
// No Phaser. Phase 5 Task 5.2 wires damage zones at weapon impacts using
// resolveCell() to pick the correct effect template.

import environmentMatrixRaw from '../data/environment-matrix.json';
import biomesRaw from '../data/biomes.json';
import type { BiomeId, BiomeData, EnvironmentCell, EnvironmentMatrix, WeaponDamageType } from './types';

export const ENVIRONMENT_MATRIX = environmentMatrixRaw as unknown as EnvironmentMatrix;
export const BIOMES = biomesRaw as unknown as Record<BiomeId, BiomeData>;

/**
 * Resolve the (damageType, biome) cell. Throws on bad keys — caller must
 * ensure both come from the typed enums.
 */
export function resolveCell(damageType: WeaponDamageType, biome: BiomeId): EnvironmentCell {
  const row = ENVIRONMENT_MATRIX[damageType];
  if (!row) throw new Error(`Unknown damage type: ${damageType}`);
  const cell = row[biome];
  if (!cell) throw new Error(`Unknown biome ${biome} for damage type ${damageType}`);
  return cell;
}

export function biomeData(id: BiomeId): BiomeData {
  const b = BIOMES[id];
  if (!b) throw new Error(`Unknown biome id: ${id}`);
  return b;
}

/** Sanity check: every (damageType, biomeId) pair has a defined cell. */
export function validateMatrixCompleteness(): void {
  const damageTypes: WeaponDamageType[] = ['kinetic', 'fire', 'cryo', 'explosive', 'electric'];
  const biomes: BiomeId[] = ['rock', 'forest', 'sand', 'swamp', 'snow'];
  for (const d of damageTypes) {
    for (const b of biomes) {
      if (!ENVIRONMENT_MATRIX[d]?.[b]) {
        throw new Error(`Missing matrix cell: ${d}.${b}`);
      }
    }
  }
}
