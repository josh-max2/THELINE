// Pure attach/detach bookkeeping for items stacked on turrets. Per ADR-002.
// Analogous to AttachmentTracker but each slot can hold MULTIPLE items
// (a turret's item-stack), so the value type is ItemData[] not ItemData.
//
// No Phaser. Validation is the caller's responsibility (see canStackItem).

import type { ItemData, QualifiedSlotId } from './types';

export class ItemStackTracker {
  private readonly stacks = new Map<QualifiedSlotId, ItemData[]>();

  /** Append an item to the slot's stack. No validation here — call canStackItem first. */
  attach(qualifiedSlotId: QualifiedSlotId, item: ItemData): void {
    const stack = this.stacks.get(qualifiedSlotId);
    if (stack) {
      stack.push(item);
    } else {
      this.stacks.set(qualifiedSlotId, [item]);
    }
  }

  /**
   * Remove the first item with `itemId` from the slot's stack.
   * Returns the removed ItemData or undefined if not found.
   * Cleans up the slot entry when its stack becomes empty.
   */
  detach(qualifiedSlotId: QualifiedSlotId, itemId: string): ItemData | undefined {
    const stack = this.stacks.get(qualifiedSlotId);
    if (!stack) return undefined;
    const idx = stack.findIndex((i) => i.id === itemId);
    if (idx < 0) return undefined;
    const [removed] = stack.splice(idx, 1);
    if (stack.length === 0) this.stacks.delete(qualifiedSlotId);
    return removed;
  }

  /** Remove every item from a slot at once (e.g., when turret detaches). */
  detachAll(qualifiedSlotId: QualifiedSlotId): ItemData[] {
    const stack = this.stacks.get(qualifiedSlotId);
    if (!stack) return [];
    this.stacks.delete(qualifiedSlotId);
    return stack;
  }

  /** Read-only view of the items at a slot. Empty array if none. */
  itemsAt(qualifiedSlotId: QualifiedSlotId): ReadonlyArray<ItemData> {
    return this.stacks.get(qualifiedSlotId) ?? [];
  }

  countAt(qualifiedSlotId: QualifiedSlotId): number {
    return this.stacks.get(qualifiedSlotId)?.length ?? 0;
  }

  /** Total items across all slots — useful for HUD / debug. */
  get totalItems(): number {
    let n = 0;
    for (const s of this.stacks.values()) n += s.length;
    return n;
  }

  /** Number of slots that currently hold at least one item. */
  get occupiedSlotCount(): number {
    return this.stacks.size;
  }

  clear(): void {
    this.stacks.clear();
  }
}
