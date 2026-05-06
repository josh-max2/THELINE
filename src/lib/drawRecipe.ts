import Phaser from 'phaser';
import type { RenderRecipe } from './types';
import { parseColor } from './color';

/**
 * Render a JSON shape recipe into a Phaser.GameObjects.Graphics object.
 * Per ADR-001 §Gap 3: data-over-code — modules and cars declare shapes,
 * a single helper renders them all uniformly.
 *
 * Coordinates inside the recipe are LOCAL to the graphics object (which is
 * positioned at the entity's world position by the caller).
 */
export function drawRecipe(graphics: Phaser.GameObjects.Graphics, recipe: RenderRecipe): void {
  const defaultFill = parseColor(recipe.fill);
  const defaultStroke = parseColor(recipe.stroke);
  const defaultStrokeWidth = recipe.strokeWidth ?? 1;

  for (const shape of recipe.shapes) {
    const fillColor = shape.fill ? parseColor(shape.fill) : defaultFill;
    const strokeColor = shape.stroke ? parseColor(shape.stroke) : defaultStroke;
    const strokeWidth = shape.strokeWidth ?? defaultStrokeWidth;

    graphics.lineStyle(strokeWidth, strokeColor);
    graphics.fillStyle(fillColor);

    switch (shape.kind) {
      case 'rect': {
        const x = shape.x ?? 0;
        const y = shape.y ?? 0;
        const w = shape.w ?? 0;
        const h = shape.h ?? 0;
        graphics.fillRect(x, y, w, h);
        graphics.strokeRect(x, y, w, h);
        break;
      }
      case 'circle': {
        const cx = shape.x ?? 0;
        const cy = shape.y ?? 0;
        const r = shape.r ?? 0;
        graphics.fillCircle(cx, cy, r);
        graphics.strokeCircle(cx, cy, r);
        break;
      }
      case 'tri': {
        const pts = shape.points;
        if (!pts || pts.length !== 3) break;
        graphics.fillTriangle(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
        graphics.strokeTriangle(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
        break;
      }
    }
  }
}

