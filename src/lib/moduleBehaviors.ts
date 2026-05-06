// Behavior registry for modules.
// Per ADR-001 §Gap 6 — module behavior is selected by `behavior.kind` string.
// Each kind has a handler class registered here; the JSON tunes the kind.
//
// The BehaviorContext shape is the load-bearing decision: every handler in
// the codebase will receive it. Add to it (don't replace) as new systems
// come online (Task 3.5 will add CombatSystem, EnemySpawner refs, etc.).

// Type-only import: Phaser is only referenced as a type here; all runtime
// access goes through ctx.scene. A value import would pull Phaser's
// CanvasFeatures init into the test bundle and crash happy-dom (same bug we
// hit in Task 3.2). Advisor catch.
import type Phaser from 'phaser';
import type { BehaviorKind, ModuleData, QualifiedSlotId } from './types';
import type { TrainSystem } from '../systems/TrainSystem';
import type { CombatSystem } from '../systems/CombatSystem';
import type { ItemAttachmentSystem } from '../systems/ItemAttachmentSystem';
import type { PowerSystem } from '../systems/PowerSystem';
import type { CrewSystem } from '../systems/CrewSystem';
import type { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { composeStats, getNumStat, getStrStat, type EffectiveStats } from './composeStats';
import { categoryToDamageType } from './zoneMath';
import { GLOBAL_DAMAGE_BUFF_MULT, unlocksStore } from './unlocksStore';

/** Per-frame context passed to every active behavior. */
export interface BehaviorContext {
  scene: Phaser.Scene;
  train: TrainSystem;
  combat: CombatSystem;
  items: ItemAttachmentSystem;
  power: PowerSystem;
  crew: CrewSystem;
  environment: EnvironmentSystem;
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

// ─── Shared helpers ───────────────────────────────────────────────────────

/** Resolve the turret's world position from its qualified slot id. */
function turretWorldPos(
  handle: AttachedModuleHandle,
  ctx: BehaviorContext,
): { x: number; y: number } | undefined {
  const colon = handle.qualifiedSlotId.indexOf(':');
  if (colon < 0) return undefined;
  const carIndex = Number(handle.qualifiedSlotId.slice(0, colon));
  const slotId = handle.qualifiedSlotId.slice(colon + 1);
  const car = ctx.train.getCar(carIndex);
  if (!car) return undefined;
  const slot = car.data.slots.find((s) => s.id === slotId);
  if (!slot) return undefined;
  return { x: car.x + slot.x, y: car.y + slot.y };
}

/**
 * Compose effective stats for a turret in a defined order:
 *   1. base behavior data
 *   2. stacked items (Task 4.2.1)
 *   3. crew fire-rate buff (Task 4.4)
 *   4. power efficiency throttle (Task 4.3)
 * Order is multiplicative-commutative for our current ops, so the layering
 * is for readability rather than determinism.
 */
function effectiveStats(handle: AttachedModuleHandle, ctx: BehaviorContext): EffectiveStats {
  const stats = composeStats(handle.data.behavior, ctx.items.itemsAt(handle.qualifiedSlotId));
  const colon = handle.qualifiedSlotId.indexOf(':');
  if (colon < 0) return stats;
  const carIndex = Number(handle.qualifiedSlotId.slice(0, colon));

  // Crew buff applies to fireRate (DESIGN §7).
  const crewMult = ctx.crew.fireRateBoostAt(carIndex);
  if (crewMult !== 1 && typeof stats.fireRate === 'number') {
    stats.fireRate *= crewMult;
  }

  // Power efficiency throttles rate-style stats when supply < demand.
  const eff = ctx.power.efficiencyAt(carIndex);
  if (eff < 1) {
    if (typeof stats.fireRate === 'number') stats.fireRate *= eff;
    if (typeof stats.damagePerSecond === 'number') stats.damagePerSecond *= eff;
  }

  // Tech-tree global damage buff — Task 5.3 first runtime consumer.
  // Applies after power throttle so the buff multiplies the actual damage
  // the player sees, not a theoretical max.
  if (unlocksStore.has('global-damage-buff')) {
    if (typeof stats.damage === 'number') stats.damage *= GLOBAL_DAMAGE_BUFF_MULT;
    if (typeof stats.damagePerSecond === 'number') {
      stats.damagePerSecond *= GLOBAL_DAMAGE_BUFF_MULT;
    }
  }
  return stats;
}

function parseHexColor(hex: string): number {
  let s = hex.replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  return Number.parseInt(s, 16);
}

// ─── Auto-fire (kinetic projectile turrets) ───────────────────────────────

interface AutoFireState {
  cooldownSeconds: number;
}

// NOTE: `behavior.targeting` ("closest" | future strategies) is JSON-only data
// in v0; the handler always picks closest. Phase 4.X expands targeting modes
// (highest-threat, lowest-HP%) per DESIGN §3.2 and reads this field then.

const autoFireHandler: BehaviorHandler = {
  init(handle) {
    handle.state['auto-fire'] = { cooldownSeconds: 0 } satisfies AutoFireState;
  },
  update(deltaSeconds, handle, ctx) {
    const s = handle.state['auto-fire'] as AutoFireState | undefined;
    if (!s) return;
    s.cooldownSeconds = Math.max(0, s.cooldownSeconds - deltaSeconds);
    if (s.cooldownSeconds > 0) return;

    const pos = turretWorldPos(handle, ctx);
    if (!pos) return;

    const stats = effectiveStats(handle, ctx);
    const fireRate = getNumStat(stats, 'fireRate', 1.0);
    const damage = getNumStat(stats, 'damage', 1);

    const fired = ctx.combat.fireFrom(pos.x, pos.y, damage);
    if (fired) s.cooldownSeconds = 1 / fireRate;
    // If no target in range, leave cooldown at 0 so we'll fire as soon as one appears.
  },
};

moduleBehaviors.register('auto-fire', autoFireHandler);

// ─── Beam (continuous-damage line at nearest target in range) ─────────────

interface BeamState {
  lineGraphics?: Phaser.GameObjects.Graphics;
}

const beamHandler: BehaviorHandler = {
  init(handle) {
    handle.state['beam'] = {} as BeamState;
  },
  update(deltaSeconds, handle, ctx) {
    const s = handle.state['beam'] as BeamState | undefined;
    if (!s) return;

    const pos = turretWorldPos(handle, ctx);
    if (!pos) return;

    const stats = effectiveStats(handle, ctx);
    const range = getNumStat(stats, 'range', 200);
    const dps = getNumStat(stats, 'damagePerSecond', 5);
    const colorHex = getStrStat(stats, 'color', '#ff8040');

    const target = ctx.combat.findClosestEnemy(pos.x, pos.y, range);
    if (target) ctx.combat.damageEnemy(target, dps * deltaSeconds);

    if (!s.lineGraphics) {
      s.lineGraphics = ctx.scene.add.graphics();
      s.lineGraphics.setDepth(40);
    }
    s.lineGraphics.clear();
    if (target) {
      const color = parseHexColor(colorHex);
      s.lineGraphics.lineStyle(2, color, 0.85);
      s.lineGraphics.lineBetween(pos.x, pos.y, target.x, target.y);
      // Soft halo
      s.lineGraphics.lineStyle(5, color, 0.18);
      s.lineGraphics.lineBetween(pos.x, pos.y, target.x, target.y);
    }
  },
  destroy(handle) {
    const s = handle.state['beam'] as BeamState | undefined;
    s?.lineGraphics?.destroy();
  },
};

moduleBehaviors.register('beam', beamHandler);

// ─── AOE pulse (periodic radial blast at target location) ─────────────────

interface PulseState {
  cooldownSeconds: number;
}

const aoePulseHandler: BehaviorHandler = {
  init(handle) {
    handle.state['aoe-pulse'] = { cooldownSeconds: 0 } satisfies PulseState;
  },
  update(deltaSeconds, handle, ctx) {
    const s = handle.state['aoe-pulse'] as PulseState | undefined;
    if (!s) return;
    s.cooldownSeconds = Math.max(0, s.cooldownSeconds - deltaSeconds);
    if (s.cooldownSeconds > 0) return;

    const pos = turretWorldPos(handle, ctx);
    if (!pos) return;

    const stats = effectiveStats(handle, ctx);
    const fireRate = getNumStat(stats, 'fireRate', 0.5);
    const damage = getNumStat(stats, 'damage', 20);
    const radius = getNumStat(stats, 'radius', 80);
    const range = getNumStat(stats, 'range', 500);
    const colorHex = getStrStat(stats, 'color', '#ff6020');

    const target = ctx.combat.findClosestEnemy(pos.x, pos.y, range);
    if (!target) return;

    ctx.combat.firePulse(target.x, target.y, radius, damage, parseHexColor(colorHex));
    // Per Task 5.2: also spawn an environmental damage zone if the turret's
    // category maps to a weapon damage axis (kinetic/fire/cryo/explosive/electric).
    const dmgType = categoryToDamageType(handle.data.category);
    if (dmgType) {
      ctx.environment.spawnZone(target.x, target.y, dmgType);
    }
    s.cooldownSeconds = 1 / fireRate;
  },
};

moduleBehaviors.register('aoe-pulse', aoePulseHandler);

// ─── Support aura (passive aura around the turret) ────────────────────────
//
// v0: renders a pulsing range circle. The actual effect (shield damage
// reduction, repair-over-time) is a no-op here because cars don't take
// damage in Phase 3. Phase 4.X (boss/encounter system) will land car damage
// and this handler will gain `effect: 'shield' | 'repair'` dispatch.
//
// JSON fields `behavior.effect` and `behavior.magnitude` are placeholders
// in v0 — present in modules.json but unread until Phase 4.X.

interface AuraState {
  auraGraphics?: Phaser.GameObjects.Graphics;
  pulsePhase: number;
}

const supportAuraHandler: BehaviorHandler = {
  init(handle) {
    handle.state['support-aura'] = { pulsePhase: 0 } satisfies AuraState;
  },
  update(deltaSeconds, handle, ctx) {
    const s = handle.state['support-aura'] as AuraState | undefined;
    if (!s) return;
    s.pulsePhase = (s.pulsePhase + deltaSeconds) % 2;

    const pos = turretWorldPos(handle, ctx);
    if (!pos) return;

    const stats = effectiveStats(handle, ctx);
    const range = getNumStat(stats, 'range', 100);
    const colorHex = getStrStat(stats, 'color', '#a0d0ff');

    if (!s.auraGraphics) {
      s.auraGraphics = ctx.scene.add.graphics();
      s.auraGraphics.setDepth(20);
    }
    const alpha = 0.12 + 0.08 * Math.sin(s.pulsePhase * Math.PI);
    const color = parseHexColor(colorHex);
    s.auraGraphics.clear();
    s.auraGraphics.lineStyle(1, color, alpha + 0.15);
    s.auraGraphics.strokeCircle(pos.x, pos.y, range);
    s.auraGraphics.fillStyle(color, alpha * 0.3);
    s.auraGraphics.fillCircle(pos.x, pos.y, range);
  },
  destroy(handle) {
    const s = handle.state['support-aura'] as AuraState | undefined;
    s?.auraGraphics?.destroy();
  },
};

moduleBehaviors.register('support-aura', supportAuraHandler);
