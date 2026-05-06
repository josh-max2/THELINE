import type { TrainSystem } from './TrainSystem';
import type { CrewMember } from '../lib/types';
import { DEFAULT_CREW } from '../lib/types';
import {
  fireRateMultiplier,
  enginePowerGenMultiplier,
  crewCountAt,
} from '../lib/crewMath';

/**
 * Manages crew members and their per-car assignments. Build plan Task 4.4.
 *
 * v0 model:
 *   - 4 crew members (DEFAULT_CREW), unique colors.
 *   - Each crew member is assigned to exactly one car index, or null.
 *   - Buffs:
 *     - Crew on Weapon Car → +50% fireRate (single flat buff)
 *     - Crew on Engine    → +10% powerGen per crew member
 *     - Crew on damaged car → +repair (deferred — Phase 4.X)
 *
 * Subscribe / notify pattern matches PowerSystem so the CrewPanel UI can
 * re-render when assignments change.
 */
export class CrewSystem {
  private readonly train: TrainSystem;
  /** crewId → carIndex (or null = unassigned). */
  private readonly assignments = new Map<number, number | null>();
  private readonly listeners = new Set<() => void>();

  constructor(train: TrainSystem, crew: ReadonlyArray<CrewMember> = DEFAULT_CREW) {
    this.train = train;
    for (const c of crew) this.assignments.set(c.id, null);
  }

  /** Default: all crew assigned to the Crew Car (per build plan). */
  initializeDefaults(): void {
    const crewCarIndex = this.findCarOfType('crew');
    if (crewCarIndex === undefined) return;
    for (const id of this.assignments.keys()) {
      this.assignments.set(id, crewCarIndex);
    }
    this.notify();
  }

  assign(crewId: number, carIndex: number | null): void {
    if (!this.assignments.has(crewId)) return;
    this.assignments.set(crewId, carIndex);
    this.notify();
  }

  /** carIndex → count of crew currently there. */
  crewCountAt(carIndex: number): number {
    return crewCountAt(this.assignments, carIndex);
  }

  /** Multiplier on fireRate for modules at the given car. */
  fireRateBoostAt(carIndex: number): number {
    const car = this.train.getCar(carIndex);
    if (!car) return 1;
    return fireRateMultiplier(car.type, this.crewCountAt(carIndex));
  }

  /** Multiplier on Engine powerGen — used by PowerSystem.generation(). */
  engineGenerationMultiplier(): number {
    const engineIndex = this.findCarOfType('engine');
    if (engineIndex === undefined) return 1;
    return enginePowerGenMultiplier(this.crewCountAt(engineIndex));
  }

  /** Read-only assignment snapshot — used by CrewPanel. */
  getAssignments(): ReadonlyMap<number, number | null> {
    return this.assignments;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private findCarOfType(type: string): number | undefined {
    for (let i = 0; i < this.train.length; i++) {
      const c = this.train.getCar(i);
      if (c && c.type === type) return i;
    }
    return undefined;
  }
}
