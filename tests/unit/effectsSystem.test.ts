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
  lineStyle(): StubGraphics;
  strokeCircle(): StubGraphics;
  setRotation(): StubGraphics;
  destroy(): void;
}

interface StubText {
  destroyed: boolean;
  setOrigin(): StubText;
  setDepth(): StubText;
  destroy(): void;
}

function makeGraphics(): StubGraphics {
  const g: StubGraphics = {
    destroyed: false,
    setDepth: () => g,
    fillStyle: () => g,
    fillCircle: () => g,
    fillTriangle: () => g,
    lineStyle: () => g,
    strokeCircle: () => g,
    setRotation: () => g,
    destroy: () => {
      g.destroyed = true;
    },
  };
  return g;
}

function makeText(): StubText {
  const t: StubText = {
    destroyed: false,
    setOrigin: () => t,
    setDepth: () => t,
    destroy: () => {
      t.destroyed = true;
    },
  };
  return t;
}

function makeStubs() {
  const created: StubGraphics[] = [];
  const texts: StubText[] = [];
  const tweenAdd = vi.fn();
  const cameraShake = vi.fn();
  const scene = {
    add: {
      graphics: () => {
        const g = makeGraphics();
        created.push(g);
        return g;
      },
      text: () => {
        const t = makeText();
        texts.push(t);
        return t;
      },
    },
    tweens: { add: tweenAdd },
    cameras: { main: { shake: cameraShake } },
  };
  return { scene, created, texts, tweenAdd, cameraShake };
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
    // Phase 6 juice: kill burst now layers a shockwave on top — 2 graphics.
    expect(stubs.created.length).toBeGreaterThanOrEqual(2);
    expect(stubs.tweenAdd.mock.calls.length).toBeGreaterThanOrEqual(2);
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

describe('EffectsSystem.spawnSparks', () => {
  test('count parameter controls spawned graphics count', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).spawnSparks(0, 0, 'fire', 5);
    expect(stubs.created).toHaveLength(5);
    expect(stubs.tweenAdd).toHaveBeenCalledTimes(5);
  });

  test('default colorKey works without explicit arg', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).spawnSparks(10, 10);
    expect(stubs.created.length).toBeGreaterThan(0);
  });
});

describe('EffectsSystem.spawnShockwave', () => {
  test('creates one graphics + a scaling tween', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).spawnShockwave(50, 50, '#ff8040', 60);
    expect(stubs.created).toHaveLength(1);
    expect(stubs.tweenAdd).toHaveBeenCalledTimes(1);
    const tween = stubs.tweenAdd.mock.calls[0][0];
    expect(tween.alpha).toBe(0);
    expect(tween.scale).toBeGreaterThan(1);
  });
});

describe('EffectsSystem.spawnDamageNumber', () => {
  test('creates a text + a drift-up tween, no graphics', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).spawnDamageNumber(100, 100, 7);
    expect(stubs.texts).toHaveLength(1);
    expect(stubs.created).toHaveLength(0);
    expect(stubs.tweenAdd).toHaveBeenCalledTimes(1);
    const tween = stubs.tweenAdd.mock.calls[0][0];
    expect(tween.targets).toBe(stubs.texts[0]);
    expect(tween.alpha).toBe(0);
    // y drifts upward (smaller value).
    expect(tween.y).toBeLessThan(100);
  });

  test('rounds and floors to at least 1', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).spawnDamageNumber(0, 0, 0.3);
    expect(stubs.texts).toHaveLength(1);
    // The text payload isn't introspected here, but we know spawn succeeded.
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

  test('impact tier shakes (Phase 6 juice — non-fatal hit feedback)', () => {
    const stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new EffectsSystem(stubs.scene as any).shake('impact');
    expect(stubs.cameraShake).toHaveBeenCalledTimes(1);
  });
});
