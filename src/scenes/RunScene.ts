import Phaser from 'phaser';
import { TrainSystem } from '../systems/TrainSystem';
import { ModuleAttachmentSystem } from '../systems/ModuleAttachmentSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { CombatSystem } from '../systems/CombatSystem';
import { ParallaxBackground } from '../lib/parallaxBackground';
import { salvageStore } from '../lib/salvageStore';

/** Per ADR-001 §Gap 2 — world scrolls past the static train at this rate. */
export const WORLD_VELOCITY_PX_PER_SEC = 50;

export class RunScene extends Phaser.Scene {
  private trainSystem!: TrainSystem;
  private moduleSystem!: ModuleAttachmentSystem;
  private enemySpawner!: EnemySpawner;
  private combat!: CombatSystem;
  private parallax!: ParallaxBackground;
  private salvageText!: Phaser.GameObjects.Text;
  private unsubscribeSalvage?: () => void;

  constructor() {
    super({ key: 'RunScene' });
  }

  create(): void {
    this.parallax = new ParallaxBackground(this, WORLD_VELOCITY_PX_PER_SEC);

    this.trainSystem = new TrainSystem(this);
    this.trainSystem.addCar('engine');

    this.enemySpawner = new EnemySpawner(this);
    this.combat = new CombatSystem(this, this.enemySpawner);

    this.moduleSystem = new ModuleAttachmentSystem(this, this.trainSystem, this.combat);
    this.moduleSystem.attach(0, 'engine-top-1', 'basic-cannon');

    this.add
      .text(16, 16, 'THE LINE — Phase 3 · Task 3.5 (Combat)', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7b8aa3',
      })
      .setDepth(100);

    this.salvageText = this.add
      .text(1264, 16, 'Salvage: 0', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e8eef7',
      })
      .setOrigin(1, 0)
      .setDepth(100);

    salvageStore.reset();
    this.unsubscribeSalvage = salvageStore.subscribe((total) => {
      this.salvageText.setText(`Salvage: ${total}`);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeSalvage?.();
    });
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.parallax.update(dt);
    this.trainSystem.update(dt);
    this.enemySpawner.update(dt);
    this.combat.update(dt);
    this.moduleSystem.update(dt);
  }
}
