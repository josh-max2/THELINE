import type { TrainSystem } from './TrainSystem';
import type { ModuleAttachmentSystem } from './ModuleAttachmentSystem';
import { computeAllocations, type PowerAllocation } from '../lib/powerMath';

/**
 * Coordinates train power generation, per-car allocation weights, and
 * efficiency lookup for behavior handlers. Build plan Task 4.3 + DESIGN §7.
 *
 * Cars eligible for allocation: any non-Engine, non-Cargo car (Engine
 * generates; Cargo holds rewards and has no modules per DESIGN §4).
 *
 * Player adjusts per-car weights via PowerPanel (DOM). Each frame, this
 * system derives generation (sum of car powerGens) and demand (sum of
 * each car's attached modules' `power` field) from the train + MAS.
 */
export class PowerSystem {
  private readonly train: TrainSystem;
  private readonly modules: ModuleAttachmentSystem;
  private readonly weights = new Map<number, number>();
  private readonly listeners = new Set<(allocations: ReadonlyArray<PowerAllocation>) => void>();
  private cachedAllocations: PowerAllocation[] = [];

  constructor(train: TrainSystem, modules: ModuleAttachmentSystem) {
    this.train = train;
    this.modules = modules;
  }

  /** Adjust car weight (0..MAX_POWER_WEIGHT). Triggers recompute + notify. */
  setWeight(carIndex: number, weight: number): void {
    const clamped = Math.max(0, Math.round(weight));
    this.weights.set(carIndex, clamped);
    this.recompute();
  }

  getWeight(carIndex: number): number {
    return this.weights.get(carIndex) ?? 0;
  }

  /**
   * Initialize default weights for all eligible cars.
   * Cargo has no module slots so no demand → excluded.
   * Engine *is* eligible — its modules consume from the shared pool, giving
   * the player a real allocation tradeoff between engine-mounted turrets and
   * the rest of the train.
   */
  initializeDefaults(): void {
    for (let i = 0; i < this.train.length; i++) {
      const car = this.train.getCar(i);
      if (!car) continue;
      if (car.type === 'cargo') continue;
      if (!this.weights.has(i)) this.weights.set(i, 5);
    }
    this.recompute();
  }

  /** Per-frame efficiency lookup for a car. Used by behavior handlers. */
  efficiencyAt(carIndex: number): number {
    const a = this.cachedAllocations.find((x) => x.carIndex === carIndex);
    return a ? a.efficiency : 1;
  }

  /** Read-only allocations snapshot — used by PowerPanel for rendering. */
  allocations(): ReadonlyArray<PowerAllocation> {
    return this.cachedAllocations;
  }

  /** Total power generation across the train (sum of car powerGens). */
  generation(): number {
    let gen = 0;
    for (let i = 0; i < this.train.length; i++) {
      const car = this.train.getCar(i);
      if (car?.data.powerGen) gen += car.data.powerGen;
    }
    return gen;
  }

  /**
   * Recompute demands by walking attached modules. Called once per frame
   * from update(); cheap at v0 scale (<= ~24 modules).
   */
  update(_deltaSeconds: number): void {
    this.recompute();
  }

  subscribe(listener: (allocations: ReadonlyArray<PowerAllocation>) => void): () => void {
    this.listeners.add(listener);
    listener(this.cachedAllocations); // immediate snapshot
    return () => this.listeners.delete(listener);
  }

  private recompute(): void {
    const demands = new Map<number, number>();
    for (const { qualifiedSlotId, module } of this.modules.attachments()) {
      const colon = qualifiedSlotId.indexOf(':');
      if (colon < 0) continue;
      const carIndex = Number(qualifiedSlotId.slice(0, colon));
      const power = (module.behavior['power'] as number | undefined) ?? 0;
      demands.set(carIndex, (demands.get(carIndex) ?? 0) + power);
    }

    this.cachedAllocations = computeAllocations({
      generation: this.generation(),
      weights: this.weights,
      demands,
    });
    for (const l of this.listeners) l(this.cachedAllocations);
  }
}
