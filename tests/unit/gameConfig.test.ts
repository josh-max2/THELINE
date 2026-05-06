import { describe, expect, test } from 'vitest';
import { gameConfigBase, sceneOrder } from '../../src/lib/gameConfig';

describe('gameConfigBase (pure data — no Phaser import at test time)', () => {
  test('targets 1280×720 viewport', () => {
    expect(gameConfigBase.width).toBe(1280);
    expect(gameConfigBase.height).toBe(720);
  });

  test('renders into #game container', () => {
    expect(gameConfigBase.parent).toBe('game');
  });

  test('uses dark background suitable for vector-geometric silhouettes', () => {
    expect(gameConfigBase.backgroundColor).toBe('#0a0d14');
  });
});

describe('sceneOrder', () => {
  test('Boot precedes Run', () => {
    expect(sceneOrder).toEqual(['BootScene', 'RunScene']);
  });
});
