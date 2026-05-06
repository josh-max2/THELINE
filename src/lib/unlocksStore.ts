// Tiny singleton observable for "what tech tree unlocks are currently active".
// Both HubScene and RunScene hydrate this from save on enter; consumer code
// (moduleBehaviors.effectiveStats, RunScene HUD, etc.) reads it synchronously
// to apply tech-tree-driven effects. Mirrors the salvageStore pattern.

import { activeUnlocks } from './techTreeMath';
import type { TechUnlockTag } from './types';

type Listener = (tags: ReadonlySet<TechUnlockTag>) => void;

class UnlocksStore {
  private owned = new Set<string>();
  private tags = new Set<TechUnlockTag>();
  private readonly listeners = new Set<Listener>();

  /** Populate from save (purchasedTechIds) — recomputes derived tag set. */
  setOwned(ids: Iterable<string>): void {
    this.owned = new Set(ids);
    this.tags = activeUnlocks(this.owned);
    for (const l of this.listeners) l(this.tags);
  }

  has(tag: TechUnlockTag): boolean {
    return this.tags.has(tag);
  }

  get ownedIds(): ReadonlySet<string> {
    return this.owned;
  }

  get activeTags(): ReadonlySet<TechUnlockTag> {
    return this.tags;
  }

  reset(): void {
    this.owned = new Set();
    this.tags = new Set();
    for (const l of this.listeners) l(this.tags);
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
}

export const unlocksStore = new UnlocksStore();

/** Multiplier the global-damage-buff tag adds when owned. Source of truth for tests. */
export const GLOBAL_DAMAGE_BUFF_MULT = 1.1;
