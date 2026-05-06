import Phaser from 'phaser';
import { TrainSystem } from '../systems/TrainSystem';
import { ParallaxBackground } from '../lib/parallaxBackground';

/** Per ADR-001 §Gap 2 — world scrolls past the static train at this rate. */
export const WORLD_VELOCITY_PX_PER_SEC = 50;

export class RunScene extends Phaser.Scene {
  private trainSystem!: TrainSystem;
  private parallax!: ParallaxBackground;

  constructor() {
    super({ key: 'RunScene' });
  }

  create(): void {
    this.parallax = new ParallaxBackground(this, WORLD_VELOCITY_PX_PER_SEC);

    this.trainSystem = new TrainSystem(this);
    this.trainSystem.addCar('engine');

    // Dev-only HUD label. Will be replaced in Phase 4 with real HUD.
    this.add
      .text(16, 16, 'THE LINE — Phase 3 · Task 3.3 (TrainSystem v0)', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7b8aa3',
      })
      .setDepth(100);
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.parallax.update(dt);
    this.trainSystem.update(dt);
  }
}
