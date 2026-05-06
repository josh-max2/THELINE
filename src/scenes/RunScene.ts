import Phaser from 'phaser';

export class RunScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RunScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'THE LINE — vertical slice', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#e8eef7',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 48, 'Phase 3 · Task 3.2 scaffold', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#7b8aa3',
      })
      .setOrigin(0.5);
  }
}
