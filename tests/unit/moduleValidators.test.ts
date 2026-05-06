import { describe, expect, test } from 'vitest';
import { canAttach } from '../../src/lib/moduleValidators';
import type { ModuleData, SlotDef } from '../../src/lib/types';

const topSlot: SlotDef = { id: 'engine-top-1', type: 'top', x: -24, y: -36 };
const bellySlot: SlotDef = { id: 'crew-belly-1', type: 'belly', x: 0, y: 24 };

const cannon: ModuleData = {
  id: 'basic-cannon',
  name: 'Basic Cannon',
  category: 'kinetic',
  allowedSlots: ['top'],
  render: { fill: '#000', stroke: '#000', shapes: [] },
  behavior: { kind: 'auto-fire', fireRate: 1, damage: 10 },
};

const shield: ModuleData = {
  ...cannon,
  id: 'belly-shield',
  name: 'Belly Shield',
  category: 'support',
  allowedSlots: ['belly'],
  behavior: { kind: 'shield', strength: 100 },
};

describe('canAttach', () => {
  test('matching slot type, slot empty → ok', () => {
    expect(canAttach(topSlot, cannon, false)).toEqual({ ok: true });
  });

  test('slot already occupied → rejected', () => {
    const r = canAttach(topSlot, cannon, true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('occupied');
  });

  test('module declares only "top", placed in "belly" → rejected', () => {
    const r = canAttach(bellySlot, cannon, false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('belly');
  });

  test('module declares "belly", placed in "top" → rejected', () => {
    const r = canAttach(topSlot, shield, false);
    expect(r.ok).toBe(false);
  });

  test('module with multi-slot allowance fits any allowed type', () => {
    const versatile: ModuleData = {
      ...cannon,
      allowedSlots: ['top', 'side-left', 'side-right'],
    };
    expect(canAttach(topSlot, versatile, false).ok).toBe(true);
  });
});
