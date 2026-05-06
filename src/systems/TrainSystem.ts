import Phaser from 'phaser';
import carsDataRaw from '../data/cars.json';
import type { CarData, CarType } from '../lib/types';
import { drawRecipe } from '../lib/drawRecipe';
import { computeCarPositions, TRAIN_ANCHOR_X, TRAIN_CENTER_Y, CAR_GAP } from '../lib/trainLayout';
import { canAddCar } from '../lib/trainValidators';

const CARS = carsDataRaw as Record<CarType, CarData>;

export interface PlacedCar {
  type: CarType;
  data: CarData;
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
}

/**
 * Manages an ordered array of cars. Per ADR-001 §Gap 4:
 *   - Engine occupies index 0; cars extend rightward.
 *   - Train length 1–8 in v1.
 *
 * The train is fixed in screen space (left-anchored). The world scrolls past
 * at worldVelocity (handled by ParallaxBackground + EnemySpawner in later tasks).
 */
export class TrainSystem {
  private readonly scene: Phaser.Scene;
  private readonly cars: PlacedCar[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addCar(type: CarType): PlacedCar {
    const data = CARS[type];
    if (!data) {
      throw new Error(`Unknown car type: ${type}`);
    }
    const validation = canAddCar(this.cars, type);
    if (!validation.ok) {
      throw new Error(validation.reason);
    }

    const footprints = [...this.cars.map((c) => ({ width: c.data.width })), { width: data.width }];
    const positions = computeCarPositions(footprints, TRAIN_ANCHOR_X, TRAIN_CENTER_Y, CAR_GAP);
    const pos = positions[positions.length - 1];

    const graphics = this.scene.add.graphics({ x: pos.x, y: pos.y });
    drawRecipe(graphics, data.render);

    const placed: PlacedCar = { type, data, graphics, x: pos.x, y: pos.y };
    this.cars.push(placed);
    return placed;
  }

  getCar(index: number): PlacedCar | undefined {
    return this.cars[index];
  }

  get length(): number {
    return this.cars.length;
  }

  /**
   * Train is fixed in screen space — no per-frame movement. This stub exists
   * so callers can drive a uniform `update(dt)` loop; future tasks (e.g., HP
   * effects, damage flashes) will hook in here.
   */
  update(_deltaSeconds: number): void {
    // Intentionally empty in v0.
  }
}
