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
}

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
}

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
