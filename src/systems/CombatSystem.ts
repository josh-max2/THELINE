import Phaser from 'phaser';
import type { EnemySpawner, ActiveEnemy } from './EnemySpawner';
import { salvageStore } from '../lib/salvageStore';

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

  constructor(scene: Phaser.Scene, enemies: EnemySpawner) {
    this.scene = scene;
    this.enemies = enemies;
  }

  /**
   * Fire a projectile from (x, y) at the closest active enemy.
   * No-op if no enemies in range.
   */
  fireFrom(x: number, y: number, damage: number): boolean {
    const target = this.findClosestEnemy(x, y);
    if (!target) return false;

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
        hit.hp -= p.damage;
        p.graphics.destroy();
        this.projectiles.splice(i, 1);
        if (hit.hp <= 0) {
          this.enemies.destroy(hit);
          salvageStore.add(1);
        }
      }
    }
  }

  get projectileCount(): number {
    return this.projectiles.length;
  }

  private findClosestEnemy(x: number, y: number): ActiveEnemy | undefined {
    let best: ActiveEnemy | undefined;
    let bestDist = Infinity;
    for (const e of this.enemies.list) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private findHit(p: Projectile): ActiveEnemy | undefined {
    for (const e of this.enemies.list) {
      const r = e.data.radius + PROJECTILE_RADIUS;
      if (Math.hypot(e.x - p.x, e.y - p.y) < r) return e;
    }
    return undefined;
  }
}
