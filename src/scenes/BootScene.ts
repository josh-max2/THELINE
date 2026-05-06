import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // No assets to preload yet. Hand off to the Hub (Task 4.9).
    this.scene.start('HubScene');
  }
}
