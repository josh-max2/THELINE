import Phaser from 'phaser';
import { HubOverlay } from '../ui/hubOverlay';
import { salvageStore } from '../lib/salvageStore';
import { SaveSystem } from '../systems/SaveSystem';
import { LocalforageStorage } from '../lib/saveStorage';
import { TechTreeSystem } from '../systems/TechTreeSystem';
import { buildTokenFromUrl } from '../lib/buildShare';
import { loadoutStore } from '../lib/loadoutStore';

/**
 * Between-run UI. Per DESIGN §10 + build plan Task 4.9 + Task 5.3.
 * Tech Tree is now functional; other panels remain Phase 5 placeholders.
 *
 * Hub owns its own SaveSystem instance — it loads on enter, persists tech
 * purchases immediately, and tears down on shutdown. RunScene also owns one;
 * both share the same localforage backing store, so writes from either side
 * are visible to the other on the next load.
 */
export class HubScene extends Phaser.Scene {
  private overlay?: HubOverlay;
  private saveSystem?: SaveSystem;
  private techTree?: TechTreeSystem;

  constructor() {
    super({ key: 'HubScene' });
  }

  create(): void {
    this.add
      .text(640, 24, 'THE LINE — Hub', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#e8eef7',
      })
      .setOrigin(0.5, 0);

    this.saveSystem = new SaveSystem(new LocalforageStorage());
    this.techTree = new TechTreeSystem();
    this.techTree.bindSaveSystem(this.saveSystem);

    // Async hydrate from save before showing the overlay so the Tech Tree
    // panel reflects already-purchased unlocks. Salvage HUD shows 0 → real
    // value via salvageStore.subscribe in HubOverlay; one-frame flash
    // is acceptable on initial Hub load (same pattern as RunScene).
    void this.saveSystem.init().then((data) => {
      this.techTree?.loadFromSave(data.hubState.purchasedTechIds);
      loadoutStore.setLayout(data.hubState.trainLayout);
    });

    const importToken = buildTokenFromUrl(window.location.href);
    this.overlay = new HubOverlay(
      document.body,
      salvageStore.total,
      () => this.depart(),
      {
        techTree: this.techTree,
        importToken,
        onApplyImport: (build) => {
          // v0 only persists + applies trainLayout. Module/item slot mappings
          // are deferred to Phase 5.5 Engineering Bay (save schema doesn't
          // yet store per-slot module ids). Pushing to loadoutStore makes the
          // change immediately visible to the next DEPART without a reload.
          this.saveSystem?.updateHubState({ trainLayout: build.trainLayout });
          loadoutStore.setLayout(build.trainLayout);
          void this.saveSystem?.flushSave();
          const cleanUrl = `${window.location.origin}${window.location.pathname}`;
          window.history.replaceState({}, '', cleanUrl);
        },
      },
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.overlay?.destroy();
      this.overlay = undefined;
      void this.saveSystem?.flushSave();
      this.saveSystem = undefined;
      this.techTree = undefined;
    });
  }

  private depart(): void {
    this.overlay?.destroy();
    this.overlay = undefined;
    this.scene.start('RunScene');
  }
}
