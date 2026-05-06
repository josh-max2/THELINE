import Phaser from 'phaser';
import type { EnemySpawner, ActiveEnemy } from './EnemySpawner';
import { salvageStore } from '../lib/salvageStore';
import { closestTarget, targetsInRadius } from '../lib/combatMath';
import type { EffectsSystem } from './EffectsSystem';
import { shakeTierForKill } from '../lib/shakeMath';

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  lifetimeSeconds: number;
  graphics: Phaser.GameObjects.Graphics;
}

const PROJECTILE_SPEED = 600;
const PROJECTILE_LIFETIME = 2.0;
const PROJECTILE_RADIUS = 3;
const PULSE_FADE_MS = 280;

/**
 * Owns projectiles, drives collision detection, awards Salvage on kill.
 * Per ADR-002: items haven't shipped yet — turret damage comes from base
 * stats only (composition arrives in Phase 4 Task 4.2.1).
 *
 * v0 uses linear projectiles (no gravity). Phase 4 introduces Matter.js
 * arcs when mortar/missile turrets need them.
 */
export class CombatSystem {
  private readonly scene: Phaser.Scene;
  private readonly enemies: EnemySpawner;
  private readonly projectiles: Projectile[] = [];
  private effects?: EffectsSystem;

  constructor(scene: Phaser.Scene, enemies: EnemySpawner) {
    this.scene = scene;
    this.enemies = enemies;
  }

  /** Wire EffectsSystem (Task 5.5) — visual juice on hits / kills / fire. */
  bindEffects(effects: EffectsSystem): void {
    this.effects = effects;
  }

  /**
   * Fire a projectile from (x, y) at the closest active enemy.
   * No-op if no enemies in range.
   */
  fireFrom(x: number, y: number, damage: number): boolean {
    const target = this.findClosestEnemy(x, y);
    if (!target) return false;
    this.effects?.spawnMuzzleFlash(x, y, target.x, target.y);
    return this.fireProjectile(x, y, target, damage);
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
      this.enemies.destroy(enemy);
      salvageStore.add(1);
    }
  }

  /**
   * Spawn an instant area-of-effect blast at (x, y). Damages every enemy
   * within radius, plays an expanding-and-fading visual.
   * Used by aoe-pulse handler (mortar, missile).
   */
  firePulse(x: number, y: number, radius: number, damage: number, color: number = 0xff8060): void {
    const g = this.scene.add.graphics({ x, y });
    g.setDepth(45);
    g.lineStyle(2, color, 0.9);
    g.strokeCircle(0, 0, radius);
    g.fillStyle(color, 0.25);
    g.fillCircle(0, 0, radius * 0.5);

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.15,
      duration: PULSE_FADE_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });

    for (const e of this.enemiesInRadius(x, y, radius)) {
      this.damageEnemy(e, damage);
    }
  }

  private fireProjectile(x: number, y: number, target: ActiveEnemy, damage: number): boolean {
    const dx = target.x - x;
    const dy = target.y - y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * PROJECTILE_SPEED;
    const vy = (dy / len) * PROJECTILE_SPEED;

    const g = this.scene.add.graphics({ x, y });
    g.fillStyle(0xfff8a0);
    g.fillCircle(0, 0, PROJECTILE_RADIUS);
    g.setDepth(50);

    this.projectiles.push({
      x,
      y,
      vx,
      vy,
      damage,
      lifetimeSeconds: PROJECTILE_LIFETIME,
      graphics: g,
    });
    return true;
  }

  update(deltaSeconds: number): void {
    // Move projectiles.
    for (const p of this.projectiles) {
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;
      p.lifetimeSeconds -= deltaSeconds;
      p.graphics.setPosition(p.x, p.y);
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
        // Discrete impact event — flash here (NOT in damageEnemy, which beams
        // call per-frame). Spawned BEFORE damageEnemy so a kill still gets
        // both the flash and the kill burst this frame.
        this.effects?.spawnHitFlash(hit.x, hit.y);
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
