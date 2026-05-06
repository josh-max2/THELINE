# ADR-001: Vertical-Slice Design Gaps

> Status: ACCEPTED — Gap 4 (train topology) resolved as Option A by human; gaps 1, 2, 3, 5, 6 owner-locked
> Date: 2026-05-05
> Authors: claude (acting as planner/Opus)
> Phase: 3 (vertical slice)
> DESIGN.md updated: yes (Section 4 layout rules + Section 15 pinned decision added)

## Context

DESIGN.md is the canonical design doc, but Phase 3 builds the first end-to-end loop and several decisions are underspecified. This ADR identifies the **top 5 gaps that will block code** in Phase 3 if not resolved up front. Each gap lists the issue, why it matters in code, options with tradeoffs, and a recommendation.

The build plan (Phase 3 Task 3.4) explicitly flags **ModuleAttachmentSystem as the most important task in Phase 3** — gap 1 below addresses it directly.

---

## Gap 1 — Module attachment slot architecture (BLOCKER for Task 3.4)

**Issue.** DESIGN §4 says cars have "module slots" with counts (Engine 2, Weapon 3, etc.) but no spec for slot *type*, *position*, or *fitting rules*. The build plan (Task 3.4) says "Define attachment slots on each Car: top, sides, belly, with explicit (x,y) offsets per car type" — leaving the schema to the builder. Without a spec, every module ships as a positioning hack.

**Why it matters in code.** ModuleAttachmentSystem needs to: (a) validate a module can fit a slot, (b) compute world-position of an attached module given the car's position, (c) render correctly across all 5 car types and 30 modules. Done wrong, every later module reveals a new edge case.

**Options.**
- **A. Generic numbered slots.** Each car has `slots: [0, 1, 2, ...]`; any module fits any slot. Simple, no validation overhead. Fails: visual coherence (a flamethrower in a "side" position looks wrong), no scaling.
- **B. Typed slots with fixed positions per car.** Slot types = `top` | `side-left` | `side-right` | `belly`. Each car JSON declares its slots: `[{ type: "top", x: 0, y: -32 }, ...]`. Modules declare `allowedSlots: ["top"]`. Strict, validates at attach-time, easy to reason about. Cost: more upfront schema work.
- **C. Generic positions, type tags as soft hints.** Position is free-form (x,y); module declares a preferred slot tag for UI grouping but can attach anywhere.

**Recommendation: B.** Typed slots with car-defined positions and module-declared compatibility. Reasons:
1. Matches the build plan's stated intent.
2. Catches errors at attach-time instead of at-render-time.
3. Slot positions as data → adding car #6 in v2 is one JSON entry.
4. Clear vocabulary for designers ("a top-slot module" is a real concept, not just `slot[1]`).

**Schema sketch:**
```json
// cars.json
{
  "engine": {
    "hp": 400,
    "powerGen": 10,
    "slots": [
      { "id": "top-1", "type": "top", "x": -8, "y": -36 },
      { "id": "top-2", "type": "top", "x": 12, "y": -36 }
    ]
  }
}

// modules.json
{
  "basic-cannon": {
    "category": "kinetic",
    "allowedSlots": ["top"],
    "render": { ... },
    "behavior": { "fireRate": 1.0, "damage": 10 }
  }
}
```

---

## Gap 2 — Train spatial layout & camera model (BLOCKER for Task 3.2/3.3)

**Issue.** DESIGN §1 says train "auto-traverses procedurally generated wastelands." Build plan Task 3.3 clarifies: "Train slowly auto-scrolls left-to-right (background moves, train stays visible)." These are different mental models. DESIGN never resolves it.

**Why it matters in code.** Determines: where the camera lives, what coordinates enemies spawn at, what "left side of screen" means for projectile math, what "the world" is. Every system after this depends on the answer.

**Options.**
- **A. Train moves through world.** Camera follows train. World coords = absolute. Enemy spawn coords = `train.x ± offscreenMargin`.
- **B. Train fixed on screen, world scrolls past it.** Camera = fixed at (640, 360). Train rendered at fixed screen position. World coords = train-relative. Background = parallax layers scrolling left at 50 px/sec.
- **C. Hybrid.** Train-relative coords for game logic, parallax for visuals.

**Recommendation: B with a left-anchored, single conceptual coordinate system.** The train is fixed in screen space — **Engine renders at left, around `x ≈ 200`** (per build plan Task 3.3) — and the train extends rightward toward `x ≈ 1080` as cars are added (1280px viewport). All world objects (enemies, projectiles, terrain effects) are stored in train-relative coordinates and the world scrolls past at constant `worldVelocity`. This means:
- "Forward" / "ahead of train" = +x relative to the rightmost car. Enemies oncoming spawn at large +x.
- "Behind" = −x relative to the engine. Enemies catching up spawn at large −x (rare in v1).
- "Above/below" = ±y from train center-y.
- Background parallax is purely visual, separate layer with its own scroll multiplier.
- Single `worldVelocity` constant (e.g. 50 px/sec) for v0 scroll speed.

This gives clean math for projectile lead-targeting and consistent enemy spawn logic, and matches the build plan's downstream prompts which assume "Engine at left side of the screen."

---

## Gap 3 — Visual primitive recipe for vector-geometric silhouettes

**Issue.** DESIGN §3/§13 commits to "vector-geometric, strong silhouettes" and bans pixel art. But there's no recipe for what this *means* in Phaser primitives (rect, circle, path, triangle). Without one, every car ends up as "a rectangle with a circle on top" because that's the path of least resistance.

**Why it matters in code.** Task 3.3 renders the Engine. Task 3.4 renders the cannon. Task 3.5 renders the Scout enemy. By Task 4.2 we render 10 modules. By Phase 5 we render 30. If each one is hand-authored with arbitrary primitives, visual cohesion is impossible.

**Options.**
- **A. Phaser.GameObjects.Graphics drawn from a JSON recipe.** Each visual entity declares `shapes: [{ type: "rect", x, y, w, h, fill }, { type: "tri", points: [...] }, ...]`. Rendered by a single `renderShape(graphics, recipe)` helper.
- **B. One Container subclass per entity.** Hand-coded primitives per car/module. Faster for 5 entities, doesn't scale to 30+.
- **C. SVG path strings parsed at runtime.** Maximum flexibility, hardest to author/maintain by hand.

**Recommendation: A.** JSON recipe. Matches CLAUDE.md hard rule "data over code." Adding a module = one JSON row. Visual cohesion enforced by sharing primitive types across entities.

**Schema sketch:**
```json
// in modules.json or cars.json
"render": {
  "fill": "#3a7bd5",
  "stroke": "#0c2858",
  "shapes": [
    { "type": "rect",   "x": -32, "y": -16, "w": 64, "h": 32 },
    { "type": "circle", "x": -16, "y": -20, "r": 6 },
    { "type": "tri",    "points": [[-32,-16],[-40,-8],[-32,8]] }
  ]
}
```

A single helper `drawRecipe(graphics, recipe)` handles all rendering. Reusable across cars, modules, enemies.

---

## Gap 4 — Train layout rules (car ordering, constraints)

**Issue.** DESIGN §4 lists 5 car types but doesn't define: which car goes where, can players reorder, must Engine be at one end, can there be multiple Engines, what's the default starting layout. Build plan Task 4.1 implies the default is `[Engine, Weapon, Armor, Crew, Cargo]` — but says nothing about constraints.

**Why it matters in code.** TrainSystem (Task 3.3) needs to know what data structure represents the train (ordered array? graph? slotted positions?). If we pick "ordered array" now and later need a graph, every reference is rewritten.

**Options.**
- **A. Ordered array, leftmost is Engine.** Simple. Power flows linearly. Visual layout is a flat row. Locks us in but matches the build plan.
- **B. Slot-positioned graph.** Cars have neighbor relationships, can attach in 2D. Future-flexible. Overkill for v1's flat side-scroller.
- **C. Ordered array with explicit constraints (Engine leftmost, Cargo rightmost, max one Engine in v1).**

**Recommendation: C.** Ordered array. Explicit v1 constraints:
- Train = ordered array of Car objects, indexed left-to-right.
- Index 0 (leftmost) is always an Engine. Engine cannot be moved or removed in v1.
- Exactly one Engine in v1.
- Cargo, if present, defaults to rightmost but can be anywhere.
- Other cars (Weapon/Armor/Crew) in any order between Engine and Cargo.
- Train length: 1–8 cars in v1.
- Reordering happens in Hub's Engineering Bay (Phase 4 Task 4.9), not mid-run.

This locks down enough to build without painting us into a corner. v2 can relax (multi-engine, different topologies).

---

## Gap 6 — Module behavior interface (BLOCKER for Task 3.4 / 3.5)

**Issue.** Gap 1 covers slot positioning and Gap 3 covers visual rendering, but neither addresses *how a module actually does its job*. Task 3.4 says basic-cannon "auto-fires every 1 second." Task 3.5 expands to "auto-fires at the nearest scout." How does a JSON entry get to runtime fire logic? Without a clear interface, we'll bolt behavior onto each module ad-hoc.

**Why it matters in code.** ModuleAttachmentSystem.update() must drive every attached module's behavior each frame. With 30 modules across 6 categories, the dispatch model is the second-most-important architecture decision in Phase 3 (after slot positioning).

**Options.**
- **A. Tagged behavior in JSON.** `behavior: { kind: "auto-fire", fireRate: 1.0, damage: 10, projectile: "kinetic-bolt" }`. A `ModuleBehaviorRegistry` maps `kind` strings to handler classes (`AutoFireBehavior`, `BeamBehavior`, `ShieldBehavior`, etc.). JSON is self-contained data; behavior types are code; adding a *new* behavior kind requires both (one new handler class + JSON entries that reference it).
- **B. Per-module code reference.** `behavior: "behaviors/auto-fire.ts"`. Most flexible per-module but creates a code-data hybrid that violates CLAUDE.md "data over code" rule.
- **C. Mega-switch in CombatSystem.** All module behavior implemented as a giant switch on category. Doesn't scale past ~10 modules.

**Recommendation: A.** Tagged behavior. Reasons:
1. Matches CLAUDE.md "data over code" — the *tuning* of a module (fireRate, damage) is data; the *kind* of thing it is (auto-fire vs. beam vs. shield-emitter) is code.
2. Behavior kinds are bounded — across 30 modules in v1 we expect ~6–8 distinct kinds (auto-fire, beam, shield, repair, AOE-pulse, terrain-effect, support-aura).
3. Registry pattern is straightforward to test in isolation.
4. New module = new JSON row; new *kind* of module = new handler class + JSON references.

**Schema sketch:**
```json
"basic-cannon": {
  "category": "kinetic",
  "allowedSlots": ["top"],
  "render": { "shapes": [...] },
  "behavior": {
    "kind": "auto-fire",
    "fireRate": 1.0,
    "damage": 10,
    "projectile": "kinetic-bolt",
    "targeting": "closest"
  }
}
```

```typescript
// ModuleBehaviorRegistry.ts
type BehaviorKind = "auto-fire" | "beam" | "shield" | "repair" | "aoe-pulse" | "support-aura" | "terrain-effect";
const registry = new Map<BehaviorKind, BehaviorHandler>();
```

---

## Gap 5 — Salvage economy v0 (per-kill rule + save schema)

**Issue.** DESIGN §10/§11 references "Salvage" as the meta currency for Hub purchases, idle income, prestige. But how is it earned during a run? Per-kill? Per-encounter? Per-run? Build plan Task 3.5 specifies "+1 to a Salvage counter" per scout kill, but DESIGN doesn't capture even this.

**Why it matters in code.** Save schema v1 (Task 3.6) commits a shape: `{ saveVersion: 1, totalSalvage, lastSaved }`. If the v1 shape is wrong, v2 migration is more painful. Need to know: what does Salvage represent at v1, and what shape will v2 need?

**Options.**
- **A. Per-kill only in v0; expand later.** v1 schema = `{ saveVersion: 1, totalSalvage, lastSaved }`. v2 adds run-completion bonus, cargo-survival bonus, etc. Each is a migration.
- **B. Eager schema with placeholder fields.** v1 schema includes `runStats: { totalKills, runsCompleted, ... }` even though v0 doesn't compute them yet. Avoids migrations but commits to a structure prematurely.
- **C. Versioned bonus categories.** v1 schema has `salvageByCategory: { kills: 0 }`; v2 adds `runCompletion`, etc. More flexible, slightly more upfront overhead.

**Recommendation: A.** Match the build plan exactly. Save versioning is sacred, but cleanly migrating from v1 to v2 with one field added is trivial — pre-baking placeholders we won't fill is YAGNI.

**v0 rule:** +1 Salvage per scout kill. Salvage persists across page reloads via localforage. Save shape `{ saveVersion: 1, totalSalvage: number, lastSaved: ISO string }`.

**v0+1 expansion (Phase 4):** Salvage also earned from completing encounters and surviving with cargo intact. Schema bumps to `saveVersion: 2`.

---

## Decisions

I'm deciding gaps 1, 2, 3, 5, 6 as owner — they're technical implementation choices with clear best answers given the constraints. Locking them in:

| # | Decision | Choice |
|---|---|---|
| 1 | Module slot model | Typed slots, car-defined positions, module-declared compatibility (option B) |
| 2 | Camera/coords | Left-anchored: Engine at `x ≈ 200`, train extends rightward; world scrolls past at `worldVelocity = 50 px/sec`; train-relative coords throughout |
| 3 | Visual style impl | JSON shape-recipe with `drawRecipe(graphics, recipe)` helper (option A) |
| 5 | Salvage v0 | Match build plan: `{ saveVersion: 1, totalSalvage, lastSaved }`; +1 per kill; expand in Phase 4 |
| 6 | Module behavior | Tagged behavior in JSON + `ModuleBehaviorRegistry` mapping `kind` strings to handler classes (option A) |

**Default conventions locked in (no decision tension, just stating):**
- Module orientation: all v1 modules face +x (forward); no per-slot rotation in v1.
- Test strategy: pure-logic systems (`CombatSystem.fire`, `ModuleAttachmentSystem.attach`, save migrations) get Vitest unit tests. Phaser render code does not — visual verification via Playwright screenshots only.

## Question for human (Josh)

**Gap 4 only — train layout rules.** I'm proposing v1 hard-locks the Engine to the leftmost slot, single Engine, immovable. This is technically the cleanest path, but it's also a *design philosophy* call: do you want THE LINE's identity to include "the Engine is the heart of the train, always leading," or do you want eventual flexibility (multi-engine builds, mid-train engines, train topology as a build axis)?

- **Lock it (my recommendation):** Engine = leftmost, single, immovable in v1. v2 may relax. Simpler, faster to ship, locks identity.
- **Keep flexibility:** Train is just an ordered array, no constraints beyond length. More work in Phase 3 (more validation paths, more UI edge cases) but more design space for Steam v2.

Tell me which way and I update DESIGN.md (with your sign-off) and proceed to Task 3.2.

---

## Out of scope (defer to later ADRs)

These are real gaps but don't block Phase 3:

- **Power model:** continuous flow vs. buffered pool. Phase 4 Task 4.3.
- **Crew slot semantics:** are 4 crew "in" the Crew Car or "owned" by the train? Phase 4 Task 4.4.
- **Death condition:** when does the train die? HP-zero on which car(s)? Engine-only? Cargo-loss? Phase 4 (no enemy damage yet in Phase 3).
- **Boss "Veil Hauler" attack patterns:** Phase 4 Task 4.6.
- **Hub state schema:** Phase 4 Task 4.10 (save v2).
- **Determinism scope:** which RNG calls go through the seeded source, which don't. Phase 5 when balance simulator matters.
- **Tech tree shape:** 5 branches × 5 tiers = 25 nodes. What unlocks what? Phase 5 Task 5.3.
