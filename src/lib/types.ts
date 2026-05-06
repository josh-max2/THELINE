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
