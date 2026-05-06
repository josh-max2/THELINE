// TechTreeSystem — owns the player's purchased-tech state, exposes a
// subscribe/notify pattern for UI panels, and persists changes via
// SaveSystem (Task 5.3). Keeps the validators in techTreeMath pure; this
// shell is the "Phaser/state shell" wrapper per CLAUDE.md.

import { activeUnlocks, canPurchase, type OwnedSet } from '../lib/techTreeMath';
import type { TechUnlockTag } from '../lib/types';
import { salvageStore } from '../lib/salvageStore';
import type { SaveSystem } from './SaveSystem';

type Listener = (owned: OwnedSet, unlocks: ReadonlySet<TechUnlockTag>) => void;

export class TechTreeSystem {
  private owned = new Set<string>();
  private readonly listeners = new Set<Listener>();
  private save?: SaveSystem;

  /** Hydrate from save data on init. */
  loadFromSave(purchasedIds: readonly string[]): void {
    this.owned = new Set(purchasedIds);
    this.notify();
  }

  /**
   * Wire SaveSystem so purchases write back. Cycle-broken via setter, same
   * pattern as MAS.bindItemSystem etc.
   */
  bindSaveSystem(save: SaveSystem): void {
    this.save = save;
  }

  has(id: string): boolean {
    return this.owned.has(id);
  }

  get ownedIds(): OwnedSet {
    return this.owned;
  }

  unlocks(): ReadonlySet<TechUnlockTag> {
    return activeUnlocks(this.owned);
  }

  /**
   * Attempt purchase. On success: deducts salvage, adds id, persists, notifies.
   * On failure: returns the validator reason and leaves state untouched.
   */
  purchase(nodeId: string): { ok: true } | { ok: false; reason: string } {
    const result = canPurchase(nodeId, this.owned, salvageStore.total);
    if (!result.ok) return result;

    const node = TECH_NODES_LOCAL.get(nodeId);
    if (!node) return { ok: false, reason: 'unknown-node' };

    // salvageStore.add early-returns on negative amounts; use setTotal to debit.
    salvageStore.setTotal(salvageStore.total - node.cost);
    this.owned.add(nodeId);
    if (this.save) {
      this.save.updateHubState({ purchasedTechIds: [...this.owned] });
      this.save.flushSave().catch(() => {
        // Save failures are non-fatal — purchase is still in-memory; next
        // auto-save tick will retry. Same downgrade pattern as SaveSystem.init.
      });
    }
    this.notify();
    return { ok: true };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.owned, this.unlocks());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const unlocks = this.unlocks();
    for (const fn of this.listeners) fn(this.owned, unlocks);
  }
}

// Local cost-lookup map populated from techTree.json on import; avoids re-walking
// the catalog on every purchase.
import { TECH_NODES } from '../lib/techTreeMath';
const TECH_NODES_LOCAL = new Map(Object.entries(TECH_NODES));
