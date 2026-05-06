// Pure tech-tree validators + queries. No Phaser, no DOM.
// Per Task 5.3.
//
// Tier-prereq rule (v0): any tier-N node is purchasable once *any* tier-(N-1)
// node is owned. Tier 1 has no prereq. This is simpler than a per-node DAG and
// keeps the early game from gating on a single edge case; if v1 needs richer
// prereqs we extend `canPurchase` to read a `prereqs: string[]` field.

import techTreeRaw from '../data/techTree.json';
import type { TechNodeData, TechUnlockTag } from './types';

export const TECH_NODES = techTreeRaw as unknown as Record<string, TechNodeData>;

export type PurchaseResult =
  | { ok: true }
  | { ok: false; reason: 'already-owned' | 'insufficient-salvage' | 'prereqs-not-met' | 'unknown-node' };

/** Read-only view of the player's owned-tech set. */
export type OwnedSet = ReadonlySet<string>;

export function getNode(id: string): TechNodeData | undefined {
  return TECH_NODES[id];
}

export function allNodes(): TechNodeData[] {
  return Object.values(TECH_NODES);
}

/** Group nodes by tier — used by the panel to lay out lanes. */
export function nodesByTier(): Record<1 | 2 | 3, TechNodeData[]> {
  const out: Record<1 | 2 | 3, TechNodeData[]> = { 1: [], 2: [], 3: [] };
  for (const n of allNodes()) out[n.tier].push(n);
  return out;
}

/**
 * Tier prereq met if at least one node from every preceding tier is owned.
 * Tier 1 always passes.
 */
export function prereqsMet(node: TechNodeData, owned: OwnedSet): boolean {
  if (node.tier === 1) return true;
  const byTier = nodesByTier();
  for (let t = 1; t < node.tier; t++) {
    const tier = t as 1 | 2 | 3;
    const anyOwned = byTier[tier].some((n) => owned.has(n.id));
    if (!anyOwned) return false;
  }
  return true;
}

export function canPurchase(nodeId: string, owned: OwnedSet, salvage: number): PurchaseResult {
  const node = getNode(nodeId);
  if (!node) return { ok: false, reason: 'unknown-node' };
  if (owned.has(nodeId)) return { ok: false, reason: 'already-owned' };
  if (!prereqsMet(node, owned)) return { ok: false, reason: 'prereqs-not-met' };
  if (salvage < node.cost) return { ok: false, reason: 'insufficient-salvage' };
  return { ok: true };
}

/** All `grants` tags from owned nodes, flattened. */
export function activeUnlocks(owned: OwnedSet): Set<TechUnlockTag> {
  const out = new Set<TechUnlockTag>();
  for (const id of owned) {
    const node = getNode(id);
    if (!node) continue;
    for (const tag of node.grants) out.add(tag);
  }
  return out;
}
