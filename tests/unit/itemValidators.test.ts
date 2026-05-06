import { describe, expect, test } from 'vitest';
import { canStackItem } from '../../src/lib/itemValidators';
import type { ItemData, ModuleData } from '../../src/lib/types';

const cannon: ModuleData = {
  id: 'basic-cannon',
  name: 'Basic Cannon',
  category: 'kinetic',
  allowedSlots: ['top'],
  render: { fill: '#000', stroke: '#000', shapes: [] },
  behavior: { kind: 'auto-fire', fireRate: 1, damage: 10 },
};

const beamTurret: ModuleData = {
  ...cannon,
  id: 'pulse-beam',
  name: 'Pulse Beam',
  behavior: { kind: 'beam' },
};

const damageItem: ItemData = {
  id: 'rivet-rounds',
  name: 'Rivet Rounds',
  category: 'damage',
  appliesTo: ['auto-fire', 'aoe-pulse'],
  render: { fill: '#000', stroke: '#000', shapes: [] },
  effects: [{ stat: 'damage', op: 'add', value: 5 }],
  stackCap: 3,
};

const splitShot: ItemData = {
  ...damageItem,
  id: 'split-shot',
  name: 'Split Shot',
  category: 'projectile',
  appliesTo: ['auto-fire'],
  effects: [{ stat: 'projectileCount', op: 'add', value: 1 }],
  stackCap: 2,
};

const beamOnly: ItemData = {
  ...damageItem,
  id: 'beam-focus',
  appliesTo: ['beam'],
  effects: [{ stat: 'damage', op: 'multiply', value: 1.25 }],
  stackCap: 1,
};

describe('canStackItem — appliesTo gating', () => {
  test('item that matches turret behavior kind → ok', () => {
    expect(canStackItem(cannon, damageItem, []).ok).toBe(true);
  });

  test('item that does not match turret behavior kind → rejected', () => {
    const r = canStackItem(cannon, beamOnly, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('beam');
  });

  test('multi-archetype item fits any of its allowed kinds', () => {
    // damageItem appliesTo: ['auto-fire', 'aoe-pulse']
    expect(canStackItem(cannon, damageItem, []).ok).toBe(true);
    // also for pulseTurret with kind 'aoe-pulse'
    const pulseTurret: ModuleData = { ...cannon, behavior: { kind: 'aoe-pulse' } };
    expect(canStackItem(pulseTurret, damageItem, []).ok).toBe(true);
  });
});

describe('canStackItem — turret maxStack cap', () => {
  test('default turret max is 3 — 3rd item ok, 4th rejected', () => {
    const stack = [damageItem, damageItem, splitShot];
    const r = canStackItem(cannon, splitShot, stack);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('cap reached');
  });

  test('explicit turret.maxStack overrides default', () => {
    const heavyTurret: ModuleData = { ...cannon, maxStack: 1 };
    expect(canStackItem(heavyTurret, damageItem, [damageItem]).ok).toBe(false);
  });

  test('exactly at max is rejected (cap is exclusive on the way in)', () => {
    const stack = [damageItem, damageItem, damageItem]; // length 3 = default max
    const r = canStackItem(cannon, splitShot, stack);
    expect(r.ok).toBe(false);
  });
});

describe('canStackItem — per-item stackCap', () => {
  test('rivet-rounds stackCap=3 — 3rd copy ok via separate turret max accommodation, 4th would be capped by item OR turret max', () => {
    // 2 rivet-rounds present → 3rd is item.stackCap edge: damageItem.stackCap=3 means 3 copies max.
    expect(canStackItem(cannon, damageItem, [damageItem, damageItem]).ok).toBe(true);
    // 3 rivet-rounds present → 4th would exceed item.stackCap=3 (and turret.maxStack=3 too).
    // Turret-max fires first per validator order; either way it's rejected.
    expect(canStackItem(cannon, damageItem, [damageItem, damageItem, damageItem]).ok).toBe(false);
  });

  test('split-shot stackCap=2 — 2nd copy ok, 3rd rejected on per-item cap', () => {
    expect(canStackItem(cannon, splitShot, [splitShot]).ok).toBe(true);
    const r = canStackItem(cannon, splitShot, [splitShot, splitShot]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('split-shot');
  });

  test('default item stackCap is 1 — second copy rejected', () => {
    const uniqueItem: ItemData = { ...damageItem, id: 'singular', stackCap: undefined };
    expect(canStackItem(cannon, uniqueItem, []).ok).toBe(true);
    expect(canStackItem(cannon, uniqueItem, [uniqueItem]).ok).toBe(false);
  });
});

describe('canStackItem — interaction', () => {
  test('appliesTo check fires before max-stack check', () => {
    // Even with empty current items, beam-only item still rejected on cannon (auto-fire).
    const r = canStackItem(cannon, beamOnly, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).not.toContain('cap');
  });

  test('different items can coexist on same turret up to turret.maxStack', () => {
    expect(canStackItem(cannon, damageItem, []).ok).toBe(true);
    expect(canStackItem(cannon, splitShot, [damageItem]).ok).toBe(true);
    // Now 2 different items, room for 1 more
    expect(canStackItem(cannon, damageItem, [damageItem, splitShot]).ok).toBe(true);
  });

  test('beam turret accepts only beam-tagged items', () => {
    expect(canStackItem(beamTurret, beamOnly, []).ok).toBe(true);
    expect(canStackItem(beamTurret, damageItem, []).ok).toBe(false);
  });
});
