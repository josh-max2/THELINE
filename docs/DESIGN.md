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

## 5. Modules

30 modules in v1, 6 categories (kinetic, fire, cryo, explosive, electric, support).
All defined in `src/data/modules.json`.
Rarity tiers: common / uncommon / rare / exotic.

- **Kinetic:** railgun, gatling, mortar — terrain destruction, no environmental effect
- **Fire:** flamethrower, plasma — burning patches (DOT)
- **Cryo:** freeze beam, ice mortar — slowing patches
- **Explosive:** missile, frag cannon — craters, AOE
- **Electric:** lightning, EMP — chains through enemies/terrain
- **Support:** shield emitter, repair drone bay, decoy launcher, target paint, healing aura, EMP pulse, magnetic coil, point-defense
- **Exotic:** time dilation, gravity well, monster pacifier, Veil siphon

## 6. Combat

Vampire Survivors enemy density. Auto-fire. Player configures targeting priorities, fires manually at terrain.
- Modules auto-target by priority (closest, highest threat, weakest, lowest HP %)
- Enemies spawn from all sides, ramping by distance
- Bullet-hell visual density with particles, beams, projectile clouds
- Snowball pacing: minute 1 sparse, minute 15 chaos, minute 25 screen-clearing fireworks

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
- **Engineering Bay** — bolt new modules, save blueprints
- **Crew Roster** — recruit new crew, see specialty stats
- **Tech Tree** — spend Salvage (meta currency) on permanent unlocks
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

## 15. Pinned decisions

- **Genre framing:** Active management roguelike with incremental progression. NOT pure idle.
- **Pause:** Slow-time (Bastion-style), not full pause. Hold spacebar → 25% time.
- **Crew:** Slot-based (4 slots), no individual avatars or pathing in v1.
- **Visual:** Vector-geometric. Commit. No pixel art for v1.
- **Save schema:** Versioned from commit one. Migrations sacred.
- **Determinism:** Every run seeded via `?seed=<n>` URL param.
- **Module data:** JSON, not code. Adding a module is adding a row.
- **Launch surface:** itch.io + r/incremental_games (with secondary on r/IndieDev, r/Vampire_Survivors, r/ftlgame).
- **v1 monetization:** None. Build the audience first.
- **v2 monetization:** Premium Steam at $5–7.

These can change — but only via human decision, not agent drift.
