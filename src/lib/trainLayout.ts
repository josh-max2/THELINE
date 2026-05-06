// Pure positioning math for the train. No Phaser imports — testable in any env.
// Per ADR-001 §Gap 2: train is left-anchored, Engine at TRAIN_ANCHOR_X.
// Per ADR-001 §Gap 4: Engine occupies index 0; cars extend rightward.

export const TRAIN_ANCHOR_X = 200;
export const TRAIN_CENTER_Y = 360;
export const CAR_GAP = 8;

export interface CarFootprint {
  width: number;
}

export interface CarPosition {
  x: number;
  y: number;
}

/**
 * Compute screen-space center positions for a sequence of cars.
 * Car at index 0 is anchored at TRAIN_ANCHOR_X.
 * Each subsequent car is placed to the right of its predecessor with CAR_GAP between edges.
 */
export function computeCarPositions(
  cars: CarFootprint[],
  anchorX: number = TRAIN_ANCHOR_X,
  centerY: number = TRAIN_CENTER_Y,
  gap: number = CAR_GAP,
): CarPosition[] {
  const positions: CarPosition[] = [];
  for (let i = 0; i < cars.length; i++) {
    if (i === 0) {
      positions.push({ x: anchorX, y: centerY });
      continue;
    }
    const prev = cars[i - 1];
    const prevPos = positions[i - 1];
    const here = cars[i];
    const x = prevPos.x + prev.width / 2 + gap + here.width / 2;
    positions.push({ x, y: centerY });
  }
  return positions;
}
