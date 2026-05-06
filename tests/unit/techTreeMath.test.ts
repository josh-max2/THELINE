import { describe, expect, test } from 'vitest';
import {
  TECH_NODES,
  activeUnlocks,
  allNodes,
  canPurchase,
  getNode,
  nodesByTier,
  prereqsMet,
} from '../../src/lib/techTreeMath';

describe('techTree.json catalog', () => {
  test('has at least 6 nodes spread across tiers 1/2/3', () => {
    const tiers = nodesByTier();
    expect(tiers[1].length).toBeGreaterThan(0);
    expect(tiers[2].length).toBeGreaterThan(0);
    expect(tiers[3].length).toBeGreaterThan(0);
    expect(allNodes().length).toBeGreaterThanOrEqual(6);
  });

  test('every node has required fields', () => {
    for (const [id, n] of Object.entries(TECH_NODES)) {
      expect(n.id, id).toBe(id);
      expect(n.name, id).toBeTruthy();
      expect([1, 2, 3]).toContain(n.tier);
      expect(n.cost, id).toBeGreaterThan(0);
      expect(n.description, id).toBeTruthy();
      expect(Array.isArray(n.grants), id).toBe(true);
      expect(n.grants.length, id).toBeGreaterThan(0);
    }
  });

  test('all node ids are unique', () => {
    const ids = allNodes().map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('costs are non-decreasing tier→tier (sanity heuristic, not hard rule)', () => {
    const tiers = nodesByTier();
    const minT1 = Math.min(...tiers[1].map((n) => n.cost));
    const minT2 = Math.min(...tiers[2].map((n) => n.cost));
    const minT3 = Math.min(...tiers[3].map((n) => n.cost));
    expect(minT2).toBeGreaterThanOrEqual(minT1);
    expect(minT3).toBeGreaterThanOrEqual(minT2);
  });
});

describe('prereqsMet', () => {
  test('tier 1 nodes always have prereqs met', () => {
    const anyT1 = nodesByTier()[1][0];
    expect(prereqsMet(anyT1, new Set())).toBe(true);
  });

  test('tier 2 nodes need at least one tier 1 owned', () => {
    const anyT2 = nodesByTier()[2][0];
    expect(prereqsMet(anyT2, new Set())).toBe(false);
    const anyT1 = nodesByTier()[1][0];
    expect(prereqsMet(anyT2, new Set([anyT1.id]))).toBe(true);
  });

  test('tier 3 nodes need at least one of every prior tier owned', () => {
    const anyT3 = nodesByTier()[3][0];
    const anyT1 = nodesByTier()[1][0];
    const anyT2 = nodesByTier()[2][0];
    expect(prereqsMet(anyT3, new Set())).toBe(false);
    expect(prereqsMet(anyT3, new Set([anyT1.id]))).toBe(false);
    expect(prereqsMet(anyT3, new Set([anyT2.id]))).toBe(false);
    expect(prereqsMet(anyT3, new Set([anyT1.id, anyT2.id]))).toBe(true);
  });
});

describe('canPurchase', () => {
  test('unknown node id', () => {
    expect(canPurchase('nope', new Set(), 100)).toEqual({ ok: false, reason: 'unknown-node' });
  });

  test('already owned', () => {
    const t1 = nodesByTier()[1][0];
    expect(canPurchase(t1.id, new Set([t1.id]), 100)).toEqual({
      ok: false,
      reason: 'already-owned',
    });
  });

  test('prereqs not met', () => {
    const t2 = nodesByTier()[2][0];
    expect(canPurchase(t2.id, new Set(), 100)).toEqual({ ok: false, reason: 'prereqs-not-met' });
  });

  test('insufficient salvage', () => {
    const t1 = nodesByTier()[1][0];
    expect(canPurchase(t1.id, new Set(), t1.cost - 1)).toEqual({
      ok: false,
      reason: 'insufficient-salvage',
    });
  });

  test('happy path: buy tier 1 with enough salvage', () => {
    const t1 = nodesByTier()[1][0];
    expect(canPurchase(t1.id, new Set(), t1.cost)).toEqual({ ok: true });
    expect(canPurchase(t1.id, new Set(), t1.cost + 99)).toEqual({ ok: true });
  });

  test('happy path: buy tier 2 once tier 1 owned + funded', () => {
    const t1 = nodesByTier()[1][0];
    const t2 = nodesByTier()[2][0];
    expect(canPurchase(t2.id, new Set([t1.id]), t2.cost)).toEqual({ ok: true });
  });
});

describe('activeUnlocks', () => {
  test('empty owned → empty tag set', () => {
    expect(activeUnlocks(new Set())).toEqual(new Set());
  });

  test('flattens grants from owned nodes', () => {
    const someNode = allNodes()[0];
    const tags = activeUnlocks(new Set([someNode.id]));
    for (const tag of someNode.grants) expect(tags.has(tag)).toBe(true);
  });

  test('skips unknown ids in owned set without throwing', () => {
    const tags = activeUnlocks(new Set(['nope', 'never']));
    expect(tags.size).toBe(0);
  });
});

describe('getNode', () => {
  test('returns the node when present', () => {
    const t1 = nodesByTier()[1][0];
    expect(getNode(t1.id)?.id).toBe(t1.id);
  });

  test('returns undefined when missing', () => {
    expect(getNode('nope')).toBeUndefined();
  });
});
