# DESIGN.md — THE LINE

> **This file is sacred.** Only humans modify it. Agents may NEVER edit autonomously.
> Propose changes via PROGRESS.md "Open questions for human" — the human decides.

## 1. Pitch

Side-scrolling combat train roguelike. FTL meets Vampire Survivors meets Binding of Isaac.
Player builds the train; the train fights itself; player manages power, crew, and abilities in real time.

## 2. Core loop

- **Second 1:** see your train, see incoming enemies, see HUD. The train auto-fires.
- **Minute 1:** first power-distribution decision. First module unlock.
- **Hour 1:** completed first run, seen Hub, saw first module purchase.
- **Day 7:** 5+ runs completed, first signature build emerging, first prestige.
- **Hour 30:** 10+ modules unlocked, multiple blueprints saved, regular auto-run going.

## 3. Visual & setting

Vector-geometric. Dieselpunk + cosmic horror. The Veil = corruption that twists reality.
Removal service framing: chartered train running cleanup ops through corrupted zones.

## 4. The train

5 car types (Engine, Weapon, Armor, Crew, Cargo).
v1: max train length 8 cars. v2: scales to 15.

| Car | Function | Module slots | HP |
|---|---|---|---|
| Engine | Propels train; central power source | 2 | High |
| Weapon Car | Holds offensive modules | 3 | Medium |
| Armor Car | Soaks damage; can hold defensive modules | 2 | Highest |
| Crew Car | Holds 4 crew slots (slot-based, no avatars) | 1 | Medium |
| Cargo Car | Holds run rewards; vulnerable | 0 | Low |

**v1 layout rules** *(per ADR-001)*:

- Train is an ordered array of cars, indexed left-to-right.
- Engine occupies index 0 (leftmost). Exactly one Engine in v1. Cannot be moved or removed.
- Cargo Car, if present, defaults to the rightmost position but is not constrained there.
- Weapon / Armor / Crew cars may appear in any order between Engine and Cargo.
- Train length: 1–8 cars in v1.
- Reordering happens in the Hub's Engineering Bay between runs, never mid-run.
- **v2 may relax** these rules: multi-engine builds, mid-train engines, alternative topologies, train-as-build-axis.

## 5. Modules — Turrets + Items (Binding of Isaac stacking)

The module system has **two kinds**:

**Turrets** occupy car slots and produce projectiles, beams, or area effects. Each turret has a damage type (kinetic, fire, cryo, explosive, electric) that interacts with the environmental matrix (§8). Defined in `src/data/modules.json`.

**Items** stack onto turrets and modify their traits — damage, fire rate, projectile count, pierce, status effects, etc. Items physically render as stacked silhouettes on the turret, BoI-style, so the player can see at a glance what mods their turret carries. Defined in `src/data/items.json`.

```
Car (slot) → Turret → Item × N (stacks on turret base, visible)
```

**v1 ships ~10 turrets + ~20 items.** Effective stats are composed each frame as `base ⊕ all-attached-items`. Items declare `appliesTo: TurretArchetype[]` so a "spread shot" item only fits projectile turrets, etc.

**Turret archetypes (behavior kinds):**
- **Auto-fire** — cannons, railguns, gatlings (kinetic + most damage types)
- **Beam** — flamethrower, freeze beam, lightning
- **AOE pulse** — mortars, missiles, EMP
- **Support aura** — shield emitter, repair drones, target paint, healing
- **Terrain-effect** — exotic Veil/cosmic-horror modules

**Item categories:**
- **Damage mods** — flat +damage, % multipliers, crit chance
- **Projectile mods** — multi-shot, pierce, homing, ricochet
- **Rate mods** — fire rate, charge time, cooldown reduction
- **Status mods** — burn, freeze, shock, mark
- **Synergy mods** — items that interact with environmental matrix or other items

**Stack cap:** 3 items per turret in v1 (tech-tree upgradeable to 5+).

**Item discovery:** Items drop from encounters (BoI-style). Tech tree unlocks new items into the loot pool. Items are run-scoped: collected during a run, lost on death; only Salvage (meta-currency) persists.

**Synergies (Phase 5):** Specific stacks transform turrets — e.g., burn + pierce + spread = "molten lance volley." Defined in `src/data/synergies.json`.

**v2 expansion:** ~80 items, formal transformation triggers ("3 of one stat-type item → unique effect"), rarity tiers, Veil-corrupted item variants.

## 6. Combat

Vampire Survivors enemy density. Auto-fire. Player configures targeting priorities, fires manually at terrain.

- Turrets auto-target by priority (closest, highest threat, weakest, lowest HP %).
- **Enemies spawn from every direction EXCEPT forward** (the +x direction the train is heading toward). The fantasy is "being chased": threats catch up from behind (-x), drop in from above (-y), come up from below (+y). The forward arc is the only "safe" sector — and only because nothing's spawned there yet. (v2 may add forward threats: rival train ambushes, biome bosses staked along the line.)
- Spawn weights: ~50% rear, ~25% top, ~25% bottom in v1; tunable per encounter type.
- Bullet-hell visual density with particles, beams, projectile clouds.
- Snowball pacing: minute 1 sparse, minute 15 chaos, minute 25 screen-clearing fireworks.

## 7. Skill layer

The differentiator from pure idle:

- **Power distribution** (real-time). Engine generates X power/sec. Allocate between weapon cars, shields, repair drones, sensors.
- **Crew slot assignment** (4 slots, no avatars). Drag-drop between cars. Crew on weapon car: +50% fire rate. Crew on damaged car: passive repair. Crew can't die in v1.
- **Slow-time pause.** Hold spacebar → time scale 0.25. NOT a full pause. Bastion-style.
- **Active ability cooldowns.** Trigger emergency shields, EMP pulse, etc. on cooldown.
- **Reactive event choices.** Rival train approaching? Storm ahead? Cargo damaged?

## 8. Environmental matrix (5×5 in v1)

| Weapon ↓ \ Terrain → | Solid Rock | Forest | Sand | Swamp | Snow |
|---|---|---|---|---|---|
| **Kinetic** | destroys terrain (movement+) | minor damage | dust cloud (concealment) | mud splash | snow scatter |
| **Fire** | minor heat | **WILDFIRE** (spreading AOE) | glass shrapnel (kinetic AOE) | fire suppressed | melts → water |
| **Cryo** | normal | normal | normal | freezes water (no chain electric) | **2× duration** |
| **Explosive** | destroys terrain (movement+) | tree shrapnel (AOE) | glass shrapnel (kinetic AOE) | mud blast (slow) | snow explosion |
| **Electric** | normal | normal | normal | **chains through wet terrain** | normal |

**Key emergent synergies:**
- Fire + forest = wildfire spreads, hits everything
- Electric + swamp = chain damage to all enemies in range
- Cryo + snow = double-duration slow zones
- Explosive in sand = glass shrapnel = bonus kinetic damage to nearby
- Fire in snow = water → conducts electric next attack

**v2 expansion:** 8 weapon × 8 terrain = 64-cell matrix.

## 9. Encounter grammar

50% travel / 25% swarm / 15% mini-boss / 10% boss.

| Encounter | Frequency per run | Feel |
|---|---|---|
| Travel | ~50% | Calm, low enemies, terrain focus, "shoot path open" |
| Swarm | ~25% | VS-style horde, snowball chaos |
| Mini-boss | ~15% | 2–4 elite enemies, demands target prioritization |
| Boss | ~10% (1–2/run) | Named threat, FTL-style phases, demands power management |

## 10. Roguelike + Hub

**Run** = 15–25 min. 3–5 chained biomes (procedural). Random enemy compositions. 1–2 boss encounters. Death = lose run rewards, keep meta-progression.

**The Hub** (between runs):
- **Engineering Bay** — install/swap turrets, configure car-slot loadouts, save blueprints
- **Item Stash** *(post-run only)* — items found this run pile up in the run's stash visible on the train; on death, items are lost and only Salvage carries over
- **Crew Roster** — recruit new crew, see specialty stats
- **Tech Tree** — spend Salvage (meta currency) on permanent unlocks: new turret types, new items in the loot pool, more car/turret slots, higher item-stack caps
- **Mission Board** — pick which Line to run next
- **Lore Log** — Veil fragments accumulate
- **Idle income** — passive Salvage based on highest completed run
- **Auto-run mode** — set train to auto-repeat completed lines while away

## 11. Prestige

Every ~10 runs, completing a "Charter" (multi-run journey across a region) grants a high-tier reset, unlocking a new region with new modules, car types, and difficulty tier.

## 12. Monetization

- v1 (browser, free, itch.io): no monetization.
- v2 (Steam): premium $5–7 with 25–40 hours of content.

## 13. Anti-goals

- NOT real-time competitive multiplayer.
- NOT narrative-driven (lore is fragmentary).
- NOT pixel art (v1).
- NOT mobile-first (browser desktop, mobile is bonus).
- NOT a deckbuilder, NOT a tower defense in the strict sense, NOT auto-battler in the team-comp sense.

## 14. Open questions

(Updated as design evolves. Do not let agents resolve these without human input.)

- [ ] Final target run length: 15 or 20 min?
- [ ] Crew specialties — passive boost or active ability per crew?
- [ ] Boss telegraph system — how do players learn boss patterns?
- [ ] Item stack visual direction: above the turret, beside it, or radial cluster?
- [ ] Item drop source: enemy kills, encounter completion, or both?
- [ ] Item rarity tiers in v1, or defer to v2?
- [ ] Forward-arc threats (v2 ambushes) — early-game tease vs. pure v2 expansion?

## 15. Pinned decisions

- **Genre framing:** Active management roguelike with incremental progression. NOT pure idle.
- **Pause:** Slow-time (Bastion-style), not full pause. Hold spacebar → 25% time.
- **Crew:** Slot-based (4 slots), no individual avatars or pathing in v1.
- **Train topology v1:** Ordered array. Engine leftmost & immovable. Single Engine. Cargo defaults rightmost. v2 may relax. (See ADR-001.)
- **Module model:** Two kinds — Turrets (slot-attached, fire) and Items (stack on turrets, modify traits). BoI-style item stacking. v1 ~10 turrets + ~20 items, item-stack cap 3. (See ADR-002.)
- **Enemy spawn directions:** All directions EXCEPT forward (+x). Train is being chased; spawn at rear/top/bottom only in v1. (See ADR-001 §Gap 2 + amendment, ADR-002.)
- **Visual:** Vector-geometric. Commit. No pixel art for v1.
- **Save schema:** Versioned from commit one. Migrations sacred.
- **Determinism:** Every run seeded via `?seed=<n>` URL param.
- **Module data:** JSON, not code. Adding a module is adding a row.
- **Launch surface:** itch.io + r/incremental_games (with secondary on r/IndieDev, r/Vampire_Survivors, r/ftlgame).
- **v1 monetization:** None. Build the audience first.
- **v2 monetization:** Premium Steam at $5–7.

These can change — but only via human decision, not agent drift.
