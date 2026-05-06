import Phaser from 'phaser';
import itemsDataRaw from '../data/items.json';
import type { ItemData, QualifiedSlotId } from '../lib/types';
import { qualifySlot } from '../lib/types';
import { ItemStackTracker } from '../lib/itemStackTracker';
import { canStackItem } from '../lib/itemValidators';
import { drawRecipe } from '../lib/drawRecipe';
import type { TrainSystem } from './TrainSystem';
import type { ModuleAttachmentSystem } from './ModuleAttachmentSystem';

const ITEMS = itemsDataRaw as unknown as Record<string, ItemData>;

/** Vertical offset above the turret slot for the 1st stacked item. */
const STACK_BASE_Y_OFFSET = 14;
/** Spacing between subsequent stacked items. */
const STACK_STEP = 12;
/** Render depth for items — above turrets but below projectiles/explosions. */
const ITEM_DEPTH = 60;

/**
 * Phaser shell over the pure ItemStackTracker. Owns the tracker + per-item
 * Phaser graphics. Stacking is vertical: 1st item at slot.y − 14, 2nd at
 * slot.y − 26, etc.
 *
 * Per ADR-002: validation goes through pure `canStackItem`; this class
 * doesn't re-implement the rules. Behavior handlers read items via
 * `BehaviorContext.items.itemsAt(qualifiedSlotId)`.
 */
export class ItemAttachmentSystem {
  private readonly scene: Phaser.Scene;
  private readonly train: TrainSystem;
  private readonly tracker = new ItemStackTracker();
  private readonly itemGraphics = new Map<QualifiedSlotId, Phaser.GameObjects.Graphics[]>();
  private mas?: ModuleAttachmentSystem;

  constructor(scene: Phaser.Scene, train: TrainSystem) {
    this.scene = scene;
    this.train = train;
  }

  /**
   * Resolves the IAS↔MAS reference cycle: MAS is constructed first, IAS
   * second, then this binds. Throws clearly if `attach` is called before this.
   */
  bindModuleSystem(mas: ModuleAttachmentSystem): void {
    this.mas = mas;
  }

  /**
   * Attach `itemId` to the turret at (carIndex, slotId). Throws on:
   * - unknown item id
   * - no turret at that slot
   * - validation failure (slot type mismatch, stack caps reached)
   */
  attach(carIndex: number, slotId: string, itemId: string): void {
    if (!this.mas) {
      throw new Error('ItemAttachmentSystem.bindModuleSystem(...) must be called before attach()');
    }
    const item = ITEMS[itemId];
    if (!item) throw new Error(`Unknown item id: ${itemId}`);

    const qualifiedSlotId = qualifySlot(carIndex, slotId);
    const turret = this.mas.getModuleAt(qualifiedSlotId);
    if (!turret) {
      throw new Error(`No turret attached at ${qualifiedSlotId}; attach a turret first.`);
    }
    const currentItems = this.tracker.itemsAt(qualifiedSlotId);
    const validation = canStackItem(turret, item, currentItems);
    if (!validation.ok) throw new Error(validation.reason);

    // Position computed from the car/slot — same math the rest of the
    // codebase uses for slot world positions (see moduleBehaviors.ts).
    const car = this.train.getCar(carIndex);
    if (!car) throw new Error(`No car at index ${carIndex}`);
    const slot = car.data.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error(`Car ${car.data.name} has no slot ${slotId}`);

    const stackIndex = currentItems.length; // 0 = first, 1 = second, ...
    const x = car.x + slot.x;
    const y = car.y + slot.y - STACK_BASE_Y_OFFSET - STACK_STEP * stackIndex;

    const g = this.scene.add.graphics({ x, y });
    drawRecipe(g, item.render);
    g.setDepth(ITEM_DEPTH);

    this.tracker.attach(qualifiedSlotId, item);
    const stack = this.itemGraphics.get(qualifiedSlotId) ?? [];
    stack.push(g);
    this.itemGraphics.set(qualifiedSlotId, stack);
  }

  /** Read items at a slot — used by behavior handlers via BehaviorContext. */
  itemsAt(qualifiedSlotId: QualifiedSlotId): ReadonlyArray<ItemData> {
    return this.tracker.itemsAt(qualifiedSlotId);
  }

  /** Remove every item at a slot. Called by MAS when a turret detaches. */
  detachAllAt(qualifiedSlotId: QualifiedSlotId): void {
    const stack = this.itemGraphics.get(qualifiedSlotId);
    if (stack) {
      for (const g of stack) g.destroy();
      this.itemGraphics.delete(qualifiedSlotId);
    }
    this.tracker.detachAll(qualifiedSlotId);
  }

  /** Detach every item across the whole train (scene SHUTDOWN). */
  destroyAll(): void {
    for (const stack of this.itemGraphics.values()) {
      for (const g of stack) g.destroy();
    }
    this.itemGraphics.clear();
    this.tracker.clear();
  }

  get totalItems(): number {
    return this.tracker.totalItems;
  }
}
