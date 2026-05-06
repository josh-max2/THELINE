import Phaser from 'phaser';
import { gameConfigBase } from './lib/gameConfig';
import { BootScene } from './scenes/BootScene';
import { RunScene } from './scenes/RunScene';
import { salvageStore } from './lib/salvageStore';
import './style.css';

// E2E-only side door: Playwright reads salvage total via window.__salvage.
// Documented in PROGRESS.md. Cheap; remove if it ever leaks anywhere it
// shouldn't (e.g., user-visible bugs traced to test code in production).
declare global {
  interface Window {
    __salvage?: { total: number };
  }
}
Object.defineProperty(window, '__salvage', {
  get: () => ({ total: salvageStore.total }),
});

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  ...gameConfigBase,
  scene: [BootScene, RunScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: false,
    antialias: true,
    // Allow Playwright/in-page tooling to read pixel data from the WebGL
    // canvas via toDataURL / drawImage. Tiny perf cost; worth it for testability.
    preserveDrawingBuffer: true,
  },
};

new Phaser.Game(config);
