// Pure attach/detach bookkeeping. No Phaser imports — fully unit-testable.
// Owns the canonical Map<QualifiedSlotId, ModuleData>. The Phaser-aware
// ModuleAttachmentSystem composes this tracker with side-effect rendering.
//
// Per advisor catch (Task 3.4 plan review): keys must be qualified by car
// index because Phase 4 allows multiple Weapon Cars whose JSON slot ids
// would otherwise collide.

import type { ModuleData, QualifiedSlotId } from './types';

export interface AttachmentRecord {
  qualifiedSlotId: QualifiedSlotId;
  module: ModuleData;
}

export class AttachmentTracker {
  private readonly attachments = new Map<QualifiedSlotId, ModuleData>();

  attach(qualifiedSlotId: QualifiedSlotId, module: ModuleData): void {
    if (this.attachments.has(qualifiedSlotId)) {
      throw new Error(`AttachmentTracker: slot ${qualifiedSlotId} already occupied`);
    }
    this.attachments.set(qualifiedSlotId, module);
  }

  detach(qualifiedSlotId: QualifiedSlotId): ModuleData | undefined {
    const m = this.attachments.get(qualifiedSlotId);
    if (m) this.attachments.delete(qualifiedSlotId);
    return m;
  }

  getAttached(qualifiedSlotId: QualifiedSlotId): ModuleData | undefined {
    return this.attachments.get(qualifiedSlotId);
  }

  isOccupied(qualifiedSlotId: QualifiedSlotId): boolean {
    return this.attachments.has(qualifiedSlotId);
  }

  list(): AttachmentRecord[] {
    return Array.from(this.attachments.entries(), ([qualifiedSlotId, module]) => ({
      qualifiedSlotId,
      module,
    }));
  }

  get size(): number {
    return this.attachments.size;
  }

  clear(): void {
    this.attachments.clear();
  }
}
