// Pure validators for module attachment. No Phaser imports — testable anywhere.
// Per ADR-001 §Gap 1 — typed slots, module declares allowedSlots.

import type { ModuleData, SlotDef } from './types';

export type AttachValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Decide whether `module` can be attached at `slot` given the slot's current
 * occupancy. Pure — no side effects. Caller passes a snapshot of state.
 */
export function canAttach(
  slot: SlotDef,
  module: ModuleData,
  isOccupied: boolean,
): AttachValidationResult {
  if (isOccupied) {
    return { ok: false, reason: `Slot ${slot.id} is already occupied.` };
  }
  if (!module.allowedSlots.includes(slot.type)) {
    return {
      ok: false,
      reason: `Module ${module.id} (allowed: ${module.allowedSlots.join('/')}) cannot fit slot type "${slot.type}".`,
    };
  }
  return { ok: true };
}
