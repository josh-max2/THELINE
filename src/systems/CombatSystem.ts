import Phaser from 'phaser';
import type { EnemySpawner, ActiveEnemy } from './EnemySpawner';
import { salvageStore } from '../lib/salvageStore';
import { closestTarget, targetsInRadius } from '../lib/combatMath';
import type { EffectsSystem, SparkColorKey } from './EffectsSystem';
import { shakeTierForKill } from '../lib/shakeMath';
import type { AudioSystem } from './AudioSystem';

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  lifetimeSeconds: number;
  graphics: Phaser.GameObjects.Graphics;
  damageType: SparkColorKey;
  /** Color for the projectile body + trail. */
  colorCore: number;
  colorGlow: number;
  /** Seconds since last trail dot — throttles trail spawning to 20Hz. */
  trailAccumSec: number;
}

const PROJECTILE_SPEED = 600;
const PROJECTILE_LIFETIME = 2.0;
const PROJECTILE_RADIUS = 4;
const PULSE_FADE_MS = 320;
const TRAIL_INTERVAL_SEC = 0.05;

/**
 * Owns projectiles, drives collision detection, awards Salvage on kill.
 *
 * v0 uses linear projectiles (no gravity). Phase 4 introduces Matter.js
 * arcs when mortar/missile turrets need them.
 *
 * Phase 6 juice pass: projectiles render as triple-stack (glow + mid + core),
 * spawn a trail at 20Hz, and impact path adds sparks + damage numbers + a
 * tiny impact-shake on top of the existing hit flash. Beam tick path is
 * untouched (per-frame-shake / per-frame-numbers would brick perf).
 */
export class CombatSystem {
  private readonly scene: Phaser.Scene;
  private readonly enemies: EnemySpawner;
  private readonly projectiles: Projectile[] = [];
  private effects?: EffectsSystem;
  private audio?: AudioSystem;

  constructor(scene: Phaser.Scene, enemies: EnemySpawner) {
    this.scene = scene;
    this.enemies = enemies;
  }

  /** Wire EffectsSystem (Task 5.5) — visual juice on hits / kills / fire. */
  bindEffects(effects: EffectsSystem): void {
    this.effects = effects;
  }

  /** Wire AudioSystem (Task 5.6) — sfx on hits / kills / fire. */
  bindAudio(audio: AudioSystem): void {
    this.audio = audio;
  }

  /**
   * Fire a projectile from (x, y) at the closest active enemy.
   * No-op if no enemies in range.
   *
   * `damageType` drives the spark color on impact and the projectile tint;
   * defaults to kinetic (yellow) for callers that don't specify one.
   */
  fireFrom(
    x: number,
    y: number,
    damage: number,
    damageType: SparkColorKey = 'kinetic',
  ): boolean {
    const target = this.findClosestEnemy(x, y);
    if (!target) return false;
    this.effects?.spawnMuzzleFlash(x, y, target.x, target.y);
    this.audio?.playSfx('fire');
    return this.fireProjectile(x, y, target, damage, damageType);
  }

  /** Public targeting helper — used by behavior handlers (beam, aoe-pulse). */
  findClosestEnemy(x: number, y: number, maxRange?: number): ActiveEnemy | undefined {
    return closestTarget(this.enemies.list, x, y, maxRange);
  }

  /** All enemies within radius of (x, y). Used by aoe-pulse handler. */
  enemiesInRadius(x: number, y: number, radius: number): ActiveEnemy[] {
    return targetsInRadius(this.enemies.list, x, y, radius);
  }

  /**
   * Apply damage to an enemy. Awards Salvage on kill.
   *
   * Hit flash is intentionally NOT spawned here — beam handlers call this
   * every frame with `dps * dt`, and a 60fps flash spam tanks framerate
   * (Task 5.5 advisor catch). Discrete events (projectile hit) spawn the
   * flash at their own call site; beams have their own line-graphic visual.
   */
  damageEnemy(enemy: ActiveEnemy, amount: number): void {
    if (amount <= 0) return;
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
      // Kill burst tinted by enemy render fill — matches its silhouette color.
      this.effects?.spawnKillBurst(enemy.x, enemy.y, enemy.data.render.fill);
      this.effects?.shake(shakeTierForKill({ hp: enemy.data.hp, isBoss: enemy.data.isBoss }));
      this.audio?.playSfx('kill');
      this.enemies.destroy(enemy);
      salvageStore.add(1);
    }
  }

  /**
   * Spawn an instant area-of-effect blast at (x, y). Damages every enemy
   * within radius, plays an expanding-and-fading visual.
   * Used by aoe-pulse handler (mortar, missile).
   *
   * Phase 6 juice: each enemy hit gets a damage number + sparks. Beam
   * dps-tick path doesn't reach here, so we don't need a discrete-event
   * guard — pulses ARE discrete events.
   */
  firePulse(
    x: number,
    y: number,
    radius: number,
    damage: number,
    color: number = 0xff8060,
    damageType: SparkColorKey = 'explosive',
  ): void {
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(45);
    g.lineStyle(2, color, 0.9);
    g.strokeCircle(0, 0, radius);
    g.fillStyle(color, 0.3);
    g.fillCircle(0, 0, radius * 0.55);

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.2,
      duration: PULSE_FADE_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });

    for (const e of this.enemiesInRadius(x, y, radius)) {
      this.effects?.spawnSparks(e.x, e.y, damageType, 5);
      this.effects?.spawnDamageNumber(e.x, e.y - 8, damage);
      this.damageEnemy(e, damage);
    }
  }

  private fireProjectile(
    x: number,
    y: number,
    target: ActiveEnemy,
    damage: number,
    damageType: SparkColorKey,
  ): boolean {
    const dx = target.x - x;
    const dy = target.y - y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * PROJECTILE_SPEED;
    const vy = (dy / len) * PROJECTILE_SPEED;

    const { core, glow } = projectileColors(damageType);

    // Triple-pass projectile: outer glow (soft halo), mid layer, hot core.
    // Drawn once at spawn — Graphics.setPosition is cheap for translation.
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(50);
    g.fillStyle(glow, 0.3);
    g.fillCircle(0, 0, PROJECTILE_RADIUS * 2.4);
    g.fillStyle(glow, 0.7);
    g.fillCircle(0, 0, PROJECTILE_RADIUS * 1.5);
    g.fillStyle(core, 1);
    g.fillCircle(0, 0, PROJECTILE_RADIUS);

    this.projectiles.push({
      x,
      y,
      vx,
      vy,
      damage,
      lifetimeSeconds: PROJECTILE_LIFETIME,
      graphics: g,
      damageType,
      colorCore: core,
      colorGlow: glow,
      trailAccumSec: 0,
    });
    return true;
  }

  /**
   * Spawn a fading trail dot at the projectile's current position. Throttled
   * by trailAccumSec so a 600px/s projectile lays ~12 dots per second instead
   * of 60.
   */
  private spawnTrailDot(p: Projectile): void {
    const g = this.scene.add.graphics({ x: p.x, y: p.y });
    g.setDepth(48);
    g.fillStyle(p.colorGlow, 0.55);
    g.fillCircle(0, 0, PROJECTILE_RADIUS * 0.9);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 0.5,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  update(deltaSeconds: number): void {
    // Move projectiles + lay trails.
    for (const p of this.projectiles) {
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;
      p.lifetimeSeconds -= deltaSeconds;
      p.graphics.setPosition(p.x, p.y);
      p.trailAccumSec += deltaSeconds;
      if (p.trailAccumSec >= TRAIL_INTERVAL_SEC) {
        p.trailAccumSec -= TRAIL_INTERVAL_SEC;
        this.spawnTrailDot(p);
      }
    }

    // Iterate backward so splice doesn't disturb indices.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.lifetimeSeconds <= 0) {
        p.graphics.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      const hit = this.findHit(p);
      if (hit) {
        p.graphics.destroy();
        this.projectiles.splice(i, 1);
        // Discrete impact event — flash + sparks + damage number + sfx + tiny
        // impact-shake here (NOT in damageEnemy, which beams call per-frame).
        // Spawned BEFORE damageEnemy so a kill still gets both the hit flash
        // and the kill burst this frame.
        this.effects?.spawnHitFlash(hit.x, hit.y);
        this.effects?.spawnSparks(hit.x, hit.y, p.damageType, 4);
        this.effects?.spawnDamageNumber(hit.x, hit.y - 6, p.damage);
        this.effects?.shake('impact');
        this.audio?.playSfx('hit');
        this.damageEnemy(hit, p.damage);
      }
    }
  }

  get projectileCount(): number {
    return this.projectiles.length;
  }

  private findHit(p: Projectile): ActiveEnemy | undefined {
    for (const e of this.enemies.list) {
      const r = e.data.radius + PROJECTILE_RADIUS;
      if (Math.hypot(e.x - p.x, e.y - p.y) < r) return e;
    }
    return undefined;
  }
}

/** Resolve projectile core + glow color from damage type. Pure helper. */
function projectileColors(t: SparkColorKey): { core: number; glow: number } {
  switch (t) {
    case 'kinetic':
      return { core: 0xfff8c0, glow: 0xffd060 };
    case 'fire':
      return { core: 0xfff080, glow: 0xff6020 };
    case 'cryo':
      return { core: 0xe8f8ff, glow: 0x60c0ff };
    case 'electric':
      return { core: 0xf0e0ff, glow: 0xa060ff };
    case 'explosive':
      return { core: 0xfff0c0, glow: 0xff8040 };
    default:
      return { core: 0xffffff, glow: 0xc0c0c0 };
  }
}
