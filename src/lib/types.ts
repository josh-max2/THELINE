// Shared types. Pure TypeScript — no Phaser imports here.
// Anything that needs Phaser at runtime imports from a different module.

export type ShapeKind = 'rect' | 'circle' | 'tri';

export interface ShapeRecipe {
  kind: ShapeKind;
  // Per-shape positions are CAR-RELATIVE: origin = car center.
  x?: number;
  y?: number;
  // rect
  w?: number;
  h?: number;
  // circle
  r?: number;
  // tri (3 points)
  points?: [number, number][];
  // Optional per-shape overrides
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface RenderRecipe {
  fill: string;
  stroke: string;
  strokeWidth?: number;
  shapes: ShapeRecipe[];
}

export type CarType = 'engine' | 'weapon' | 'armor' | 'crew' | 'cargo';

export type SlotType = 'top' | 'side-left' | 'side-right' | 'belly';

export interface SlotDef {
  id: string;
  type: SlotType;
  x: number; // car-relative
  y: number; // car-relative
}

export interface CarData {
  type: CarType;
  name: string;
  hp: number;
  width: number; // world-space width (for layout spacing)
  height: number;
  slots: SlotDef[];
  render: RenderRecipe;
  /** Power generated per second. Engine has this in v1; v2 may add Reactor cars. */
  powerGen?: number;
  /** Number of crew slots this car physically holds. Crew Car has this in v1. */
  crewSlots?: number;
}

// ─── Crew (per Task 4.4 + DESIGN §7) ──────────────────────────────────────

export interface CrewMember {
  id: number;
  /** Color for the crew dot in the UI. */
  color: string;
}

/** v0 fixed roster — Phase 5 introduces named crew with specialties. */
export const DEFAULT_CREW: CrewMember[] = [
  { id: 0, color: '#e08040' },
  { id: 1, color: '#40a0e0' },
  { id: 2, color: '#80c060' },
  { id: 3, color: '#d8c040' },
];

export const CREW_FIRE_RATE_BUFF = 1.5; // ×1.5 if any crew on a Weapon Car (DESIGN §7).
export const CREW_ENGINE_POWER_BUFF_PER = 0.1; // +10% powerGen per crew on Engine.

// ─── Modules ───────────────────────────────────────────────────────────────

export type ModuleCategory =
  | 'kinetic'
  | 'fire'
  | 'cryo'
  | 'explosive'
  | 'electric'
  | 'support'
  | 'exotic';

/**
 * Per ADR-001 §Gap 6 — module behavior is data-tagged. The `kind` selects a
 * handler from ModuleBehaviorRegistry; remaining fields are kind-specific
 * tuning. Adding a new module = JSON entry. Adding a new *kind* of module =
 * one new handler class + JSON entries that reference its kind.
 */
export type BehaviorKind =
  | 'auto-fire'
  | 'beam'
  | 'shield'
  | 'repair'
  | 'aoe-pulse'
  | 'support-aura'
  | 'terrain-effect';

export interface ModuleBehaviorData {
  kind: BehaviorKind;
  // Kind-specific tuning. Handlers cast to their own concrete type.
  [key: string]: unknown;
}

export interface ModuleData {
  id: string;
  name: string;
  category: ModuleCategory;
  /** Per ADR-001 §Gap 1 — module declares which slot types it can occupy. */
  allowedSlots: SlotType[];
  render: RenderRecipe;
  behavior: ModuleBehaviorData;
  /** Per ADR-002 — max total items that can stack on this turret. Default 3 (v1). */
  maxStack?: number;
}

// ─── Items (per ADR-002) ───────────────────────────────────────────────────

/** Tunable runtime stats that items can modify on a turret. */
export type ItemStat =
  | 'damage'
  | 'fireRate'
  | 'projectileCount'
  | 'pierce'
  | 'range'
  | 'critChance';

/** How an item effect composes against the turret's existing stat value. */
export type ItemEffectOp = 'add' | 'multiply' | 'set';

export interface ItemEffect {
  stat: ItemStat;
  op: ItemEffectOp;
  value: number;
}

export type ItemCategory = 'damage' | 'projectile' | 'rate' | 'status' | 'synergy';

export interface ItemData {
  id: string;
  name: string;
  category: ItemCategory;
  /** Restrict which turret archetypes (behavior kinds) accept this item. */
  appliesTo: BehaviorKind[];
  /** Small silhouette drawn stacked on the turret base. */
  render: RenderRecipe;
  /** Stat modifiers composed against the turret's base stats per frame. */
  effects: ItemEffect[];
  /** Max copies of THIS item that can stack on a single turret. Default 1. */
  stackCap?: number;
}

/** Default v1 caps per ADR-002. */
export const DEFAULT_TURRET_MAX_STACK = 3;
export const DEFAULT_ITEM_STACK_CAP = 1;

/**
 * Qualified slot id — composite key `${carIndex}:${slotId}`.
 * Required because slot ids in JSON are car-relative and Phase 4 will allow
 * two Weapon Cars whose slot ids would otherwise collide.
 */
export type QualifiedSlotId = `${number}:${string}`;

export function qualifySlot(carIndex: number, slotId: string): QualifiedSlotId {
  return `${carIndex}:${slotId}`;
}

// ─── Enemies ───────────────────────────────────────────────────────────────

export interface EnemyData {
  id: string;
  name: string;
  hp: number;
  /** World units per second toward target. */
  speed: number;
  /** Damage dealt to train on contact (Phase 4 hooks it up). */
  damage: number;
  /** Approximate collision radius for projectile hit detection. */
  radius: number;
  render: RenderRecipe;
}
