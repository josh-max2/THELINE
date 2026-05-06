import Phaser from 'phaser';
import { HubOverlay } from '../ui/hubOverlay';
import { salvageStore } from '../lib/salvageStore';

/**
 * Between-run UI. Per DESIGN §10 + build plan Task 4.9.
 * v0: Engineering Bay / Crew Roster / Tech Tree / Lore Log are placeholder
 * panels; only the Mission Board's Depart button is wired up.
 */
export class HubScene extends Phaser.Scene {
  private overlay?: HubOverlay;

  constructor() {
    super({ key: 'HubScene' });
  }

  create(): void {
    // Show Salvage at top so the player sees it persists across runs.
    this.add
      .text(640, 24, 'THE LINE — Hub', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#e8eef7',
      })
      .setOrigin(0.5, 0);

    this.overlay = new HubOverlay(document.body, salvageStore.total, () => {
      this.depart();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.overlay?.destroy();
      this.overlay = undefined;
    });
  }

  private depart(): void {
    this.overlay?.destroy();
    this.overlay = undefined;
    this.scene.start('RunScene');
  }
}
