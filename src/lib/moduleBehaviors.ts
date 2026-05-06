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

/** Per-frame context passed to every active behavior. */
export interface BehaviorContext {
  scene: Phaser.Scene;
  train: TrainSystem;
  // Phase 3 Task 3.5 will add: combat: CombatSystem; enemies: EnemySpawner.
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

// ─── Auto-fire (Task 3.4 stub; Task 3.5 will wire CombatSystem into ctx) ───

interface AutoFireState {
  cooldownSeconds: number;
}

const autoFireHandler: BehaviorHandler = {
  init(handle) {
    handle.state['auto-fire'] = { cooldownSeconds: 0 } satisfies AutoFireState;
  },
  update(deltaSeconds, handle, _ctx) {
    const s = handle.state['auto-fire'] as AutoFireState | undefined;
    if (!s) return;
    s.cooldownSeconds = Math.max(0, s.cooldownSeconds - deltaSeconds);
    // Task 3.5 will: when cooldown hits 0, fire via ctx.combat at nearest enemy
    // and reset cooldown to 1 / behavior.fireRate.
  },
};

moduleBehaviors.register('auto-fire', autoFireHandler);
