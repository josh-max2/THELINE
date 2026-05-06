import Phaser from 'phaser';
import { TrainSystem } from '../systems/TrainSystem';
import { ModuleAttachmentSystem } from '../systems/ModuleAttachmentSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { CombatSystem } from '../systems/CombatSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { LocalforageStorage } from '../lib/saveStorage';
import { ParallaxBackground } from '../lib/parallaxBackground';
import { salvageStore } from '../lib/salvageStore';

/** Per ADR-001 §Gap 2 — world scrolls past the static train at this rate. */
export const WORLD_VELOCITY_PX_PER_SEC = 50;

export class RunScene extends Phaser.Scene {
  private trainSystem!: TrainSystem;
  private moduleSystem!: ModuleAttachmentSystem;
  private enemySpawner!: EnemySpawner;
  private combat!: CombatSystem;
  private saveSystem!: SaveSystem;
  private parallax!: ParallaxBackground;
  private salvageText!: Phaser.GameObjects.Text;
  private unsubscribeSalvage?: () => void;

  constructor() {
    super({ key: 'RunScene' });
  }

  create(): void {
    this.parallax = new ParallaxBackground(this, WORLD_VELOCITY_PX_PER_SEC);

    // Default v1 train per build plan Task 4.1: [Engine, Weapon, Armor, Crew, Cargo].
    // Engine constraints (leftmost, single, immovable) enforced by TrainSystem.canAddCar.
    this.trainSystem = new TrainSystem(this);
    this.trainSystem.addCar('engine');
    this.trainSystem.addCar('weapon');
    this.trainSystem.addCar('armor');
    this.trainSystem.addCar('crew');
    this.trainSystem.addCar('cargo');

    this.enemySpawner = new EnemySpawner(this);
    this.combat = new CombatSystem(this, this.enemySpawner);

    this.moduleSystem = new ModuleAttachmentSystem(this, this.trainSystem, this.combat);
    // Phase 4 Task 4.2: showcase 8 of 10 turrets across the 4 archetypes.
    // (plasma-torch and repair-drone exist in modules.json; not on the demo train.)
    this.moduleSystem.attach(0, 'engine-top-1', 'basic-cannon');   // kinetic auto-fire
    this.moduleSystem.attach(0, 'engine-top-2', 'gatling');        // kinetic auto-fire (rapid)
    this.moduleSystem.attach(1, 'weapon-top-1', 'flamethrower');   // fire beam
    this.moduleSystem.attach(1, 'weapon-top-2', 'missile');        // explosive aoe-pulse
    this.moduleSystem.attach(1, 'weapon-top-3', 'lightning');      // electric beam
    this.moduleSystem.attach(2, 'armor-top-1', 'shield-emitter');  // support aura
    this.moduleSystem.attach(2, 'armor-top-2', 'freeze-beam');     // cryo beam
    this.moduleSystem.attach(3, 'crew-top-1', 'ice-mortar');       // cryo aoe-pulse

    this.add
      .text(16, 16, 'THE LINE — Phase 4 · Task 4.2 (10 turrets)', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7b8aa3',
      })
      .setDepth(100);

    this.add
      .text(16, 32, `Train: ${this.trainSystem.length}/8 · Turrets: ${this.moduleSystem.attachmentCount}/10`, {
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

    this.unsubscribeSalvage = salvageStore.subscribe((total) => {
      this.salvageText.setText(`Salvage: ${total}`);
    });

    // SaveSystem loads existing data + restores salvageStore. Fire-and-forget;
    // the HUD will tick from "Salvage: 0" to the loaded value the moment init resolves.
    this.saveSystem = new SaveSystem(new LocalforageStorage());
    void this.saveSystem.init();
    this.saveSystem.registerLifecycleHandlers(window, document);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeSalvage?.();
      this.moduleSystem.destroyAll();
      this.saveSystem.destroy(window, document);
      void this.saveSystem.flushSave();
    });
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.parallax.update(dt);
    this.trainSystem.update(dt);
    this.enemySpawner.update(dt);
    this.combat.update(dt);
    this.moduleSystem.update(dt);
    this.saveSystem.update(dt);
  }
}
