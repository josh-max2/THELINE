import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // No assets to preload yet. Hand straight off to the run scene.
    this.scene.start('RunScene');
  }
}
