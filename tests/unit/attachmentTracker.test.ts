import { describe, expect, test, beforeEach } from 'vitest';
import { AttachmentTracker } from '../../src/lib/attachmentTracker';
import type { ModuleData, QualifiedSlotId } from '../../src/lib/types';
import { qualifySlot } from '../../src/lib/types';

const cannon: ModuleData = {
  id: 'basic-cannon',
  name: 'Basic Cannon',
  category: 'kinetic',
  allowedSlots: ['top'],
  render: { fill: '#000', stroke: '#000', shapes: [] },
  behavior: { kind: 'auto-fire' },
};

const beam: ModuleData = {
  ...cannon,
  id: 'pulse-beam',
  name: 'Pulse Beam',
  behavior: { kind: 'beam' },
};

let tracker: AttachmentTracker;

beforeEach(() => {
  tracker = new AttachmentTracker();
});

describe('AttachmentTracker', () => {
  test('starts empty', () => {
    expect(tracker.size).toBe(0);
    expect(tracker.list()).toEqual([]);
  });

  test('attach + getAttached round-trip', () => {
    const slot: QualifiedSlotId = qualifySlot(0, 'engine-top-1');
    tracker.attach(slot, cannon);
    expect(tracker.size).toBe(1);
    expect(tracker.getAttached(slot)).toBe(cannon);
    expect(tracker.isOccupied(slot)).toBe(true);
  });

  test('attach to occupied slot throws', () => {
    const slot = qualifySlot(0, 'engine-top-1');
    tracker.attach(slot, cannon);
    expect(() => tracker.attach(slot, beam)).toThrow(/already occupied/);
  });

  test('detach removes and returns the module', () => {
    const slot = qualifySlot(0, 'engine-top-1');
    tracker.attach(slot, cannon);
    expect(tracker.detach(slot)).toBe(cannon);
    expect(tracker.size).toBe(0);
    expect(tracker.isOccupied(slot)).toBe(false);
  });

  test('detach on empty slot returns undefined', () => {
    expect(tracker.detach(qualifySlot(0, 'never'))).toBeUndefined();
  });

  test('two cars with same JSON slot id do NOT collide (qualified key)', () => {
    // Phase 4 will allow 2 Weapon Cars; both have slot id "weapon-top-1".
    const slotA = qualifySlot(1, 'weapon-top-1'); // first weapon car (index 1)
    const slotB = qualifySlot(2, 'weapon-top-1'); // second weapon car (index 2)
    tracker.attach(slotA, cannon);
    tracker.attach(slotB, beam);
    expect(tracker.size).toBe(2);
    expect(tracker.getAttached(slotA)).toBe(cannon);
    expect(tracker.getAttached(slotB)).toBe(beam);
  });

  test('list returns all attachments', () => {
    tracker.attach(qualifySlot(0, 'a'), cannon);
    tracker.attach(qualifySlot(1, 'b'), beam);
    const items = tracker.list();
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.module.id).sort()).toEqual(['basic-cannon', 'pulse-beam']);
  });

  test('clear empties everything', () => {
    tracker.attach(qualifySlot(0, 'a'), cannon);
    tracker.attach(qualifySlot(1, 'b'), beam);
    tracker.clear();
    expect(tracker.size).toBe(0);
  });
});
