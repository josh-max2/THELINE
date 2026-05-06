import Phaser from 'phaser';
import { autoRunStore } from '../lib/autoRunStore';
import { unlocksStore } from '../lib/unlocksStore';

/**
 * Shown when the train dies (Phase 4.X+ wires the trigger when cars take
 * damage). Auto-run gating wired now (Task 5.8): if Eternal Engine is owned
 * AND autoRunStore.enabled, click re-launches RunScene instead of returning
 * to Hub. v0 still never auto-triggers DeathScene; the gate is armed for
 * when damage lands.
 */
export class DeathScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DeathScene' });
  }

  create(): void {
    const willAutoRun = unlocksStore.has('auto-run') && autoRunStore.enabled;

    this.add
      .text(640, 360, 'TRAIN LOST', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#e08040',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(
        640,
        440,
        willAutoRun
          ? 'click to launch new run (auto-run ON)'
          : 'click to return to Hub',
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#7b8aa3',
        },
      )
      .setOrigin(0.5);

    this.input.once('pointerdown', () => {
      this.scene.start(willAutoRun ? 'RunScene' : 'HubScene');
    });
  }
}
