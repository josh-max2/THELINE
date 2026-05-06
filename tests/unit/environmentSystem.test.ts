// Unit test for EnvironmentSystem runtime behavior. Uses stub scene/combat
// so we can validate the new Task 5.2 spawn/update/fade/cleanup loop without
// booting Phaser. (EnvironmentSystem.ts uses type-only Phaser import.)

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EnvironmentSystem } from '../../src/systems/EnvironmentSystem';

interface StubGraphics {
  alpha: number;
  destroyed: boolean;
  setDepth(): StubGraphics;
  fillStyle(): StubGraphics;
  fillCircle(): StubGraphics;
  lineStyle(): StubGraphics;
  strokeCircle(): StubGraphics;
  destroy(): void;
}

function makeGraphics(): StubGraphics {
  const g: StubGraphics = {
    alpha: 1,
    destroyed: false,
    setDepth: () => g,
    fillStyle: () => g,
    fillCircle: () => g,
    lineStyle: () => g,
    strokeCircle: () => g,
    destroy: () => {
      g.destroyed = true;
    },
  };
  return g;
}

interface CreatedGraphics {
  graphics: StubGraphics;
}

function makeStubs(currentEnemies: { x: number; y: number; hp: number }[] = []) {
  const created: CreatedGraphics[] = [];
  const scene = {
    add: {
      graphics: () => {
        const g = makeGraphics();
        created.push({ graphics: g });
        return g;
      },
    },
  };
  const damaged: { enemy: typeof currentEnemies[number]; amount: number }[] = [];
  const combat = {
    enemiesInRadius: vi.fn((x: number, y: number, r: number) =>
      currentEnemies.filter((e) => Math.hypot(e.x - x, e.y - y) <= r),
    ),
    damageEnemy: vi.fn((e: typeof currentEnemies[number], amount: number) => {
      damaged.push({ enemy: e, amount });
      e.hp -= amount;
    }),
  };
  const parallax = { setBiomeTint: vi.fn() };
  return { scene, combat, parallax, created, damaged };
}

describe('EnvironmentSystem.spawnZone + update', () => {
  let stubs: ReturnType<typeof makeStubs>;
  let env: EnvironmentSystem;

  beforeEach(() => {
    stubs = makeStubs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    env = new EnvironmentSystem(stubs.scene as any, stubs.parallax as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    env.bindCombatSystem(stubs.combat as any);
  });

  test('starts with no zones', () => {
    expect(env.activeZoneCount).toBe(0);
  });

  test('spawnZone(rock × explosive) creates a zone (cell.damagePerSec=3, durationSec=2)', () => {
    env.spawnZone(100, 100, 'explosive');
    expect(env.activeZoneCount).toBe(1);
    expect(stubs.created).toHaveLength(1);
    expect(stubs.created[0].graphics.alpha).toBe(1); // fresh = full alpha
  });

  test('update(dt) damages enemies inside the radius', () => {
    const enemy = { x: 110, y: 100, hp: 10 };
    stubs = makeStubs([enemy]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    env = new EnvironmentSystem(stubs.scene as any, stubs.parallax as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    env.bindCombatSystem(stubs.combat as any);

    env.spawnZone(100, 100, 'explosive'); // dmg/sec=3, duration=2 in rock
    env.update(0.5); // 0.5s tick → 3 * 0.5 = 1.5 dmg

    expect(stubs.damaged).toHaveLength(1);
    expect(stubs.damaged[0].amount).toBeCloseTo(1.5);
  });

  test('update(dt) skips enemies outside radius', () => {
    const farEnemy = { x: 1000, y: 1000, hp: 10 };
    stubs = makeStubs([farEnemy]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    env = new EnvironmentSystem(stubs.scene as any, stubs.parallax as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    env.bindCombatSystem(stubs.combat as any);

    env.spawnZone(100, 100, 'explosive');
    env.update(0.5);

    expect(stubs.damaged).toHaveLength(0);
  });

  test('zone alpha fades linearly across duration', () => {
    env.spawnZone(0, 0, 'explosive'); // duration=2
    env.update(1.0); // halfway
    expect(stubs.created[0].graphics.alpha).toBeCloseTo(0.5);
  });

  test('zone self-destructs when elapsed >= duration', () => {
    env.spawnZone(0, 0, 'explosive'); // duration=2
    env.update(2.0); // exactly at duration
    expect(env.activeZoneCount).toBe(0);
    expect(stubs.created[0].graphics.destroyed).toBe(true);
  });

  test('multiple zones tracked + ticked independently', () => {
    env.spawnZone(0, 0, 'explosive'); // duration=2
    env.spawnZone(0, 0, 'cryo'); // duration=2 in rock
    expect(env.activeZoneCount).toBe(2);
    env.update(2.0);
    expect(env.activeZoneCount).toBe(0);
  });

  test('destroy() clears all zones + their graphics', () => {
    env.spawnZone(0, 0, 'explosive');
    env.spawnZone(0, 0, 'cryo');
    env.destroy();
    expect(env.activeZoneCount).toBe(0);
    expect(stubs.created.every((c) => c.graphics.destroyed)).toBe(true);
  });

  test('biome change does not affect already-spawned zones', () => {
    env.spawnZone(0, 0, 'explosive'); // resolved against rock
    env.setBiome('forest');
    expect(env.activeZoneCount).toBe(1);
    expect(env.biome()).toBe('forest');
  });
});
