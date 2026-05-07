// Visual-only effects system: hit flashes, kill bursts, muzzle flashes, screen
// shake, sparks, damage numbers, shockwaves. Per Task 5.5 + Phase 6 juice pass.
//
// All effects are short-lived Graphics/Text objects animated by Phaser tweens;
// the heavy work (camera shake) delegates to Phaser's camera.shake. Pure
// decision logic lives in shakeMath.ts.

// Type-only import — runtime access via ctor scene only (see moduleBehaviors).
import type Phaser from 'phaser';
import { SHAKE_PRESETS, type ShakeTier } from '../lib/shakeMath';
import { parseColor } from '../lib/color';

const HIT_FLASH_DEPTH = 50;
const KILL_BURST_DEPTH = 55;
const MUZZLE_FLASH_DEPTH = 50;
const SPARK_DEPTH = 52;
const SHOCKWAVE_DEPTH = 54;
const DAMAGE_NUM_DEPTH = 60;

const HIT_FLASH_DURATION_MS = 140;
const KILL_BURST_DURATION_MS = 420;
const MUZZLE_FLASH_DURATION_MS = 110;
const SPARK_DURATION_MS = 320;
const SHOCKWAVE_DURATION_MS = 380;
const DAMAGE_NUM_DURATION_MS = 650;

const KILL_BURST_PARTICLES = 10;

/** Damage-type → spark color (matches behavior.color where possible). */
export const SPARK_COLORS = {
  kinetic: '#ffe080',
  fire: '#ff6020',
  cryo: '#a0d8ff',
  electric: '#c080ff',
  explosive: '#ff8040',
  generic: '#ffffff',
} as const;
export type SparkColorKey = keyof typeof SPARK_COLORS;

export class EffectsSystem {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Brief white circle at the impact point — quick contrast burst on hit.
   * Phase 6 juice: now triple-stack (outer halo + mid + core) so it reads as
   * a flash instead of a dot.
   */
  spawnHitFlash(x: number, y: number, radius = 6): void {
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(HIT_FLASH_DEPTH);
    // Outer halo — wide, soft.
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(0, 0, radius * 1.8);
    // Mid ring — tighter.
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(0, 0, radius * 1.1);
    // Core — hot white.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 0, radius * 0.55);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.8,
      duration: HIT_FLASH_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /**
   * Radial burst of small triangles in the enemy's tint — the kill flourish.
   * Phase 6: 10 particles instead of 6, plus a shockwave ring layered on.
   */
  spawnKillBurst(x: number, y: number, colorHex: string): void {
    const color = parseColor(colorHex);
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(KILL_BURST_DEPTH);
    g.fillStyle(color, 0.9);

    const radius = 5;
    for (let i = 0; i < KILL_BURST_PARTICLES; i++) {
      const angle = (i / KILL_BURST_PARTICLES) * Math.PI * 2;
      const cx = Math.cos(angle) * 4;
      const cy = Math.sin(angle) * 4;
      g.fillTriangle(
        cx, cy - radius,
        cx + radius * 0.8, cy + radius * 0.6,
        cx - radius * 0.8, cy + radius * 0.6,
      );
    }
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 3,
      duration: KILL_BURST_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });

    // Layer a shockwave on top so the kill reads from across the screen.
    this.spawnShockwave(x, y, colorHex, 32);
  }

  /**
   * Quick triangle pointing toward `targetX/targetY` from `(x, y)`.
   * Phase 6 juice: bigger flash + a tracer line behind it.
   */
  spawnMuzzleFlash(x: number, y: number, targetX: number, targetY: number): void {
    const dx = targetX - x;
    const dy = targetY - y;
    const angle = Math.atan2(dy, dx);
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(MUZZLE_FLASH_DEPTH);
    // Flash — bright cone with a softer halo.
    g.fillStyle(0xffe080, 1);
    g.fillTriangle(0, -4, 14, 0, 0, 4);
    g.fillStyle(0xfff8c0, 0.5);
    g.fillTriangle(0, -7, 18, 0, 0, 7);
    g.setRotation(angle);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.8,
      duration: MUZZLE_FLASH_DURATION_MS,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /**
   * Spawn N small triangles fanning out from (x, y) in a random spread.
   * Phase 6 juice: hit-impact sparks, color-coded by damage type. Caller
   * picks a SparkColorKey; we resolve to a hex.
   */
  spawnSparks(x: number, y: number, colorKey: SparkColorKey = 'generic', count = 4): void {
    const color = parseColor(SPARK_COLORS[colorKey]);
    // Each spark is its own Graphics so we can tween them independently —
    // the random per-spark velocity is what makes it read as a "splash"
    // rather than a coherent burst.
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 28 + Math.random() * 36;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      const g = this.scene.add.graphics({ x, y });
      g.setDepth(SPARK_DEPTH);
      g.fillStyle(color, 1);
      const r = 1.6 + Math.random() * 0.8;
      g.fillTriangle(0, -r, r * 0.7, r * 0.6, -r * 0.7, r * 0.6);
      this.scene.tweens.add({
        targets: g,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        scale: 0.4,
        duration: SPARK_DURATION_MS,
        ease: 'Cubic.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  }

  /**
   * Expanding ring at (x, y) in the given color — visible "kill landed" cue.
   * Used as the second layer of spawnKillBurst, but exposed for explosions.
   */
  spawnShockwave(x: number, y: number, colorHex: string, maxRadius = 40): void {
    const color = parseColor(colorHex);
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(SHOCKWAVE_DEPTH);
    g.lineStyle(2, color, 0.85);
    g.strokeCircle(0, 0, 6);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: maxRadius / 6,
      duration: SHOCKWAVE_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /**
   * Floating damage number — small text drifts up and fades. Tween caps
   * lifespan; large-batch spam from beam ticks should NOT call this every
   * frame (use only on discrete projectile/pulse hits).
   */
  spawnDamageNumber(x: number, y: number, amount: number, isCrit = false): void {
    const text = String(Math.max(1, Math.round(amount)));
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: isCrit ? '16px' : '12px',
      color: isCrit ? '#ffd060' : '#f8f0e0',
      stroke: '#0a0d14',
      strokeThickness: 3,
    });
    t.setOrigin(0.5, 0.5);
    t.setDepth(DAMAGE_NUM_DEPTH);
    // Slight horizontal jitter so stacked hits don't pile in one column.
    const jitterX = (Math.random() - 0.5) * 16;
    this.scene.tweens.add({
      targets: t,
      y: y - 28,
      x: x + jitterX,
      alpha: 0,
      duration: DAMAGE_NUM_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /** Camera shake driven by a tier preset (see shakeMath). */
  shake(tier: ShakeTier): void {
    const preset = SHAKE_PRESETS[tier];
    if (preset.durationMs <= 0 || preset.intensity <= 0) return;
    this.scene.cameras.main.shake(preset.durationMs, preset.intensity);
  }
}
