// EffectsSystem unit test — stubs Phaser scene to verify spawn methods create
// graphics + tweens without booting Phaser (same pattern as environmentSystem.test).

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EffectsSystem } from '../../src/systems/EffectsSystem';

interface StubGraphics {
  destroyed: boolean;
  setDepth(): StubGraphics;
  fillStyle(): StubGraphics;
  fillCircle(): StubGraphics;
  fillTriangle(): StubGraphics;
  setRotation(): StubGraphics;
  destroy(): void;
}

function makeGraphics(): StubGraphics {
  const g: StubGraphics = {
    destroyed: false,
    setDepth: () => g,
    fillStyle: () => g,
    fillCircle: () => g,
    fillTriangle: () => g,
    setRotation: () => g,
    destroy: () => {
      g.destroyed = true;
    },
  };
  return g;
}

function makeStubs() {
  const created: StubGraphics[] = [];
  const tweenAdd = vi.fn();
  const cameraShake = vi.fn();
  const scene = {
    add: {
      graphics: () => {
        const g = makeGraphics();
        created.push(g);
        return g;
      },
    },
    tweens: { add: tweenAdd },
    cameras: { main: { shake: cameraShake } },
  };
  return { scene, created, tweenAdd, cameraShake };
}

describe('EffectsSystem.spawnHitFlash', () => {
  let stubs: ReturnType<typeof makeStubs>;
  let effects: EffectsSystem;

  beforeEach(() => {
    stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    effects = new EffectsSystem(stubs.scene as any);
  });

  test('creates a graphics + a tween', () => {
    effects.spawnHitFlash(100, 100);
    expect(stubs.created).toHaveLength(1);
    expect(stubs.tweenAdd).toHaveBeenCalledTimes(1);
  });

  test('tween targets the graphics + has alpha:0 + onComplete cleanup', () => {
    effects.spawnHitFlash(0, 0);
    const tween = stubs.tweenAdd.mock.calls[0][0];
    expect(tween.targets).toBe(stubs.created[0]);
    expect(tween.alpha).toBe(0);
    expect(typeof tween.onComplete).toBe('function');
    tween.onComplete();
    expect(stubs.created[0].destroyed).toBe(true);
  });
});

describe('EffectsSystem.spawnKillBurst', () => {
  test('creates a graphics + tween that fades + scales out', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).spawnKillBurst(50, 50, '#ff8040');
    expect(stubs.created).toHaveLength(1);
    expect(stubs.tweenAdd).toHaveBeenCalledTimes(1);
    const tween = stubs.tweenAdd.mock.calls[0][0];
    expect(tween.alpha).toBe(0);
    expect(tween.scale).toBeGreaterThan(1);
  });
});

describe('EffectsSystem.spawnMuzzleFlash', () => {
  test('rotates toward the target', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).spawnMuzzleFlash(0, 0, 100, 0);
    expect(stubs.created).toHaveLength(1);
    expect(stubs.tweenAdd).toHaveBeenCalledTimes(1);
  });
});

describe('EffectsSystem.shake', () => {
  test('passes preset duration + intensity to camera.shake', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).shake('bigKill');
    expect(stubs.cameraShake).toHaveBeenCalledTimes(1);
    const [duration, intensity] = stubs.cameraShake.mock.calls[0];
    expect(duration).toBeGreaterThan(0);
    expect(intensity).toBeGreaterThan(0);
  });

  test('skips zero-intensity tier (hit flash is not a shake source)', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).shake('hit');
    expect(stubs.cameraShake).not.toHaveBeenCalled();
  });
});
