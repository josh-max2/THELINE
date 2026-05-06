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
import { unlocksStore } from '../lib/unlocksStore';
import { encodeBuild, shareUrl, type SharedBuild } from '../lib/buildShare';
import { loadoutStore } from '../lib/loadoutStore';
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

    // Train layout is loadout-driven (Task 5.4) — HubScene populates loadoutStore
    // from save / from Apply-Build before scene transition. v0 default is
    // ['engine','weapon','armor','crew','cargo']. TrainSystem.addCar enforces
    // the engine-first / single-engine / max-length rules per ADR-001.
    this.trainSystem = new TrainSystem(this);
    for (const carType of loadoutStore.layout) {
      this.trainSystem.addCar(carType);
    }
    const isCanonicalLayout = loadoutStore.isCanonicalDefault();

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

    // Phase 4 Task 4.2: 8 default turrets — only attached when the layout
    // matches the canonical (engine,weapon,armor,crew,cargo) order; an
    // imported custom layout (e.g. via ?b=…) gets a clean slate and Phase 5.5
    // Engineering Bay will own the per-loadout module set.
    if (isCanonicalLayout) {
      this.moduleSystem.attach(0, 'engine-top-1', 'basic-cannon');
      this.moduleSystem.attach(0, 'engine-top-2', 'gatling');
      this.moduleSystem.attach(1, 'weapon-top-1', 'flamethrower');
      this.moduleSystem.attach(1, 'weapon-top-2', 'missile');
      this.moduleSystem.attach(1, 'weapon-top-3', 'lightning');
      this.moduleSystem.attach(2, 'armor-top-1', 'shield-emitter');
      this.moduleSystem.attach(2, 'armor-top-2', 'freeze-beam');
      this.moduleSystem.attach(3, 'crew-top-1', 'ice-mortar');

      // Phase 4 Task 4.2.1 demo: stack 2 items on basic-cannon.
      this.itemSystem.attach(0, 'engine-top-1', 'rivet-rounds');
      this.itemSystem.attach(0, 'engine-top-1', 'auto-loader');
    }

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
    // Also pushes purchasedTechIds → unlocksStore so tech-tree effects (e.g.
    // global-damage-buff) apply within the first auto-fire tick.
    this.saveSystem = new SaveSystem(new LocalforageStorage());
    void this.saveSystem.init().then((data) => {
      unlocksStore.setOwned(data.hubState.purchasedTechIds);
    });
    this.saveSystem.registerLifecycleHandlers(window, document);

    // Unlocks HUD — visible-only when at least one tech owned. Subscribes so
    // it appears on first save-load tick (since init resolves async).
    const unlocksText = this.add
      .text(640, 700, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#a0d8a0',
      })
      .setOrigin(0.5, 1)
      .setDepth(100);
    const unlocksUnsub = unlocksStore.subscribe((tags) => {
      const list = [...tags];
      unlocksText.setText(list.length === 0 ? '' : `Unlocks: ${list.join(', ')}`);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => unlocksUnsub());

    // Abandon-run button (top-right) — returns to Hub. Phase 4.X will replace
    // with proper death/escape mechanics; v0 needs *some* way back to Hub.
    const abandonBtn = document.createElement('button');
    abandonBtn.className = 'run-abandon';
    abandonBtn.textContent = 'Abandon Run';
    abandonBtn.addEventListener('click', () => {
      this.scene.start('HubScene');
    });
    document.body.appendChild(abandonBtn);

    // Share-build button (Task 5.4) — copies a base64url build token to the
    // clipboard. Sits below the abandon button so the right edge stays clean.
    const shareBtn = document.createElement('button');
    shareBtn.className = 'run-share';
    shareBtn.textContent = 'Copy Build URL';
    shareBtn.addEventListener('click', async () => {
      const build = this.snapshotBuild();
      const token = encodeBuild(build);
      const url = shareUrl(window.location.origin + window.location.pathname, token);
      try {
        await navigator.clipboard.writeText(url);
        shareBtn.textContent = 'Copied!';
        setTimeout(() => {
          shareBtn.textContent = 'Copy Build URL';
        }, 1500);
      } catch {
        // Clipboard API can fail when not in a user gesture context (rare since
        // this IS a click handler) or in headless. Surface the URL via prompt
        // so the player can still grab it.
        window.prompt('Build URL — copy manually:', url);
      }
    });
    document.body.appendChild(shareBtn);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeSalvage?.();
      this.unsubscribeEncounters?.();
      this.moduleSystem.destroyAll();
      this.itemSystem.destroyAll();
      this.powerPanel.destroy();
      this.crewPanel.destroy();
      this.slowTime.destroy();
      abandonBtn.remove();
      shareBtn.remove();
      this.saveSystem.destroy(window, document);
      void this.saveSystem.flushSave();
    });
  }

  /** Snapshot the current train + attached modules + items for build sharing. */
  private snapshotBuild(): SharedBuild {
    const trainLayout = this.trainSystem.snapshot().map((c) => c.type);
    const modSnap = this.moduleSystem.buildSnapshot();
    const itemSnap = this.itemSystem.buildSnapshot();
    return {
      trainLayout,
      attachments: modSnap.map((m) => ({
        carIndex: m.carIndex,
        slotId: m.slotId,
        moduleId: m.moduleId,
        itemIds: itemSnap.get(`${m.carIndex}:${m.slotId}` as const) ?? [],
      })),
    };
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
