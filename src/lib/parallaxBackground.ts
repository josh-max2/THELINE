import Phaser from 'phaser';

/**
 * Minimal parallax: a horizon band + repeating vertical tick marks that scroll
 * left at `worldVelocity` px/sec. Establishes "the train is moving" without
 * committing to a specific biome look (Phase 5 polish replaces this).
 */
export class ParallaxBackground {
  private graphics: Phaser.GameObjects.Graphics;
  private offsetX = 0;
  private readonly velocity: number;
  private readonly tileWidth = 64;
  private readonly horizonY = 540;

  constructor(scene: Phaser.Scene, velocity: number) {
    this.velocity = velocity;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-100);
    this.draw();
  }

  update(deltaSeconds: number): void {
    this.offsetX = (this.offsetX - this.velocity * deltaSeconds) % this.tileWidth;
    this.draw();
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();

    g.fillStyle(0x10141d);
    g.fillRect(0, this.horizonY, 1280, 720 - this.horizonY);

    g.lineStyle(1, 0x1a2235);
    let x = this.offsetX % this.tileWidth;
    if (x < 0) x += this.tileWidth;
    while (x < 1280) {
      g.beginPath();
      g.moveTo(x, this.horizonY);
      g.lineTo(x, this.horizonY + 24);
      g.strokePath();
      x += this.tileWidth;
    }
  }
}
