import Phaser from 'phaser';
import { parseColor } from './color';

/**
 * Multi-layer parallax: sky gradient → distant haze + scattered specks →
 * horizon band → rail lines → scrolling sleepers. Per ADR-003 + Task 4.8 +
 * Phase 6 visual pass.
 *
 * The biome tint mainly drives the horizon band; rails + sleepers brighten
 * relative to it for layered depth. Specks are seeded once so they don't
 * twinkle per frame.
 */
const DEFAULT_HORIZON = '#10141d';

interface Speck {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

export class ParallaxBackground {
  private graphics: Phaser.GameObjects.Graphics;
  private offsetX = 0;
  private readonly velocity: number;
  private readonly tileWidth = 64;
  private readonly horizonY = 540;
  private horizonColor = parseColor(DEFAULT_HORIZON);
  private railColor = 0x2a3850;
  private sleeperColor = 0x1a2235;
  private readonly specks: Speck[];

  constructor(scene: Phaser.Scene, velocity: number) {
    this.velocity = velocity;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-100);
    // Deterministic speck distribution — 90 dim points scattered in the upper
    // 480px (above horizon), avoiding the train area in the middle. Generated
    // once at construction so they don't twinkle every frame.
    this.specks = generateSpecks(90, 1280, this.horizonY - 40);
    this.refreshDerivedColors();
    this.draw();
  }

  update(deltaSeconds: number): void {
    this.offsetX = (this.offsetX - this.velocity * deltaSeconds) % this.tileWidth;
    this.draw();
  }

  /** Update the horizon tint to match the current biome. */
  setBiomeTint(hex: string): void {
    this.horizonColor = parseColor(hex);
    this.refreshDerivedColors();
    this.draw();
  }

  private refreshDerivedColors(): void {
    // Rails are noticeably brighter than horizon (player needs to read the
    // tracks even on a dark biome). Sleepers are slightly brighter than the
    // horizon band so they read but don't dominate.
    this.railColor = lighten(this.horizonColor, 0.55);
    this.sleeperColor = lighten(this.horizonColor, 0.25);
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();

    // ── Sky band: 3-stop vertical fade from upper darkness toward the horizon.
    // Cheaper than a true gradient — three stacked translucent rects.
    g.fillStyle(0x0a0e15, 1);
    g.fillRect(0, 0, 1280, this.horizonY);
    g.fillStyle(0x141c2c, 0.45);
    g.fillRect(0, this.horizonY - 200, 1280, 200);
    g.fillStyle(0x202c44, 0.25);
    g.fillRect(0, this.horizonY - 80, 1280, 80);

    // ── Specks (stars / cosmic dust). Static — no per-frame scroll.
    for (const s of this.specks) {
      g.fillStyle(0xc8d4ea, s.alpha);
      g.fillCircle(s.x, s.y, s.r);
    }

    // ── Horizon haze — soft glow line ABOVE the horizon band so the sky
    // bleeds into the ground.
    g.fillStyle(this.horizonColor, 0.55);
    g.fillRect(0, this.horizonY - 18, 1280, 18);

    // ── Horizon band (the ground).
    g.fillStyle(this.horizonColor, 1);
    g.fillRect(0, this.horizonY, 1280, 720 - this.horizonY);

    // ── Rails — two thin horizontal lines just below the horizon, stable.
    // The train sits on these visually even though the train logic is
    // car-relative; this is mood, not mechanics.
    g.lineStyle(1, this.railColor, 0.85);
    g.lineBetween(0, this.horizonY + 6, 1280, this.horizonY + 6);
    g.lineBetween(0, this.horizonY + 14, 1280, this.horizonY + 14);

    // ── Scrolling sleepers — small filled rects between the rails. These
    // scroll with the world so the train reads as moving forward.
    g.fillStyle(this.sleeperColor, 0.95);
    let x = this.offsetX % this.tileWidth;
    if (x < 0) x += this.tileWidth;
    while (x < 1280) {
      g.fillRect(x - 2, this.horizonY + 5, 4, 12);
      x += this.tileWidth;
    }
  }
}

/**
 * Deterministic LCG-seeded scatter. Same constants as spawnDirection's RNG —
 * we don't import the RNG abstraction here because we only need a one-shot
 * generation, not a streaming RNG.
 */
function generateSpecks(count: number, width: number, height: number): Speck[] {
  let seed = 0x12345678;
  const rng = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const specks: Speck[] = [];
  for (let i = 0; i < count; i++) {
    specks.push({
      x: rng() * width,
      y: rng() * height,
      r: 0.5 + rng() * 0.8,
      alpha: 0.18 + rng() * 0.32,
    });
  }
  return specks;
}

/** Brighten a 0xRRGGBB color by `factor` toward white. */
function lighten(color: number, factor: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const bumped = (c: number) => Math.min(255, Math.round(c + (255 - c) * factor));
  return (bumped(r) << 16) | (bumped(g) << 8) | bumped(b);
}
