// Visual-only effects system: hit flashes, kill bursts, muzzle flashes, screen
// shake. Per Task 5.5.
//
// All effects are short-lived Graphics objects animated by Phaser tweens; the
// heavy work (camera shake) delegates to Phaser's camera.shake. Pure decision
// logic lives in shakeMath.ts.

// Type-only import — runtime access via ctor scene only (see moduleBehaviors).
import type Phaser from 'phaser';
import { SHAKE_PRESETS, type ShakeTier } from '../lib/shakeMath';
import { parseColor } from '../lib/color';

const HIT_FLASH_DEPTH = 50;
const KILL_BURST_DEPTH = 55;
const MUZZLE_FLASH_DEPTH = 50;

const HIT_FLASH_DURATION_MS = 120;
const KILL_BURST_DURATION_MS = 360;
const MUZZLE_FLASH_DURATION_MS = 90;
const KILL_BURST_PARTICLES = 6;

export class EffectsSystem {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Brief white circle at the impact point — quick contrast burst on hit. */
  spawnHitFlash(x: number, y: number, radius = 6): void {
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(HIT_FLASH_DEPTH);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(0, 0, radius);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.6,
      duration: HIT_FLASH_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /**
   * Radial burst of small triangles in the enemy's tint — the kill flourish.
   * Particle count is fixed (6 in v0) since we expect lots of these per frame.
   */
  spawnKillBurst(x: number, y: number, colorHex: string): void {
    const color = parseColor(colorHex);
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(KILL_BURST_DEPTH);
    g.fillStyle(color, 0.85);

    // Six small triangles fanning out. Compute end positions, draw at origin,
    // then tween the *Graphics* itself outward — cheaper than per-particle
    // graphics and visually indistinguishable for a 360ms flourish.
    const radius = 4;
    for (let i = 0; i < KILL_BURST_PARTICLES; i++) {
      const angle = (i / KILL_BURST_PARTICLES) * Math.PI * 2;
      const cx = Math.cos(angle) * 3;
      const cy = Math.sin(angle) * 3;
      g.fillTriangle(
        cx, cy - radius,
        cx + radius * 0.8, cy + radius * 0.6,
        cx - radius * 0.8, cy + radius * 0.6,
      );
    }
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 2.4,
      duration: KILL_BURST_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /** Quick yellow triangle pointing toward `targetX/targetY` from `(x, y)`. */
  spawnMuzzleFlash(x: number, y: number, targetX: number, targetY: number): void {
    const dx = targetX - x;
    const dy = targetY - y;
    const angle = Math.atan2(dy, dx);
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(MUZZLE_FLASH_DEPTH);
    g.fillStyle(0xffe080, 0.95);
    // Triangle pointing along +x; we rotate the Graphics object via setRotation.
    g.fillTriangle(0, -3, 10, 0, 0, 3);
    g.setRotation(angle);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.6,
      duration: MUZZLE_FLASH_DURATION_MS,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /** Camera shake driven by a tier preset (see shakeMath). */
  shake(tier: ShakeTier): void {
    const preset = SHAKE_PRESETS[tier];
    if (preset.durationMs <= 0 || preset.intensity <= 0) return;
    this.scene.cameras.main.shake(preset.durationMs, preset.intensity);
  }
}
