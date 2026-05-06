// Behavior registry for modules.
// Per ADR-001 §Gap 6 — module behavior is selected by `behavior.kind` string.
// Each kind has a handler class registered here; the JSON tunes the kind.
//
// The BehaviorContext shape is the load-bearing decision: every handler in
// the codebase will receive it. Add to it (don't replace) as new systems
// come online (Task 3.5 will add CombatSystem, EnemySpawner refs, etc.).

import type Phaser from 'phaser';
import type { BehaviorKind, ModuleData, QualifiedSlotId } from './types';
import type { TrainSystem } from '../systems/TrainSystem';
import type { CombatSystem } from '../systems/CombatSystem';

/** Per-frame context passed to every active behavior. */
export interface BehaviorContext {
  scene: Phaser.Scene;
  train: TrainSystem;
  combat: CombatSystem;
  // Phase 4 will add EnemySpawner directly when item-modified targeting needs it.
}

/** A live attachment as the registry sees it. */
export interface AttachedModuleHandle {
  qualifiedSlotId: QualifiedSlotId;
  data: ModuleData;
  /** Mutable per-instance runtime state (cooldowns, charge, etc.). Handlers own this. */
  state: Record<string, unknown>;
}

export interface BehaviorHandler {
  /** Called once at attach. */
  init?(handle: AttachedModuleHandle, ctx: BehaviorContext): void;
  /** Called every frame for every attached module. */
  update(deltaSeconds: number, handle: AttachedModuleHandle, ctx: BehaviorContext): void;
  /** Called once at detach for cleanup. */
  destroy?(handle: AttachedModuleHandle, ctx: BehaviorContext): void;
}

class ModuleBehaviorRegistry {
  private readonly handlers = new Map<BehaviorKind, BehaviorHandler>();

  register(kind: BehaviorKind, handler: BehaviorHandler): void {
    this.handlers.set(kind, handler);
  }

  get(kind: BehaviorKind): BehaviorHandler | undefined {
    return this.handlers.get(kind);
  }

  has(kind: BehaviorKind): boolean {
    return this.handlers.has(kind);
  }
}

/** Singleton registry. Handlers register themselves at module-load. */
export const moduleBehaviors = new ModuleBehaviorRegistry();

// ─── Auto-fire (Task 3.5: wired into CombatSystem) ────────────────────────
//
// Per ADR-002: damage and fireRate are read from the turret's behavior data
// (base stats only in Phase 3). Phase 4 Task 4.2.1 will swap this read for a
// composed-stats lookup that folds attached items in.

interface AutoFireState {
  cooldownSeconds: number;
}

const autoFireHandler: BehaviorHandler = {
  init(handle) {
    handle.state['auto-fire'] = { cooldownSeconds: 0 } satisfies AutoFireState;
  },
  update(deltaSeconds, handle, ctx) {
    const s = handle.state['auto-fire'] as AutoFireState | undefined;
    if (!s) return;
    s.cooldownSeconds = Math.max(0, s.cooldownSeconds - deltaSeconds);

    if (s.cooldownSeconds > 0) return;

    // Resolve the turret's world position. The qualified slot id encodes
    // the carIndex; the slot id resolves on the car's slot list.
    const [carIndexStr, slotId] = handle.qualifiedSlotId.split(':');
    const carIndex = Number(carIndexStr);
    const car = ctx.train.getCar(carIndex);
    if (!car) return;
    const slot = car.data.slots.find((sl) => sl.id === slotId);
    if (!slot) return;

    const fireRate = (handle.data.behavior.fireRate as number | undefined) ?? 1.0;
    const damage = (handle.data.behavior.damage as number | undefined) ?? 1;

    const fired = ctx.combat.fireFrom(car.x + slot.x, car.y + slot.y, damage);
    if (fired) {
      s.cooldownSeconds = 1 / fireRate;
    }
    // If no target in range, leave cooldown at 0 so we'll fire as soon as one appears.
  },
};

moduleBehaviors.register('auto-fire', autoFireHandler);
