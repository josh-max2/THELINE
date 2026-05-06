import Phaser from 'phaser';
import { lerpAlpha, timeScaleFor } from '../lib/slowTimeMath';

const TINT_TARGET_ALPHA = 0.18;
const TINT_FADE_FACTOR = 0.18; // per-frame approach speed
const TINT_COLOR = 0x4070b0;

/**
 * Reads SPACEBAR state and exposes a `timeScale` for the scene update loop.
 * Per DESIGN §7 — slow-time, NOT full pause. Bastion-inspired.
 *
 * Visual: a full-screen blue-tinted overlay fades in when slowed and out
 * when released. Phase 5 polish replaces with desaturation shader + vignette.
 */
export class SlowTimeSystem {
  private slowed = false;
  private overlay: Phaser.GameObjects.Graphics;
  private overlayAlpha = 0;
  private readonly width: number;
  private readonly height: number;

  constructor(scene: Phaser.Scene) {
    this.width = scene.scale.width;
    this.height = scene.scale.height;

    this.overlay = scene.add.graphics();
    this.overlay.setDepth(200);
    this.redrawOverlay();

    const space = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    space?.on('down', () => {
      this.slowed = true;
    });
    space?.on('up', () => {
      this.slowed = false;
    });
  }

  /** Multiplier callers should apply to dt before sub-system updates. */
  get timeScale(): number {
    return timeScaleFor(this.slowed);
  }

  get isSlowed(): boolean {
    return this.slowed;
  }

  /** Driven from the scene's real-time tick (NOT scaled dt — overlay fades regardless). */
  updateRealtime(): void {
    const target = this.slowed ? TINT_TARGET_ALPHA : 0;
    const next = lerpAlpha(this.overlayAlpha, target, TINT_FADE_FACTOR);
    if (Math.abs(next - this.overlayAlpha) < 0.001) {
      if (this.overlayAlpha === target) return;
      this.overlayAlpha = target;
    } else {
      this.overlayAlpha = next;
    }
    this.redrawOverlay();
  }

  destroy(): void {
    this.overlay.destroy();
  }

  private redrawOverlay(): void {
    this.overlay.clear();
    if (this.overlayAlpha <= 0) return;
    this.overlay.fillStyle(TINT_COLOR, this.overlayAlpha);
    this.overlay.fillRect(0, 0, this.width, this.height);
  }
}
