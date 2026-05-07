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

## 7. Skill layer (FTL-aligned, per 2026-05-06 design pivot)

The differentiator from pure idle. Direct FTL inspiration: real systems
the player allocates against in real-time, plus a crew layer that
sits on top.

- **Power distribution — FTL-style integer bars.** Engine ("Reactor") has
  a power ceiling (start 5 bars, upgradeable to 25). Each system (weapon
  car, shields, engines, sensors, doors) consumes integer bars. Player
  clicks +/- buttons (or arrow keys when system focused) to allocate.
  Damaged systems lose their top bars until repaired. Power distribution
  is the moment-to-moment skill expression. **(Replaces the v0 continuous
  slider UI.)**
- **Crew — FTL-style stations.** Crew start with 4 named members; recruit
  more via Hub. Each crew member can be assigned to ANY car/station.
  Stations grant per-tick XP gains in a station-specific skill — Pilot
  (Engine), Gunner (Weapon), Engineer (Engine, repair speed),
  Shield (Armor), Repair (any car under fire). Skills cap at level 3
  in v1. Higher skill = bigger bonus to that station's effect.
  **Crew can be wounded but not die in v1**; wounded crew operate at 50%
  effectiveness until healed. Death lands in v2 alongside hull breaches.
- **Crew assignment — drag and drop.** Crew tokens render on the car
  they're staffing. Click + drag to a different car. Reassignment takes
  ~1.5s of "moving" with no station bonus during transit (FTL-style
  movement penalty).
- **Slow-time pause.** Hold spacebar → time scale 0.25. NOT a full
  pause. Bastion-style. Useful for crew reassignment + power
  reallocation under pressure.
- **Active ability cooldowns.** Trigger emergency shields, EMP pulse,
  cloak, etc. on cooldown. v1 ships with 3 abilities; v2 expands.
- **Reactive event choices.** Rival train approaching? Storm ahead?
  Cargo damaged? FTL-style multi-choice events between encounters.

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

## 10. Roguelike + Hub (FTL-style upgrade flow)

**Run** = 15–25 min. 3–5 chained biomes (procedural). Random enemy
compositions. 1–2 boss encounters. Death = lose run rewards, keep
meta-progression.

**Starting loadout (FTL-style stripped opener):**

The player begins with the minimum viable train:

- 1× Engine (5 power bars max), 1× Weapon Car (1 turret slot)
- 1× basic-cannon turret pre-mounted, 0 items
- 4 unleveled crew (Pilot, Gunner, Engineer, generalist) — all level 0
- 0 Salvage in Hub, 0 tech-tree purchases

**Run-time upgrades** (within a single run, FTL-style "store" stops between
encounters):

- Buy turrets, items, crew, repair, ammo — all costs scale per biome
- Place purchases manually onto open car slots (Engineering Bay flow)
- Wounded crew heal between encounters at 1 hp/sec

**Meta-progression** (Hub, between runs):

- **Engineering Bay** — install/swap turrets, configure car-slot
  loadouts, save blueprints. **In-run purchases also flow through this
  UX** so the player learns the same flow.
- **Item Stash** *(post-run only)* — items found this run pile up in
  the run's stash visible on the train; on death, items are lost and
  only Salvage carries over.
- **Crew Roster** — recruit new crew, see XP + specialty stats.
- **Tech Tree** — spend Salvage (meta currency) on permanent unlocks:
  more cars, more turret slots, new turret categories (cryo, fire,
  explosive, electric), item drops, +10% global damage, idle income,
  auto-run, etc. **This is the main progression spine** — without
  Tech Tree purchases, the player is stuck with the basic-cannon
  starting loadout forever.
- **Reactor Upgrades** — hub-purchased increments to max power bars
  (1 per upgrade, capped at 25 in v1).
- **Hull Upgrades** — hub-purchased train HP, shield charge rate,
  repair speed.
- **Mission Board** — pick which Line to run next.
- **Lore Log** — Veil fragments accumulate.
- **Idle income** — passive Salvage based on highest completed run.
- **Auto-run mode** — set train to auto-repeat completed lines while
  away (Eternal Engine tech required).

## 11. Prestige

Every ~10 runs, completing a "Charter" (multi-run journey across a region) grants a high-tier reset, unlocking a new region with new modules, car types, and difficulty tier.

## 12. Monetization

- v1 (browser, free, itch.io): no monetization.
- v2 (Steam): premium $5–7 with 25–40 hours of content.

## 13. Anti-goals

- NOT real-time competitive multiplayer.
- NOT narrative-driven (lore is fragmentary).
- NOT mobile-first (browser desktop, mobile is bonus).
- NOT a deckbuilder, NOT a tower defense in the strict sense, NOT
  auto-battler in the team-comp sense.

(Removed the "NOT pixel art" line per the 2026-05-06 design pivot.
v0 ships vector; v1.x patch may incorporate sprites/illustrated assets
from CC0 packs (Kenney.nl etc.) once gameplay validates the loop.)

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

- **Genre framing:** Active management roguelike with incremental
  progression. NOT pure idle. **FTL-aligned skill layer + start-stripped
  upgrade-driven progression** (per 2026-05-06 design pivot).
- **Pause:** Slow-time (Bastion-style), not full pause. Hold spacebar
  → 25% time.
- **Crew:** Drag-and-drop between cars (FTL-style). Per-station XP +
  Pilot/Gunner/Engineer/Shield/Repair specialties, cap level 3 in v1.
  Wounded reduces effectiveness 50%; **crew don't die in v1** (death
  lands in v2 with hull breaches).
- **Power UI:** Integer bars per system (FTL-style click +/-). Reactor
  starts at 5, hub-upgradeable to 25. Damaged systems lose top bars.
  **(Replaces the v0 continuous-slider PowerPanel.)**
- **Starting loadout:** Stripped — 1 Engine + 1 Weapon Car + 1
  basic-cannon + 4 level-0 crew. All other turrets/cars/categories/items
  unlock via Tech Tree purchases. Players who haven't earned upgrades
  fight with the basics.
- **Train topology v1:** Ordered array. Engine leftmost & immovable.
  Single Engine. Cargo defaults rightmost. v2 may relax. (See ADR-001.)
- **Module model:** Two kinds — Turrets (slot-attached, fire) and Items
  (stack on turrets, modify traits). BoI-style item stacking.
  **v1 ships 30 turrets + ~20 items**, item-stack cap 3. (See ADR-002.)
- **Enemy spawn directions:** All directions EXCEPT forward (+x). Train
  is being chased. (See ADR-001 §Gap 2 + amendment, ADR-002.)
- **Visual:** Vector-geometric in v0 (commit, ship); v1.x patch may
  incorporate sprites/illustrated assets from CC0 packs (Kenney.nl etc.)
  once playtest feedback validates the gameplay loop.
- **Save schema:** Versioned from commit one. Migrations sacred. Currently v5.
- **Determinism:** Every run seeded via `?seed=<n>` URL param.
- **Module data:** JSON, not code. Adding a module is adding a row.
- **Launch surface:** itch.io + r/incremental_games (with secondary on
  r/IndieDev, r/Vampire_Survivors, r/ftlgame).
- **v1 monetization:** None. Build the audience first.
- **v2 monetization:** Premium Steam at $5–7.

These can change — but only via human decision, not agent drift.

---

## 16. Design pivot log (2026-05-06)

After Phase 5 closeout the player tested the build and surfaced a
fundamental gap: **the gameplay loop is mechanically sound but visually
and economically too generous**. v0 hands the player a fully-loaded
8-turret train at run start, which collapses the entire progression
hook (no climb from "starter" to "endgame"). The FTL inspiration in §1
was always there but had drifted out of the v0 implementation.

This pivot re-aligns the implementation with the genre framing:

1. **Strip the starting loadout** so the climb is real. New runs begin
   with 1 turret, 5 power bars, 4 unleveled crew, 0 tech.
2. **FTL-ify the power UI** — integer bars, click +/- to allocate,
   damaged systems lose top bars. The continuous slider was UX-fast
   but didn't read as a "system" the player wields.
3. **FTL-ify crew** — drag/drop between cars, per-station XP,
   specialties (Pilot/Gunner/Engineer/Shield/Repair). Crew don't die
   in v1 but they wound and operate degraded.
4. **In-run upgrade stops** — between encounters, FTL-style "store"
   nodes let the player buy turrets, items, crew, repair using
   in-run salvage. Engineering Bay UX is reused (placement flow).
5. **Visual pass deferred to v1.x** — gameplay refinement first, then
   curated CC0 sprite packs (Kenney.nl, OpenGameArt.org) wired into
   `drawRecipe`. Vector v0 ships first; sprites are a post-launch patch
   if traction warrants the asset work.

Rolling Phase 6 backlog reflects this — see PROGRESS.md "Next priorities".
