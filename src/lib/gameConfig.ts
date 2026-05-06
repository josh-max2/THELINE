/**
 * Pure-data Phaser config primitives. No Phaser import — safe to unit-test
 * in any environment, including ones without a real <canvas> implementation.
 *
 * The full GameConfig (scene classes, Phaser.AUTO, scale modes) is assembled
 * in main.ts where Phaser itself is imported.
 */
export const gameConfigBase = {
  width: 1280,
  height: 720,
  parent: 'game',
  backgroundColor: '#0a0d14',
} as const;

export const sceneOrder = ['BootScene', 'HubScene', 'RunScene', 'DeathScene'] as const;
export type SceneName = (typeof sceneOrder)[number];
