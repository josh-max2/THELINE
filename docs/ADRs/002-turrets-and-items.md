# ADR-002: Module model — Turrets + Items (Binding of Isaac stacking)

> Status: ACCEPTED
> Date: 2026-05-05
> Authors: claude (PM), per design clarification from human (Josh)
> Phase: 3 (between Task 3.4 and Task 3.5)
> Supersedes: ADR-001 §Gap 6 implicit "every module is a complete weapon" model
> Affects: DESIGN §5, §6, §10, §15

## Context

ADR-001 §Gap 6 modeled all modules as self-contained weapons or support units. `behavior.kind` selected from a small enum (`auto-fire`, `beam`, `shield`, etc.) and the JSON entry tuned the kind. We shipped Task 3.4 with this model: `basic-cannon` is a complete kinetic weapon.

After Task 3.4 commit, the human clarified the intended fantasy is **closer to *Binding of Isaac* item stacking**:
- Turrets are the "Isaac character" — they shoot.
- Items are the "pickups" — they modify how Isaac shoots.
- Items physically stack on turrets, visible during a run, composing into emergent combinations.

This is a **design pivot, not a refinement**. It changes:
- The data model (one kind of module → two: Turret + Item)
- The discovery loop (modules-as-units → items-as-pickups, BoI-style)
- The visual identity (a turret evolves visibly across a run as items pile on)
- The synergy depth (single behavior dispatch → combinatorial item-stack composition)

## Decision

**Two-tier model:**

```
Car (slot)
  └─ Turret (occupies one slot — current ModuleData shape, renamed conceptually)
       └─ Item × N (stacks on the turret base, visible, modifies stats)
```

### Turret contract

Turrets keep the existing `ModuleData` shape from ADR-001 §Gap 6 and Task 3.4:
- `allowedSlots: SlotType[]`
- `render: RenderRecipe`
- `behavior.kind: BehaviorKind` — but the enum collapses to **archetypes** (~5 kinds in v1):
  - `auto-fire` — projectile turrets
  - `beam` — continuous-damage beams
  - `aoe-pulse` — periodic radial damage
  - `support-aura` — passive buffs to the train
  - `terrain-effect` — exotic, Veil-touched

Tuning data on the turret (base damage, base fire rate, etc.) becomes the **base** that items modify.

### Item contract (new)

```ts
interface ItemEffect {
  // Compose against turret stats: base ⊕ items.
  stat: 'damage' | 'fireRate' | 'projectileCount' | 'pierce' | 'range' | 'critChance' | ...
  op: 'add' | 'multiply' | 'set';
  value: number;
}

interface ItemData {
  id: string;
  name: string;
  category: 'damage' | 'projectile' | 'rate' | 'status' | 'synergy';
  appliesTo: BehaviorKind[];      // restrict which turret archetypes accept this item
  render: RenderRecipe;            // small silhouette, drawn stacked on turret
  effects: ItemEffect[];
  stackCap?: number;               // override default per-item cap (typical: 1, occasional: 3+)
}
```

### Composition

CombatSystem computes effective turret stats per frame:

```ts
effective(turret, items) =
  items.reduce((stats, item) =>
    item.effects.reduce(applyEffect, stats),
    turret.baseStats);
```

Per-frame composition keeps it simple — no caching needed at v1 scale (≤8 turrets × ≤3 items = 24 effects max).

### Visual stacking

Items render as silhouettes drawn after the turret's base recipe, offset upward in screen-space (or radially — see open question in DESIGN §14). Each item's recipe is positioned at `turret.x, turret.y + (stackIndex * stackOffset)`. The result is a recognizable BoI pile.

### Validation

Pure validators (consistent with ADR-001 §Gap 1 / §Gap 6 / Task 3.4 pattern):
- `canStackItem(turret, item, currentItems): { ok | reason }`
- Checks: stack cap not exceeded, `item.appliesTo` includes `turret.behavior.kind`, item not duplicated if `stackCap === 1`.

### Storage / lifecycle

- An `ItemStackTracker` (analogous to `AttachmentTracker` from Task 3.4) owns `Map<QualifiedSlotId, ItemData[]>`.
- On turret detach, all stacked items detach with it (run-scoped — items don't persist between runs).
- On item attach, ItemAttachmentSystem renders the new silhouette and CombatSystem invalidates any cached stat composition.

### Reward loop

Items drop from encounter completion (per ADR-001 §Gap 5 v0+1 expansion). Specific drop logic deferred to Phase 4. Run-scoped: collected during a run, lost on death; only Salvage persists (DESIGN §10).

## Implementation phasing

| Phase | Task | What |
|---|---|---|
| **3** (now) | 3.5 | CombatSystem fires turrets using **base stats only**. Items not implemented. Existing `basic-cannon` works as a single-archetype turret. |
| **3** | 3.6 | SaveSystem v1 (unchanged from build plan). |
| **4** | New 4.1.1 | `ItemData` types + `items.json` skeleton + `canStackItem` validator + `ItemStackTracker`. No runtime usage. |
| **4** | New 4.2.1 | `ItemAttachmentSystem` (Phaser-aware, renders stacked silhouettes). CombatSystem composes effective stats. |
| **4** | New 4.X | Loot drops on encounter completion. ~5 items implemented (e.g., damage-up, multi-shot, pierce, freeze, fire-rate). |
| **5** | Expansion | ~20 items, synergies, transformation triggers, rarity tiers. |

## Why not implement items in Phase 3?

1. **Phase 3 is the vertical slice.** Its purpose is "auto-fire at scouts → salvage counts up." Items would double surface area without changing whether the slice works.
2. **The architectural placeholder is fine.** ModuleAttachmentSystem already supports the turret model. Items are an additive layer on top — no rewrites needed.
3. **Risk reduction.** Ship CombatSystem v0 (Tasks 3.5/3.6), validate the basic loop empirically, *then* layer items. Failures are bounded.
4. **Build-plan alignment.** Phase 4's "10 modules" task naturally extends to "10 turrets + 5 items"; the architecture lets us slot items in cleanly.

## Implications for ADR-001

- **§Gap 1 (typed slots):** unchanged. Items don't occupy car slots — they stack on turrets. The slot validator is still correct.
- **§Gap 2 (camera/coords):** corrected separately (enemies spawn from −x/±y, never +x). See ADR-001 amendment.
- **§Gap 3 (visual recipe):** unchanged. Items use the same `RenderRecipe` + `drawRecipe()` pipeline.
- **§Gap 6 (behavior registry):** stays as-is for Task 3.4. In Phase 4, the registry stays — it dispatches turret archetypes — but the **per-handler behavior implementation** composes items into stats before firing.

## Open questions (logged in DESIGN §14)

- Stack visual direction: above turret, beside, or radial cluster?
- Item drop source: enemy kills only, encounter completion only, or both?
- Item rarity tiers in v1, or defer to v2?
- Forward-arc threats (v2 ambushes) — tease in v1 or pure v2?

## Out of scope

- Synergy graph and transformation triggers — Phase 5.
- Item rarity tiers and color coding — Phase 5+.
- Item permanence between runs (Hub stash that survives death) — likely v2 only; DESIGN §10 currently says items are run-scoped.
