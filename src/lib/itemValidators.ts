// Pure validators for item stacking on turrets. No Phaser. Per ADR-002.
//
// Two caps composed:
//   1. `turret.maxStack` (default DEFAULT_TURRET_MAX_STACK = 3) — how many
//      items total can stack on this turret.
//   2. `item.stackCap` (default DEFAULT_ITEM_STACK_CAP = 1) — how many copies
//      of THIS specific item can sit on one turret.
//
// Plus: the item's `appliesTo` list must include the turret's `behavior.kind`.

import type { ItemData, ModuleData } from './types';
import { DEFAULT_ITEM_STACK_CAP, DEFAULT_TURRET_MAX_STACK } from './types';

export type StackValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function canStackItem(
  turret: ModuleData,
  item: ItemData,
  currentItems: ReadonlyArray<ItemData>,
): StackValidationResult {
  if (!item.appliesTo.includes(turret.behavior.kind)) {
    return {
      ok: false,
      reason: `Item ${item.id} (appliesTo: ${item.appliesTo.join('/')}) cannot fit turret with behavior.kind "${turret.behavior.kind}".`,
    };
  }

  const turretMax = turret.maxStack ?? DEFAULT_TURRET_MAX_STACK;
  if (currentItems.length >= turretMax) {
    return {
      ok: false,
      reason: `Turret ${turret.id} item-stack cap reached (${turretMax}).`,
    };
  }

  const itemMax = item.stackCap ?? DEFAULT_ITEM_STACK_CAP;
  const sameCount = currentItems.filter((i) => i.id === item.id).length;
  if (sameCount >= itemMax) {
    return {
      ok: false,
      reason: `Item ${item.id} stack cap reached (${itemMax} cop${itemMax === 1 ? 'y' : 'ies'} max per turret).`,
    };
  }

  return { ok: true };
}
