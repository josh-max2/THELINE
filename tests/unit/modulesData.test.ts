import { describe, expect, test } from 'vitest';
import modulesRaw from '../../src/data/modules.json';
import type { ModuleData } from '../../src/lib/types';
import { moduleBehaviors } from '../../src/lib/moduleBehaviors';

const modules = modulesRaw as unknown as Record<string, ModuleData>;

describe('modules.json — Phase 5 Task 5.1 catalog', () => {
  test('contains 30 modules total', () => {
    expect(Object.keys(modules)).toHaveLength(30);
  });

  test('distribution per build plan: 5 kinetic, 5 fire, 5 cryo, 4 explosive, 3 electric, 8 support', () => {
    const counts: Record<string, number> = {};
    for (const m of Object.values(modules)) {
      counts[m.category] = (counts[m.category] ?? 0) + 1;
    }
    expect(counts.kinetic).toBe(5);
    expect(counts.fire).toBe(5);
    expect(counts.cryo).toBe(5);
    expect(counts.explosive).toBe(4);
    expect(counts.electric).toBe(3);
    expect(counts.support).toBe(8);
  });

  test('every module has required ModuleData fields', () => {
    for (const [id, m] of Object.entries(modules)) {
      expect(m.id, id).toBe(id);
      expect(m.name, id).toBeTruthy();
      expect(m.category, id).toBeTruthy();
      expect(Array.isArray(m.allowedSlots), id).toBe(true);
      expect(m.allowedSlots.length, id).toBeGreaterThan(0);
      expect(m.render, id).toBeTruthy();
      expect(Array.isArray(m.render.shapes), id).toBe(true);
      expect(m.render.shapes.length, id).toBeGreaterThan(0);
      expect(m.behavior, id).toBeTruthy();
      expect(typeof m.behavior.kind, id).toBe('string');
    }
  });

  // Tightened in Phase 6.1 audit — only allow kinds that have a registered
  // handler, not just kinds present in the BehaviorKind type union. The union
  // declares `shield`/`repair`/`terrain-effect` as future kinds; if a module
  // ever uses them before a handler ships, MAS.attach throws at runtime —
  // this test catches that earlier.
  test('every module references a behavior kind that has a registered handler', () => {
    for (const [id, m] of Object.entries(modules)) {
      expect(
        moduleBehaviors.has(m.behavior.kind),
        `${id}: ${m.behavior.kind} has no handler registered`,
      ).toBe(true);
    }
  });

  test('every module declares non-negative power consumption', () => {
    for (const [id, m] of Object.entries(modules)) {
      const p = m.behavior['power'];
      expect(typeof p, `${id}: power must be a number`).toBe('number');
      expect(p as number, id).toBeGreaterThanOrEqual(0);
    }
  });

  test('all module ids are unique', () => {
    const ids = Object.values(modules).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every module has at least one allowed slot type', () => {
    const validSlotTypes = new Set(['top', 'side-left', 'side-right', 'belly']);
    for (const [id, m] of Object.entries(modules)) {
      for (const s of m.allowedSlots) {
        expect(validSlotTypes.has(s), `${id} has invalid slot type ${s}`).toBe(true);
      }
    }
  });
});
