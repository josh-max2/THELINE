import Phaser from 'phaser';
import { parseColor } from './color';

/**
 * Minimal parallax: a horizon band + repeating vertical tick marks that scroll
 * left at `worldVelocity` px/sec.
 *
 * Per ADR-003 + Task 4.8: accepts a biome tint that EnvironmentSystem updates
 * on encounter advance. Phase 5 polish replaces this with multi-layer parallax
 * + biome-specific terrain art.
 */
const DEFAULT_HORIZON = '#10141d';

export class ParallaxBackground {
  private graphics: Phaser.GameObjects.Graphics;
  private offsetX = 0;
  private readonly velocity: number;
  private readonly tileWidth = 64;
  private readonly horizonY = 540;
  private horizonColor = parseColor(DEFAULT_HORIZON);
  private tickColor = 0x1a2235;

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

  /** Update the horizon tint to match the current biome. */
  setBiomeTint(hex: string): void {
    this.horizonColor = parseColor(hex);
    // Tick color = 1.4× brightness of horizon (subtle visual layering).
    this.tickColor = lighten(this.horizonColor, 0.4);
    this.draw();
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();

    g.fillStyle(this.horizonColor);
    g.fillRect(0, this.horizonY, 1280, 720 - this.horizonY);

    g.lineStyle(1, this.tickColor);
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

/** Brighten a 0xRRGGBB color by `factor` toward white. */
function lighten(color: number, factor: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const bumped = (c: number) => Math.min(255, Math.round(c + (255 - c) * factor));
  return (bumped(r) << 16) | (bumped(g) << 8) | bumped(b);
}
