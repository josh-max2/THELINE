import Phaser from 'phaser';
import { gameConfigBase } from './lib/gameConfig';
import { BootScene } from './scenes/BootScene';
import { RunScene } from './scenes/RunScene';
import './style.css';

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
