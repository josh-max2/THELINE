import encountersDataRaw from '../data/encounters.json';
import type { EncounterKind, EncounterTemplate } from '../lib/types';
import { DEFAULT_SCHEDULE, slotAt } from '../lib/encounterPacing';
import type { EnemySpawner } from './EnemySpawner';
import type { EnvironmentSystem } from './EnvironmentSystem';

const ENCOUNTERS = encountersDataRaw as unknown as Record<EncounterKind, EncounterTemplate>;

/**
 * Cycles through a fixed schedule of encounters, applying each to the
 * EnemySpawner (pool + spawn interval) and triggering boss spawns.
 * Per DESIGN §9 + build plan Task 4.7.
 *
 * v0 ships the DEFAULT_SCHEDULE (travel/swarm/travel/mini-boss/travel/boss).
 */
export class EncounterSystem {
  private readonly spawner: EnemySpawner;
  private readonly schedule: ReadonlyArray<EncounterKind>;
  private slotIndex = -1;
  private timeRemaining = 0;
  private active?: EncounterTemplate;
  private environment?: EnvironmentSystem;
  private readonly listeners = new Set<(enc: EncounterTemplate, secLeft: number) => void>();

  constructor(spawner: EnemySpawner, schedule: ReadonlyArray<EncounterKind> = DEFAULT_SCHEDULE) {
    this.spawner = spawner;
    this.schedule = schedule;
  }

  /** Wire EnvironmentSystem so encounter advances change the biome tint. */
  bindEnvironmentSystem(environment: EnvironmentSystem): void {
    this.environment = environment;
  }

  /** Start the run at slot 0. */
  start(): void {
    this.slotIndex = -1;
    this.advance();
  }

  update(deltaSeconds: number): void {
    if (!this.active) return;
    this.timeRemaining = Math.max(0, this.timeRemaining - deltaSeconds);
    this.notify();
    if (this.timeRemaining <= 0) this.advance();
  }

  /** Read-only — used by HUD. */
  current(): { template: EncounterTemplate; remainingSec: number } | undefined {
    if (!this.active) return undefined;
    return { template: this.active, remainingSec: this.timeRemaining };
  }

  subscribe(
    listener: (encounter: EncounterTemplate, secLeft: number) => void,
  ): () => void {
    this.listeners.add(listener);
    if (this.active) listener(this.active, this.timeRemaining);
    return () => this.listeners.delete(listener);
  }

  private advance(): void {
    this.slotIndex += 1;
    const slot = slotAt(this.schedule, this.slotIndex);
    const template = ENCOUNTERS[slot.kind];
    if (!template) {
      throw new Error(`Unknown encounter kind: ${slot.kind}`);
    }
    this.active = template;
    this.timeRemaining = template.durationSec;

    // Apply to spawner: swap pool + interval.
    this.spawner.spawnIntervalSeconds = template.spawnIntervalSec;
    this.spawner.pool = new Map(Object.entries(template.pool));

    // Update biome tint if wired.
    if (template.biome && this.environment) {
      this.environment.setBiome(template.biome);
    }

    // One-shot spawns (e.g., boss).
    if (template.spawnAtStart) {
      for (const id of template.spawnAtStart) this.spawner.spawn(id);
    }

    this.notify();
  }

  private notify(): void {
    if (!this.active) return;
    for (const l of this.listeners) l(this.active, this.timeRemaining);
  }
}
