import Phaser from 'phaser';
import { TrainSystem } from '../systems/TrainSystem';
import { ModuleAttachmentSystem } from '../systems/ModuleAttachmentSystem';
import { ItemAttachmentSystem } from '../systems/ItemAttachmentSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { CombatSystem } from '../systems/CombatSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { PowerSystem } from '../systems/PowerSystem';
import { CrewSystem } from '../systems/CrewSystem';
import { EncounterSystem } from '../systems/EncounterSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { SlowTimeSystem } from '../systems/SlowTimeSystem';
import { LocalforageStorage } from '../lib/saveStorage';
import { ParallaxBackground } from '../lib/parallaxBackground';
import { salvageStore } from '../lib/salvageStore';
import { PowerPanel } from '../ui/powerPanel';
import { CrewPanel } from '../ui/crewPanel';

/** Per ADR-001 §Gap 2 — world scrolls past the static train at this rate. */
export const WORLD_VELOCITY_PX_PER_SEC = 50;

export class RunScene extends Phaser.Scene {
  private trainSystem!: TrainSystem;
  private moduleSystem!: ModuleAttachmentSystem;
  private itemSystem!: ItemAttachmentSystem;
  private enemySpawner!: EnemySpawner;
  private combat!: CombatSystem;
  private saveSystem!: SaveSystem;
  private powerSystem!: PowerSystem;
  private powerPanel!: PowerPanel;
  private crewSystem!: CrewSystem;
  private crewPanel!: CrewPanel;
  private slowTime!: SlowTimeSystem;
  private environment!: EnvironmentSystem;
  private encounters!: EncounterSystem;
  private encounterText!: Phaser.GameObjects.Text;
  private unsubscribeEncounters?: () => void;
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
    this.itemSystem = new ItemAttachmentSystem(this, this.trainSystem);
    this.powerSystem = new PowerSystem(this.trainSystem, this.moduleSystem);
    this.crewSystem = new CrewSystem(this.trainSystem);
    this.environment = new EnvironmentSystem(this, this.parallax);

    // Resolve all cross-system references BEFORE any attach() calls — handler.init()
    // calls context() which throws if any system is unbound (Task 5.2 catch).
    this.moduleSystem.bindItemSystem(this.itemSystem);
    this.moduleSystem.bindPowerSystem(this.powerSystem);
    this.moduleSystem.bindCrewSystem(this.crewSystem);
    this.moduleSystem.bindEnvironmentSystem(this.environment);
    this.itemSystem.bindModuleSystem(this.moduleSystem);
    this.powerSystem.bindCrewSystem(this.crewSystem);
    this.environment.bindCombatSystem(this.combat);

    // Phase 4 Task 4.2: showcase 8 of 10 turrets across the 4 archetypes.
    this.moduleSystem.attach(0, 'engine-top-1', 'basic-cannon');   // kinetic auto-fire
    this.moduleSystem.attach(0, 'engine-top-2', 'gatling');        // kinetic auto-fire (rapid)
    this.moduleSystem.attach(1, 'weapon-top-1', 'flamethrower');   // fire beam
    this.moduleSystem.attach(1, 'weapon-top-2', 'missile');        // explosive aoe-pulse
    this.moduleSystem.attach(1, 'weapon-top-3', 'lightning');      // electric beam
    this.moduleSystem.attach(2, 'armor-top-1', 'shield-emitter');  // support aura
    this.moduleSystem.attach(2, 'armor-top-2', 'freeze-beam');     // cryo beam
    this.moduleSystem.attach(3, 'crew-top-1', 'ice-mortar');       // cryo aoe-pulse

    // Phase 4 Task 4.2.1 demo: stack 2 items on basic-cannon.
    // Effects: damage 10 + 5 = 15; fireRate 1.0 + 0.5 = 1.5.
    this.itemSystem.attach(0, 'engine-top-1', 'rivet-rounds');
    this.itemSystem.attach(0, 'engine-top-1', 'auto-loader');

    // Power weights initialized after modules attach (so demand snapshot is accurate).
    this.powerSystem.initializeDefaults();
    this.powerPanel = new PowerPanel(document.body, this.trainSystem, this.powerSystem);

    // Crew assignments default-to-Crew-Car; CrewPanel renders the assignment UI.
    this.crewSystem.initializeDefaults();
    this.crewPanel = new CrewPanel(document.body, this.trainSystem, this.crewSystem);

    this.slowTime = new SlowTimeSystem(this);

    // Encounter cycle drives EnemySpawner per template + biome tint via EnvironmentSystem.
    this.encounters = new EncounterSystem(this.enemySpawner);
    this.encounters.bindEnvironmentSystem(this.environment);
    this.encounters.start();

    this.encounterText = this.add
      .text(640, 20, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e0eafa',
        backgroundColor: 'rgba(10, 18, 32, 0.7)',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(100);
    this.unsubscribeEncounters = this.encounters.subscribe((enc, sec) => {
      this.encounterText.setText(`${enc.name} — ${sec.toFixed(0)}s`);
    });

    // Phase 4 closeout audit: removed the dev-only HUD title label that kept
    // drifting across tasks. Encounter HUD + Salvage HUD now convey state.
    this.add
      .text(
        16,
        16,
        `Train: ${this.trainSystem.length}/8 · Turrets: ${this.moduleSystem.attachmentCount}/10 · Items: ${this.itemSystem.totalItems}`,
        { fontFamily: 'monospace', fontSize: '12px', color: '#7b8aa3' },
      )
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

    // Abandon-run button (top-right) — returns to Hub. Phase 4.X will replace
    // with proper death/escape mechanics; v0 needs *some* way back to Hub.
    const abandonBtn = document.createElement('button');
    abandonBtn.className = 'run-abandon';
    abandonBtn.textContent = 'Abandon Run';
    abandonBtn.addEventListener('click', () => {
      this.scene.start('HubScene');
    });
    document.body.appendChild(abandonBtn);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeSalvage?.();
      this.unsubscribeEncounters?.();
      this.moduleSystem.destroyAll();
      this.itemSystem.destroyAll();
      this.powerPanel.destroy();
      this.crewPanel.destroy();
      this.slowTime.destroy();
      abandonBtn.remove();
      this.saveSystem.destroy(window, document);
      void this.saveSystem.flushSave();
    });
  }

  update(_time: number, deltaMs: number): void {
    const realDt = deltaMs / 1000;
    // Slow-time tint fades on real time (so it can fade out when not paused).
    this.slowTime.updateRealtime();
    // Gameplay systems use scaled dt — Bastion-style slow per DESIGN §7.
    const dt = realDt * this.slowTime.timeScale;
    this.parallax.update(dt);
    this.trainSystem.update(dt);
    // Encounter system advances on scaled dt — slow-time slows encounter pacing too.
    this.encounters.update(dt);
    this.enemySpawner.update(dt);
    this.combat.update(dt);
    // EnvironmentSystem ticks env damage zones (Phase 5 Task 5.2). Runs after
    // combat so newly-spawned zones don't double-tick on creation frame.
    this.environment.update(dt);
    this.powerSystem.update(dt);
    this.moduleSystem.update(dt);
    // SaveSystem auto-save uses real time — saves should still happen at 30s wall-clock.
    this.saveSystem.update(realDt);
  }
}
