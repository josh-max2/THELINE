import Phaser from 'phaser';
import { HubOverlay } from '../ui/hubOverlay';
import { salvageStore } from '../lib/salvageStore';
import { SaveSystem } from '../systems/SaveSystem';
import { LocalforageStorage } from '../lib/saveStorage';
import { TechTreeSystem } from '../systems/TechTreeSystem';
import { buildTokenFromUrl } from '../lib/buildShare';
import { loadoutStore } from '../lib/loadoutStore';
import { audioSystem } from '../systems/AudioSystem';
import { audioStore } from '../lib/audioStore';
import { hasSeenTutorial } from '../lib/tutorialState';
import { TutorialOverlay } from '../ui/tutorialOverlay';
import { accruedSalvage } from '../lib/idleIncomeMath';
import { autoRunStore } from '../lib/autoRunStore';

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
  private tutorial?: TutorialOverlay;

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
      audioStore.setState({ muted: data.hubState.audioMuted, volume: data.hubState.audioVolume });
      autoRunStore.setEnabled(data.hubState.autoRunEnabled);

      // Idle income (Task 5.8) — apply accrued Salvage from time-away, then
      // record now as the new lastHubExitMs baseline so the next session
      // starts a fresh accrual window.
      const accrued = accruedSalvage(data.hubState.lastHubExitMs, Date.now());
      if (accrued > 0) {
        salvageStore.setTotal(salvageStore.total + accrued);
        this.overlay?.showIdleBanner(accrued);
      }
      this.saveSystem?.updateHubState({ lastHubExitMs: Date.now() });
      void this.saveSystem?.flushSave();
    });

    const importToken = buildTokenFromUrl(window.location.href);
    this.overlay = new HubOverlay(
      document.body,
      salvageStore.total,
      () => this.depart(),
      {
        techTree: this.techTree,
        importToken,
        onMuteToggle: (muted) => {
          this.saveSystem?.updateHubState({ audioMuted: muted });
          void this.saveSystem?.flushSave();
        },
        onAutoRunToggle: (enabled) => {
          this.saveSystem?.updateHubState({ autoRunEnabled: enabled });
          void this.saveSystem?.flushSave();
        },
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

    // First-run tutorial — shown on top of the hub on the very first session.
    // Subsequent enters skip it (flag persisted via localStorage in tutorialState).
    if (!hasSeenTutorial()) {
      this.tutorial = new TutorialOverlay(document.body);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // Record exit time so next-enter idle accrual starts now.
      this.saveSystem?.updateHubState({ lastHubExitMs: Date.now() });
      void this.saveSystem?.flushSave();
      this.overlay?.destroy();
      this.overlay = undefined;
      this.tutorial?.destroy();
      this.tutorial = undefined;
      this.saveSystem = undefined;
      this.techTree = undefined;
    });
  }

  private depart(): void {
    // DEPART click is the user gesture that unlocks the AudioContext.
    // Resume here so the first SFX in the run scene actually plays.
    void audioSystem.resumeOnGesture().then(() => {
      audioSystem.playSfx('depart');
    });
    this.overlay?.destroy();
    this.overlay = undefined;
    this.scene.start('RunScene');
  }
}
