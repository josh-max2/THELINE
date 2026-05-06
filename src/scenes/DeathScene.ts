import Phaser from 'phaser';

/**
 * Shown when the train dies (Phase 4.X+ wires the trigger when cars take
 * damage). v0 placeholder — exists in the scene list so the architecture
 * is in place. Currently never visited.
 */
export class DeathScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DeathScene' });
  }

  create(): void {
    this.add
      .text(640, 360, 'TRAIN LOST\n(placeholder — Phase 4.X+)', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#e08040',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(640, 440, 'click to return to Hub', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#7b8aa3',
      })
      .setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.start('HubScene'));
  }
}
