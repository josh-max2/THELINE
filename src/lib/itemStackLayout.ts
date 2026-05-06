// Pure layout math for item-stack visuals on a turret.
// Per ADR-002 + DESIGN §14 open question: stack direction is currently
// "above the turret, vertically." Phase 5 may swap to radial/beside via this
// single helper without touching ItemAttachmentSystem.

/** Vertical offset above the turret slot for the 1st stacked item. */
export const STACK_BASE_Y_OFFSET = 14;
/** Spacing between subsequent stacked items. */
export const STACK_STEP = 12;

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Compute the world position for an item at `stackIndex` (0 = first item)
 * stacked above a turret whose slot is at `slotWorldPos`.
 */
export function computeStackedItemPosition(slotWorldPos: Vec2, stackIndex: number): Vec2 {
  return {
    x: slotWorldPos.x,
    y: slotWorldPos.y - STACK_BASE_Y_OFFSET - STACK_STEP * stackIndex,
  };
}
