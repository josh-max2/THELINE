import Phaser from 'phaser';
import type { ParallaxBackground } from '../lib/parallaxBackground';
import type { BiomeId, EnvironmentCell, WeaponDamageType } from '../lib/types';
import type { CombatSystem } from './CombatSystem';
import { biomeData, resolveCell } from '../lib/environmentMath';
import { fadeAlpha, tickDamage, ZONE_VISUAL_RADIUS } from '../lib/zoneMath';
import { parseColor } from '../lib/color';

interface ActiveZone {
  x: number;
  y: number;
  radius: number;
  cell: EnvironmentCell;
  elapsedSec: number;
  graphics: Phaser.GameObjects.Graphics;
}

/**
 * Holds the current biome AND active environmental damage zones.
 * Per ADR-003 (Phase 4: data + biome tint) + Task 5.2 (Phase 5: runtime zones).
 *
 * Zones spawn at weapon-impact locations (called from aoe-pulse behavior
 * handler). Each zone:
 *   - Damages enemies inside per `cell.damagePerSec` per frame.
 *   - Fades visual alpha linearly over `cell.durationSec`.
 *   - Self-destructs after duration elapses.
 */
export class EnvironmentSystem {
  private readonly scene: Phaser.Scene;
  private readonly parallax: ParallaxBackground;
  private currentBiome: BiomeId = 'rock';
  private readonly zones: ActiveZone[] = [];
  private combat?: CombatSystem;

  constructor(scene: Phaser.Scene, parallax: ParallaxBackground) {
    this.scene = scene;
    this.parallax = parallax;
  }

  /** Wire CombatSystem so zones can damage enemies via shared targeting. */
  bindCombatSystem(combat: CombatSystem): void {
    this.combat = combat;
  }

  setBiome(biome: BiomeId): void {
    if (biome === this.currentBiome) return;
    this.currentBiome = biome;
    this.parallax.setBiomeTint(biomeData(biome).tint);
  }

  biome(): BiomeId {
    return this.currentBiome;
  }

  /**
   * Spawn an environmental damage zone at (x, y) using the matrix cell for
   * (damageType, currentBiome). Called from the aoe-pulse behavior handler.
   */
  spawnZone(x: number, y: number, damageType: WeaponDamageType): void {
    const cell = resolveCell(damageType, this.currentBiome);
    if (cell.durationSec <= 0) return;

    const color = parseColor(cell.color);
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(15);
    g.fillStyle(color, 0.35);
    g.fillCircle(0, 0, ZONE_VISUAL_RADIUS);
    g.lineStyle(1, color, 0.6);
    g.strokeCircle(0, 0, ZONE_VISUAL_RADIUS);

    this.zones.push({ x, y, radius: ZONE_VISUAL_RADIUS, cell, elapsedSec: 0, graphics: g });
  }

  update(deltaSeconds: number): void {
    if (this.zones.length === 0) return;

    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.elapsedSec += deltaSeconds;

      if (this.combat && z.cell.damagePerSec > 0) {
        const dmg = tickDamage(z.cell.damagePerSec, deltaSeconds);
        if (dmg > 0) {
          for (const e of this.combat.enemiesInRadius(z.x, z.y, z.radius)) {
            this.combat.damageEnemy(e, dmg);
          }
        }
      }

      z.graphics.alpha = fadeAlpha(z.elapsedSec, z.cell.durationSec);

      if (z.elapsedSec >= z.cell.durationSec) {
        z.graphics.destroy();
        this.zones.splice(i, 1);
      }
    }
  }

  get activeZoneCount(): number {
    return this.zones.length;
  }

  destroy(): void {
    for (const z of this.zones) z.graphics.destroy();
    this.zones.length = 0;
  }
}
