import Phaser from 'phaser';
import modulesDataRaw from '../data/modules.json';
import type { ModuleData, SlotDef } from '../lib/types';
import { qualifySlot } from '../lib/types';
import type { PlacedCar } from './TrainSystem';
import { drawRecipe } from '../lib/drawRecipe';
import { canAttach } from '../lib/moduleValidators';
import { AttachmentTracker } from '../lib/attachmentTracker';
import { moduleBehaviors, type AttachedModuleHandle, type BehaviorContext } from '../lib/moduleBehaviors';
import type { TrainSystem } from './TrainSystem';
import type { CombatSystem } from './CombatSystem';

const MODULES = modulesDataRaw as unknown as Record<string, ModuleData>;

interface PhaserAttachment {
  handle: AttachedModuleHandle;
  graphics: Phaser.GameObjects.Graphics;
}

/**
 * Glue between cars (TrainSystem), module data (modules.json), pure attachment
 * bookkeeping (AttachmentTracker), and Phaser graphics. Per ADR-001 §Gap 1
 * (typed slots), §Gap 3 (JSON shape recipe), §Gap 6 (tagged behavior registry).
 *
 * Storage: this system owns the canonical map of attachments via the tracker.
 * Cars do not track their own modules.
 */
export class ModuleAttachmentSystem {
  private readonly scene: Phaser.Scene;
  private readonly train: TrainSystem;
  private readonly combat: CombatSystem;
  private readonly tracker = new AttachmentTracker();
  private readonly phaserAttachments = new Map<string, PhaserAttachment>();

  constructor(scene: Phaser.Scene, train: TrainSystem, combat: CombatSystem) {
    this.scene = scene;
    this.train = train;
    this.combat = combat;
  }

  /**
   * Attach module `moduleId` to slot `slotId` on the car at `carIndex`.
   * Throws on validation failure (unknown module/car, slot occupied, slot type
   * incompatible).
   */
  attach(carIndex: number, slotId: string, moduleId: string): AttachedModuleHandle {
    const module = MODULES[moduleId];
    if (!module) {
      throw new Error(`Unknown module id: ${moduleId}`);
    }
    const car = this.train.getCar(carIndex);
    if (!car) {
      throw new Error(`No car at index ${carIndex}`);
    }
    const slot = car.data.slots.find((s) => s.id === slotId);
    if (!slot) {
      throw new Error(`Car ${car.data.name} has no slot "${slotId}"`);
    }
    const qualifiedSlotId = qualifySlot(carIndex, slotId);
    const validation = canAttach(slot, module, this.tracker.isOccupied(qualifiedSlotId));
    if (!validation.ok) {
      throw new Error(validation.reason);
    }
    // Fail loud, not silent: a module whose behavior.kind has no registered
    // handler would otherwise sit there doing nothing forever and burn an
    // afternoon to debug.
    if (!moduleBehaviors.has(module.behavior.kind)) {
      throw new Error(
        `Module ${module.id} declares behavior.kind "${module.behavior.kind}" but no handler is registered.`,
      );
    }

    this.tracker.attach(qualifiedSlotId, module);

    const graphics = this.renderModule(module, car, slot);
    const handle: AttachedModuleHandle = { qualifiedSlotId, data: module, state: {} };
    this.phaserAttachments.set(qualifiedSlotId, { handle, graphics });

    moduleBehaviors.get(module.behavior.kind)?.init?.(handle, this.context());
    return handle;
  }

  detach(carIndex: number, slotId: string): ModuleData | undefined {
    const qualifiedSlotId = qualifySlot(carIndex, slotId);
    const phaserAttachment = this.phaserAttachments.get(qualifiedSlotId);
    if (!phaserAttachment) return undefined;

    moduleBehaviors
      .get(phaserAttachment.handle.data.behavior.kind)
      ?.destroy?.(phaserAttachment.handle, this.context());
    phaserAttachment.graphics.destroy();
    this.phaserAttachments.delete(qualifiedSlotId);
    return this.tracker.detach(qualifiedSlotId);
  }

  /** Drive every attached module's behavior handler each frame. */
  update(deltaSeconds: number): void {
    const ctx = this.context();
    for (const [, attachment] of this.phaserAttachments) {
      const handler = moduleBehaviors.get(attachment.handle.data.behavior.kind);
      handler?.update(deltaSeconds, attachment.handle, ctx);
    }
  }

  get attachmentCount(): number {
    return this.tracker.size;
  }

  /**
   * Detach every attached module, firing each handler's `destroy()` lifecycle
   * hook. Call from scene SHUTDOWN so behaviors holding non-Phaser resources
   * (caches, listeners) clean up. Phase 4.2.1 will introduce stat-composition
   * caches that need this.
   */
  destroyAll(): void {
    // Snapshot keys — `detach` mutates the map.
    const ids = Array.from(this.phaserAttachments.keys());
    for (const qualifiedSlotId of ids) {
      const colon = qualifiedSlotId.indexOf(':');
      if (colon < 0) continue;
      const carIndex = Number(qualifiedSlotId.slice(0, colon));
      const slotId = qualifiedSlotId.slice(colon + 1);
      this.detach(carIndex, slotId);
    }
  }

  private renderModule(
    module: ModuleData,
    car: PlacedCar,
    slot: SlotDef,
  ): Phaser.GameObjects.Graphics {
    // Module graphics positioned in world coords (car position + slot offset).
    // Train is fixed in screen space in v1, so this needs no per-frame update.
    const worldX = car.x + slot.x;
    const worldY = car.y + slot.y;
    const g = this.scene.add.graphics({ x: worldX, y: worldY });
    drawRecipe(g, module.render);
    return g;
  }

  private context(): BehaviorContext {
    return { scene: this.scene, train: this.train, combat: this.combat };
  }
}
