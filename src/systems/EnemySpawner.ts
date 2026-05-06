import Phaser from 'phaser';
import enemiesDataRaw from '../data/enemies.json';
import type { EnemyData } from '../lib/types';
import { drawRecipe } from '../lib/drawRecipe';
import { pickSpawnSide, spawnPositionFor, type SpawnSide } from '../lib/spawnDirection';
import { TRAIN_ANCHOR_X, TRAIN_CENTER_Y } from '../lib/trainLayout';
import { pickFromPool, type EnemyPool } from '../lib/enemyPool';

// JSON imports widen tuple types like `[number, number]` to `number[]`; cast
// through unknown to bridge. We trust the data we author.
const ENEMIES = enemiesDataRaw as unknown as Record<string, EnemyData>;

/** v0 default pool — equal weights across non-boss enemies (Phase 4.7 replaces with encounter pools). */
function defaultEnemyPool(): EnemyPool {
  const pool = new Map<string, number>();
  for (const [id, data] of Object.entries(ENEMIES)) {
    if (data.isBoss) continue;
    pool.set(id, 1);
  }
  return pool;
}

export interface ActiveEnemy {
  data: EnemyData;
  side: SpawnSide;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  graphics: Phaser.GameObjects.Graphics;
}

/**
 * Spawns enemies from rear / top / bottom (never forward) per ADR-002.
 * Maintains the active list; CombatSystem reads it for collision + targeting.
 */
export class EnemySpawner {
  private readonly scene: Phaser.Scene;
  private readonly enemies: ActiveEnemy[] = [];
  private timeSinceLastSpawn = 0;

  /** v0 hardcoded; Phase 4.7 makes this per-encounter. */
  spawnIntervalSeconds = 1.5;

  /** v0 equal-weight pool of non-boss enemies; Phase 4.7 replaces per-encounter. */
  pool: EnemyPool = defaultEnemyPool();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawn(enemyId: string = 'scout'): ActiveEnemy {
    const data = ENEMIES[enemyId];
    if (!data) throw new Error(`Unknown enemy id: ${enemyId}`);

    const side = pickSpawnSide();
    const { x, y } = spawnPositionFor(side, 1280, 720, TRAIN_CENTER_Y);

    // Velocity vector toward train anchor.
    const dx = TRAIN_ANCHOR_X - x;
    const dy = TRAIN_CENTER_Y - y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * data.speed;
    const vy = (dy / len) * data.speed;

    const graphics = this.scene.add.graphics({ x, y });
    drawRecipe(graphics, data.render);

    const enemy: ActiveEnemy = { data, side, x, y, vx, vy, hp: data.hp, graphics };
    this.enemies.push(enemy);
    return enemy;
  }

  destroy(enemy: ActiveEnemy): void {
    enemy.graphics.destroy();
    const idx = this.enemies.indexOf(enemy);
    if (idx >= 0) this.enemies.splice(idx, 1);
  }

  update(deltaSeconds: number): void {
    this.timeSinceLastSpawn += deltaSeconds;
    if (this.timeSinceLastSpawn >= this.spawnIntervalSeconds) {
      const id = pickFromPool(this.pool);
      if (id) this.spawn(id);
      this.timeSinceLastSpawn = 0;
    }
    for (const e of this.enemies) {
      e.x += e.vx * deltaSeconds;
      e.y += e.vy * deltaSeconds;
      e.graphics.setPosition(e.x, e.y);
    }
  }

  /** Read-only view for collision + targeting. */
  get list(): ReadonlyArray<ActiveEnemy> {
    return this.enemies;
  }
}
