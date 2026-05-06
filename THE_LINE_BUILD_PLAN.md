# THE LINE — Master Build Plan

> The single reference document for designing, building, and iterating on THE LINE. Everything in this file is canonical until updated.

**Working title:** THE LINE
**Genre:** Active management roguelike with incremental progression
**Platform:** Browser (v1, free) → Steam (v2, premium)
**One-line pitch:** *FTL meets Vampire Survivors meets a side-scrolling combat train you build like a Binding of Isaac character.*

---

## Table of Contents

1. [TL;DR — what we're building](#1-tldr)
2. [The Game (concept synthesis)](#2-the-game)
3. [Mechanical pillars](#3-mechanical-pillars)
4. [Tech stack](#4-tech-stack)
5. [Programs and accounts to install/create](#5-installs)
6. [Project structure](#6-project-structure)
7. [CLAUDE.md — the agent instructions](#7-claude-md)
8. [DESIGN.md — the canonical design doc](#8-design-md)
9. [PROGRESS.md — the self-updating handoff doc](#9-progress-md)
10. [Subagent definitions (6 agents, with model routing)](#10-subagents)
11. [Build phases (Phase 0 → Phase 4)](#11-build-phases)
12. [Daily review workflow](#12-daily-review)
13. [Overnight iteration pattern](#13-overnight)
14. [Model routing strategy](#14-routing)
15. [Cost management](#15-cost)
16. [Risk register](#16-risks)
17. [Day 1 quick-start checklist](#17-quickstart)

---

<a name="1-tldr"></a>
## 1. TL;DR — what we're building

You operate a side-scrolling combat train that auto-traverses procedurally generated wastelands. Modules physically attach to specific cars (cannons, dishes, gardens, prison towers, exotic reactors) and are visible in the train's silhouette. Vampire Survivors-style swarms of monsters attack from all sides, with periodic mini-boss and boss encounters. You don't aim or fire — the train fights itself. Your active job is **management**: distribute power between cars, set tower-defense-style targeting modes per car, manually fire at terrain to clear the path faster, and manage cooldowns. Different weapon types create lingering environmental effects (fire patches, ice slows, craters, electric chains) that interact with terrain biomes (forest, swamp, snow). Roguelike runs across procedural lines. Persistent meta-progression at a Hub between runs. Auto-run mode satisfies the idle audience without compromising the skill ceiling for active players.

**Why this concept:**
- Genre intersection (incremental + auto-shooter + management) is unclaimed
- Train-as-build is screenshot-shareable (organic marketing)
- Modules + synergies are pure data — perfect for AI to scale content
- Browser-deliverable on Phaser; physics handled by Matter.js
- Active management gameplay has a larger Steam market than pure idle

**Realistic v1 timeline:** 8–10 weeks at 5–7 hrs/week. Browser, free, on itch.io. v2 → Steam at $5–7.

---

<a name="2-the-game"></a>
## 2. The Game — concept synthesis

### 2.1 The fantasy
**Hour 1:** A vulnerable train with one cannon, barely surviving the first run.
**Hour 5:** A railgun bolted to Car 3. Re-routed power to shields at the last second to survive a rival train ambush. Made a real decision; it mattered.
**Hour 30:** 11 cars, magnetic field generator pulling projectiles into flak modules, prison car converting kills to fuel. You designed this. You can describe it out loud and it sounds insane.
**Hour 100:** Five blueprints saved for different journey types. Auto-running while at work. Friends recognize your screenshots.

### 2.2 Setting — *the Veil*
The world is broken. Reality is unstable. The wilderness has been corrupted by something the trains call **the Veil**. You operate a removal service — a chartered train running scheduled lines through corrupted zones, fighting back what shouldn't exist anymore, recovering what can still be saved. Other crews run the same lines. Some have gone feral. Some have made deals with the Veil. They're hostile.

This framing justifies hostile environments AND hostile trains, allows infinite procedural content, and gives a lore rabbit hole for v2 expansion without locking us into "generic post-apoc."

### 2.3 Visual style commitment
**Vector-geometric with strong silhouettes.** Mark of the Ninja meets Mindustry meets dieselpunk. Modules composed from primitive shapes; strong color/silhouette to read at a glance. No drawn animations — modules are rigid attachments with particle/glow effects. No sprite sheets to commission. Adding module #50 has the same engineering cost as module #5.

If we ever want hand-drawn polish, that's a v2 decision. v1 ships geometric.

---

<a name="3-mechanical-pillars"></a>
## 3. Mechanical pillars

### 3.1 The train (cars + modules)

```
[ENGINE] [WEAPON] [ARMOR] [WEAPON] [CARGO]
   └────── auto-fire arcs above & below ──────┘
   └─── modules visible on top, sides, belly ──┘
```

**v1 car types (5):**

| Car | Function | Module slots | HP |
|---|---|---|---|
| Engine | Propels train; central power source | 2 | High |
| Weapon Car | Holds offensive modules | 3 | Medium |
| Armor Car | Soaks damage; can hold defensive modules | 2 | Highest |
| Crew Car | Holds 4 crew slots (slot-based, no avatars) | 1 | Medium |
| Cargo Car | Holds run rewards; vulnerable | 0 | Low |

**v2 additions** (post-Steam launch): Workshop Car, Lab Car, Garden Car, Prison Car, Bridge Car, Reactor Car, Spectral Car (Veil-touched, weird mechanics).

**Modules: v1 ships with 30 across 6 categories.**
- **Weapons (kinetic):** railgun, gatling, mortar — terrain destruction, no environmental effect
- **Weapons (fire):** flamethrower, plasma — burning patches (DOT)
- **Weapons (cryo):** freeze beam, ice mortar — slowing patches
- **Weapons (explosive):** missile, frag cannon — craters, AOE
- **Weapons (electric):** lightning, EMP — chains through enemies/terrain
- **Defensive/Support:** shield emitter, repair drone bay, decoy launcher, target paint, healing aura, EMP pulse, magnetic coil, point-defense
- **Exotic (rare):** time dilation, gravity well, monster pacifier, Veil siphon

**v2:** expand to ~80 modules with proper rarity tiers and synergy combinatorics.

### 3.2 Combat layer (Vampire Survivors)

While the train moves:
- Modules auto-target based on configurable priority (closest, highest threat, weakest, lowest HP %)
- Enemies spawn from all sides (above, below, ahead, behind), ramping by distance
- Bullet-hell visual density with particles, beams, projectile clouds
- Snowball pacing: minute 1 sparse, minute 15 chaos, minute 25 screen-clearing fireworks

**Player input in combat:**
- Configure targeting priority per car (set during pause)
- Manually fire at terrain ahead (movement boost, costs cooldown)
- Distribute power between cars in real time
- Trigger active abilities (e.g., emergency shields, EMP pulse) on cooldown

### 3.3 Skill layer (FTL-style management)

The differentiator from pure idle. Active during a run:

- **Power distribution.** Engine generates X power/sec. Allocate between weapon cars, shields, repair drones, sensors. Tradeoff matters.
- **Crew assignment.** 4 slot-based crew (no individual avatars). Drag-drop between cars. Crew on a weapon car: +50% fire rate. Crew on damaged car: passive repair. Crew can't die in v1; cars can be temporarily disabled.
- **Reactive events.** Rival train approaching → fight or boost speed to outrun? Storm ahead → raise shields or push through? Cargo car damaged → repair now or push to next station?
- **Slow-time pause.** Hold spacebar → time slows to 25%, decisions are still real-time but thinkable. NOT a full pause (that kills urgency). Bastion-style.

### 3.4 Environmental effects matrix (v1)

This is THE LINE's mechanical signature. Weapons leave lingering effects that interact with terrain biomes.

**v1: 5 weapon damage types × 5 terrain types = 25 cells.**

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

**v2 expansion:** 8 weapon × 8 terrain = 64-cell matrix. Add: acid, plasma, Veil corruption weapons. Add: industrial ruins, oil fields, salt flats, Veil zones.

### 3.5 Encounter grammar

A 20-minute run mixes encounter types so the player never adapts to one cadence:

| Encounter | Frequency per run | Feel |
|---|---|---|
| **Travel** | ~50% | Calm, low enemies, terrain focus, resource gathering, "shoot path open" |
| **Swarm** | ~25% | VS-style horde, snowball chaos, watch your build go off |
| **Mini-boss** | ~15% | 2–4 elite enemies, demands target prioritization |
| **Boss** | ~10% (1–2/run) | Named threat, FTL-style phases, demands power management |

### 3.6 Roguelike loop

**A Run** = a journey from Station A to Station B. 15–25 minutes.
- 3–5 chained biomes (procedural)
- Random enemy compositions
- Random encounter events (rival trains, anomalies, refugees, salvage)
- 1–2 boss encounters
- Death = lose run rewards, keep meta-progression

**The Hub** (between runs):
- **Engineering Bay** — bolt new modules, save blueprints
- **Crew Roster** — recruit new crew, see specialty stats
- **Tech Tree** — spend Salvage (meta currency) on permanent unlocks
- **Mission Board** — pick which Line to run next
- **Lore Log** — Veil fragments accumulate
- **Idle income** — passive Salvage based on highest completed run
- **Auto-run mode** — set train to auto-repeat completed lines while away

**Prestige loop:** every ~10 runs, completing a "Charter" (multi-run journey across a region) grants a high-tier reset, unlocking a new region with new modules, car types, and difficulty tier.

---

<a name="4-tech-stack"></a>
## 4. Tech stack

### 4.1 Confirmed choices

| Layer | Choice | Why |
|---|---|---|
| Engine | **Phaser 3.80+** | Pure code, no editor, browser-native, AI-perfect |
| Language | **TypeScript** | Type safety scales, AI handles it cleanly |
| Build | **Vite** | Sub-second hot reload |
| Physics | **Matter.js** (bundled with Phaser) | Real projectile arcs, deterministic |
| State | **Zustand** | Simple, no boilerplate, TS-native |
| Save | **localforage** (IndexedDB wrapper) | Async, robust, handles >5MB saves |
| Testing (unit) | **Vitest** | Fast, TS-native |
| Testing (E2E) | **Playwright + MCP** | Claude can play the game |
| Audio | **Phaser audio + Howler.js fallback** | Built-in works for v1 |
| UI overlay | **DOM + Tailwind CSS** | Hub UI is plain HTML, not Phaser |
| Asset gen | **ComfyUI** (you have this) | Local, controllable |
| SFX | **ElevenLabs SFX** | Quick generation, decent quality |
| Music | **Suno or Udio** | One license fee, ~5 tracks for v1 |
| Hosting | **itch.io** (v1) → **Steam** (v2) | Free → paid |
| CI | **GitHub Actions** | Free for public repos |

### 4.2 Architectural commitments

- **Single-file bundle** for v1 — Vite outputs one HTML + one JS + assets. Simpler deploy.
- **Determinism via seed** — every run is `?seed=<n>`, reproducible for bug reports and testing.
- **Save versioning from commit one** — `saveVersion: 1` in every save object, with explicit migration runners. Players will rage if a v1.1 update wipes their hub.
- **Module data is JSON, not code** — `src/data/modules.json` defines all 30 modules. Adding a module = adding a row. AI-friendly.
- **Encounters are JSON-defined** — `src/data/encounters.json`. Same logic.

---

<a name="5-installs"></a>
## 5. Programs and accounts to install/create

### 5.1 Already have (per memory)

- Windows 11
- Python (production-grade)
- Git
- Claude Max 20x subscription
- Anthropic API keys (with separate keys per project — keep doing this)
- ComfyUI
- VS Code (assumed)

### 5.2 Install

```bash
# Node.js LTS (required for Phaser/Vite/Claude Code)
# Download from https://nodejs.org — pick LTS v22.x
# Verify:
node --version  # should be v22.x.x
npm --version

# pnpm (faster than npm, better for monorepos if it grows)
npm install -g pnpm

# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Verify Claude Code
claude --version

# Login to Claude Code (uses your Max plan)
claude login
```

### 5.3 Add MCP servers to Claude Code

```bash
# Playwright — lets Claude play the game
claude mcp add playwright npx @playwright/mcp@latest

# Verify
claude mcp list  # should show playwright
```

### 5.4 Create accounts

| Account | Purpose | Cost |
|---|---|---|
| GitHub | Code hosting, CI, version control | Free |
| itch.io creator | v1 launch platform | Free |
| ElevenLabs | SFX generation | $5/mo Starter for v1 |
| Suno or Udio | Music | ~$10–25/mo for one month |
| Steam Direct (v2) | Eventual Steam launch | $100 one-time, deferred |

### 5.5 Optional but recommended

- **Audacity** (free) — minor audio editing
- **Aseprite** ($20) — only if you decide to add hand-drawn pixel art later. v1 doesn't need it.
- **Tiled** (free) — only if you do hand-authored levels. Procedural means you don't need it.

### 5.6 Skill packages (Claude Code skills)

```bash
# Inside your project after init:
# Frontend design — already at /mnt/skills/public/frontend-design/SKILL.md, auto-loaded
# No additional skills needed for v1
```

You can audit the skills your global config loads with:

```bash
# Open your global config
notepad C:\Users\joshs\.claude\CLAUDE.md
# (You mentioned this file already exists with two near-duplicate skill plugins —
#  remove the example-skills one if you haven't yet.)
```

---

<a name="6-project-structure"></a>
## 6. Project structure

```
the-line/
├── .claude/
│   ├── agents/                      # Subagent definitions (see Section 10)
│   │   ├── planner.md
│   │   ├── builder.md
│   │   ├── balancer.md
│   │   ├── qa-runner.md
│   │   ├── reviewer.md
│   │   └── archivist.md
│   ├── settings.json                # Hooks, permissions
│   └── worktrees/                   # Auto-created by Claude Code (gitignored)
├── src/
│   ├── main.ts                      # Entry point
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── HubScene.ts              # The between-run UI (DOM-heavy)
│   │   ├── RunScene.ts              # The actual game
│   │   └── DeathScene.ts
│   ├── systems/
│   │   ├── TrainSystem.ts           # Cars + module attachment
│   │   ├── CombatSystem.ts          # Auto-fire, targeting
│   │   ├── PowerSystem.ts           # FTL-style power distribution
│   │   ├── EnvironmentSystem.ts     # The matrix (Section 3.4)
│   │   ├── EncounterSystem.ts       # Travel/swarm/boss grammar
│   │   ├── SaveSystem.ts            # Versioned, localforage-backed
│   │   └── EconomySystem.ts         # Resources, costs, prestige
│   ├── data/
│   │   ├── modules.json             # All 30 modules
│   │   ├── cars.json                # 5 car types
│   │   ├── enemies.json             # Enemy archetypes
│   │   ├── encounters.json          # Encounter templates
│   │   ├── biomes.json              # Terrain types
│   │   └── synergies.json           # Module interactions
│   ├── ui/
│   │   ├── PowerPanel.tsx
│   │   ├── ModuleStore.tsx
│   │   └── ...
│   └── lib/
│       ├── seed.ts                  # Determinism
│       └── analytics.ts             # Optional, for v2
├── tests/
│   ├── unit/                        # Vitest
│   └── e2e/                         # Playwright
├── public/
│   └── assets/                      # Sprites, audio (most generated)
├── docs/
│   ├── DESIGN.md                    # Section 8 below
│   ├── PROGRESS.md                  # Section 9 below — self-updating
│   ├── REVIEW_NOTES.md              # Reviewer agent's notes
│   └── ADRs/                        # Architecture decisions
├── CLAUDE.md                        # Section 7 below
├── package.json
├── tsconfig.json
├── vite.config.ts
├── playwright.config.ts
├── .gitignore                       # MUST include .claude/worktrees/
└── README.md
```

---

<a name="7-claude-md"></a>
## 7. CLAUDE.md — agent instructions

Save this as `CLAUDE.md` at the repo root. It's read at every Claude Code session start.

```markdown
# Claude Operating Instructions for THE LINE

## Read at session start (in this order)

1. `docs/DESIGN.md` — the canonical design doc. NEVER contradict it without flagging.
2. `docs/PROGRESS.md` — current build state and next priorities.
3. `docs/REVIEW_NOTES.md` — open issues from the reviewer agent.

## Hard rules

1. **Never modify `docs/DESIGN.md` autonomously.** Propose changes in PROGRESS.md under "Open questions for human"; the human decides.
2. **All work happens in worktrees.** Never commit directly to `main`. Use `claude --worktree feat-<name>` or `isolation: worktree` in subagent calls.
3. **Tests must pass before commit.** Run `pnpm test` (Vitest) and `pnpm test:e2e` (Playwright) on changes. If they fail, fix or document and exit.
4. **Update `docs/PROGRESS.md` before ending any session.** Use the template in Section 9 of this file's parent (the build plan).
5. **Use the right model.** Routine code → Sonnet. Architectural decisions / complex algorithms / synergy combinatorics → Opus. Log parsing / batch data / simple text → Haiku.
6. **No browser storage APIs in artifacts.** localforage only.
7. **Save versioning is sacred.** Every save change requires a migration. No exceptions.
8. **Determinism via seed.** Every run reads `?seed=<n>`; every random call goes through the seeded RNG.

## Code style

- TypeScript strict mode. No `any`.
- One system per file. No god-systems.
- Data over code: prefer adding a row to `src/data/*.json` over adding a code path.
- Comment WHY, not WHAT.

## When stuck

If you can't proceed, write a clear `BLOCKED:` entry in `docs/PROGRESS.md` with:
- What you were trying to do
- What blocked you
- What you tried
- What you need from the human

Then exit cleanly. Do not guess.

## Test before claiming done

A task is "done" only after:
- [ ] Code compiles
- [ ] Vitest passes
- [ ] Playwright E2E for the affected feature passes
- [ ] PROGRESS.md updated
- [ ] If visual change: screenshot saved to `docs/screenshots/<date>-<feature>.png`
```

---

<a name="8-design-md"></a>
## 8. DESIGN.md — canonical design doc

Save as `docs/DESIGN.md`. This is the source of truth that every agent reads at session start. Update it manually only — never let agents modify it autonomously.

```markdown
# DESIGN.md — THE LINE

## 1. Pitch
Side-scrolling combat train roguelike. FTL meets Vampire Survivors meets Binding of Isaac.
Player builds the train; the train fights itself; player manages power, crew, and abilities in real time.

## 2. Core loop
- Second 1: see your train, see incoming enemies, see HUD. The train auto-fires.
- Minute 1: first power-distribution decision. First module unlock.
- Hour 1: completed first run, seen Hub, saw first module purchase.
- Day 7: 5+ runs completed, first signature build emerging, first prestige.
- Hour 30: 10+ modules unlocked, multiple blueprints saved, regular auto-run going.

## 3. Visual & setting
Vector-geometric. Dieselpunk + cosmic horror. The Veil = corruption that twists reality.
Removal service framing: chartered train running cleanup ops through corrupted zones.

## 4. The train
5 car types (Engine, Weapon, Armor, Crew, Cargo).
v1: max train length 8 cars. v2: scales to 15.

## 5. Modules
30 modules in v1, 6 categories (kinetic, fire, cryo, explosive, electric, support).
All defined in `src/data/modules.json`.
Rarity tiers: common / uncommon / rare / exotic.

## 6. Combat
Vampire Survivors enemy density. Auto-fire. Player configures targeting priorities, fires manually at terrain.

## 7. Skill layer
- Power distribution (real-time)
- Crew slot assignment (4 slots, no avatars)
- Slow-time pause (hold space → 25% time)
- Active ability cooldowns
- Reactive event choices

## 8. Environmental matrix
5×5 in v1, see Section 3.4 of build plan for the full table.

## 9. Encounter grammar
50% travel / 25% swarm / 15% mini-boss / 10% boss.

## 10. Roguelike + Hub
Run = 15–25 min. Hub has Engineering Bay, Crew Roster, Tech Tree, Mission Board, Lore Log.
Idle income passive based on highest completed run.
Auto-run mode for hands-off play.

## 11. Prestige
~Every 10 runs, complete a Charter for high-tier reset. New region unlocks.

## 12. Monetization
v1 (browser, free, itch.io): no monetization.
v2 (Steam): premium $5–7 with 25–40 hours of content.

## 13. Anti-goals
- NOT real-time competitive multiplayer.
- NOT narrative-driven (lore is fragmentary).
- NOT pixel art (v1).
- NOT mobile-first (browser desktop, mobile is bonus).
- NOT a deckbuilder, NOT a tower defense in the strict sense (no waves of paths), NOT auto-battler in the team-comp sense.

## 14. Open questions
(Updated as design evolves. Do not let agents resolve these without human input.)

- [ ] Final target run length: 15 or 20 min?
- [ ] Crew specialties — passive boost or active ability per crew?
- [ ] Boss telegraph system — how do players learn boss patterns?
```

---

<a name="9-progress-md"></a>
## 9. PROGRESS.md — the self-updating handoff doc

This is the file that makes overnight runs "smart." Every agent reads it at start, updates it at end. Save as `docs/PROGRESS.md`.

```markdown
# PROGRESS.md

> Last updated: <ISO date> by <agent name>
> Build phase: <0|1|2|3|4>
> v1 ETA: <date>

## Current build status

- Phase 0 setup: ✅
- Phase 1 vertical slice: 🚧 in progress (60%)
- Phase 2 core systems: ⏳ blocked on Phase 1
- Phase 3 content + polish: ⏳
- Phase 4 launch prep: ⏳

## Recent activity (last 5 sessions)

| Date | Agent | Branch | Summary | Tests |
|---|---|---|---|---|
| 2026-05-06 | builder | feat-targeting-priority | Implemented per-car targeting modes (closest, highest-threat, lowest-HP); UI dropdown. 312 LoC, 8 unit tests, 1 e2e test. | ✅ |
| 2026-05-05 | builder | feat-power-panel | Power distribution UI with drag handles; integrated PowerSystem | ✅ |
| 2026-05-04 | balancer | feat-difficulty-curve | Tuned enemy spawn rates for first 5 minutes; matches DESIGN target | ✅ |
| 2026-05-04 | qa-runner | (review) | E2E pass after power panel merge | ✅ |
| 2026-05-03 | builder | feat-crew-slots | 4-slot crew system, drag-drop, +50% fire rate buff | ✅ |

## Next priorities (queue, ordered)

1. **READY** — Implement environmental effect: Fire-on-Forest wildfire spread. Spec in DESIGN §3.4. (~3 hours, builder/Sonnet)
2. **READY** — Add second boss encounter type: "Veil Hauler" with phase transitions. Spec in encounters.json. (~5 hours, builder/Sonnet)
3. **READY** — Visual polish: particle trails on kinetic projectiles. (~2 hours, builder/Sonnet)
4. **NEEDS DESIGN** — Crew specialties: passive boost vs active ability? See DESIGN §14 open question. (planner/Opus, then builder)
5. **BLOCKED** — Save migration test: depends on save schema v3 finalization (planner/Opus)

## Open questions for human (Josh)

- Run length: 15 or 20 min? Currently 18 in code as compromise.
- Should boss encounters interrupt travel encounters or always be at biome transitions? Recommend transitions for predictability.

## Blockers

None currently.

## Performance metrics

- Total source: 4,200 LoC
- Test coverage: 71%
- Bundle size: 487 KB gzipped
- 60fps on Chrome desktop, 45–55fps on Firefox mobile
- Load time: 1.2s on broadband

## Screenshot log

Latest: `docs/screenshots/2026-05-06-targeting-priority.png`

## Cost ledger (rough, optional)

- Sonnet 4.6 tokens this week: ~2.1M in / 380K out → ~$12
- Opus 4.7 tokens this week: ~120K in / 45K out → ~$1.70
- Haiku 4.5 tokens this week: ~800K in / 30K out → ~$0.95
- Total: ~$14.65/week marginal API (rest covered by Max plan)
```

**Crucial rule:** every agent updates PROGRESS.md before ending its session. The "Recent activity" table grows; the "Next priorities" queue shrinks as things get done. The "Open questions for human" section is what Josh reads first thing each morning.

---

<a name="10-subagents"></a>
## 10. Subagent definitions (6 agents, with model routing)

Save each as `.claude/agents/<name>.md`. The frontmatter `model:` field controls routing.

### 10.1 `planner` (Opus 4.7, on-demand for big decisions)

```markdown
---
name: planner
description: "Use for architecture decisions, design reviews, complex algorithm design (synergy combinatorics, environmental matrix tuning, prestige math). Do NOT use for routine coding."
tools: Read, Glob, Grep
model: opus
---

You are the lead architect for THE LINE. You think carefully about systems-level decisions.

When invoked:
1. Read DESIGN.md, PROGRESS.md, and any relevant code.
2. Question assumptions. Find contradictions in the design.
3. Propose 1–3 options with explicit tradeoffs.
4. Recommend one with reasoning.
5. Output a structured decision record (date, context, options, recommendation, rationale).
6. Do NOT modify code. Do NOT modify DESIGN.md. Output advice only.

Produce dense, decision-oriented output. No filler. Show your reasoning explicitly.
```

### 10.2 `builder` (Sonnet 4.6, the workhorse)

```markdown
---
name: builder
description: "Default worker. Use for feature implementation, bug fixes, refactors, test writing. The bulk of all work."
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
isolation: worktree
---

You implement features for THE LINE.

Workflow:
1. Read CLAUDE.md, DESIGN.md, PROGRESS.md.
2. Pick the highest-priority READY task from PROGRESS.md, or the task you were assigned.
3. Create or use the appropriate worktree.
4. Implement with TypeScript strict mode. Data over code.
5. Write Vitest unit tests for the logic.
6. Run `pnpm test`. Fix failures.
7. Run `pnpm test:e2e` if the change is visible.
8. Update PROGRESS.md "Recent activity" table.
9. Update "Next priorities" — remove the completed task, surface any new follow-ups.
10. Commit on the worktree branch.

If blocked: write a BLOCKED entry in PROGRESS.md and exit.
Never modify DESIGN.md.
Never merge to main.
```

### 10.3 `balancer` (Sonnet 4.6, simulation + tuning)

```markdown
---
name: balancer
description: "Use for economy tuning, difficulty curves, balance simulations, headless playtest runs. Reads playtest data; tunes JSON in src/data/."
tools: Read, Write, Edit, Bash
model: sonnet
isolation: worktree
---

You tune the game's economy and difficulty.

Allowed modifications:
- src/data/modules.json (rebalance costs/effects)
- src/data/encounters.json (rebalance enemy density)
- src/data/synergies.json (rebalance multipliers)
- src/lib/curves.ts (cost curve constants)

NEVER modify game logic, only data and constants.

Workflow:
1. Read DESIGN.md §11 (prestige) and §3.6 (curves).
2. Run headless balance simulator: `pnpm sim:balance --runs 1000 --seed-range 1-1000`.
3. Analyze the JSON output: time-to-first-prestige distribution, hours-to-X-modules, etc.
4. Tune ONE variable at a time. Re-run the sim. Document the delta.
5. If the change improves alignment with DESIGN targets, commit.
6. Update PROGRESS.md with the simulation results in a table.
```

### 10.4 `qa-runner` (Sonnet 4.6, Playwright self-testing)

```markdown
---
name: qa-runner
description: "Run Playwright E2E suite, take screenshots, perform visual regression checks, write QA reports. Use after every meaningful change before merging."
tools: Read, Bash, Playwright
model: sonnet
---

You verify THE LINE works.

Workflow:
1. `pnpm dev` to start the local server.
2. Use Playwright MCP to navigate to localhost.
3. Run the full E2E suite: `pnpm test:e2e`.
4. For visual changes, take screenshots at fixed gameplay moments (defined in tests/e2e/screenshots.spec.ts).
5. Compare against baselines in docs/screenshots/baselines/.
6. Write a report to docs/QA_LATEST.md with:
   - Pass/fail summary
   - Failed test details (selector, expected, actual, console output)
   - Screenshot diffs (file paths)
   - Performance metrics if changed
7. Update PROGRESS.md "Recent activity" with the QA result.
```

### 10.5 `reviewer` (Opus 4.7, PR review)

```markdown
---
name: reviewer
description: "Read-only critic. Reviews PRs/branches against DESIGN.md before human review. Catches drift, scope creep, and design contradictions."
tools: Read, Glob, Grep
model: opus
---

You review code changes against the canonical design.

Workflow:
1. Given a branch or worktree, diff against main.
2. Read DESIGN.md and the relevant systems code.
3. Check for:
   - Design contradictions (does this PR violate DESIGN.md?)
   - Anti-goals violated (DESIGN §13)
   - Scope creep (features not on the priorities queue)
   - Missing tests
   - Save schema changes without migrations
   - Hard-coded values that should be in src/data/*.json
   - Type safety violations
4. Write findings to docs/REVIEW_NOTES.md as a dated section.
5. Categorize each finding: BLOCKER | NEEDS-CHANGE | NIT | OK-AS-IS.
6. Update PROGRESS.md to reflect any blockers found.

You NEVER modify code. You critique only.
```

### 10.6 `archivist` (Haiku 4.5, documentation/log analysis)

```markdown
---
name: archivist
description: "Maintains documentation. Updates PROGRESS.md from session logs, parses test outputs, generates summaries. Use for cheap, repetitive doc work."
tools: Read, Write, Edit
model: haiku
---

You maintain the project's documentation hygiene.

Workflow:
1. Read recent commits/session logs.
2. Generate or update:
   - PROGRESS.md "Recent activity" table (cleanup, format)
   - docs/CHANGELOG.md from commit messages
   - docs/SESSION_LOG.md (rolling 30-day session history)
3. Parse Playwright/Vitest output and summarize into PROGRESS.md metrics section.
4. Flag any session that wrote no commits but consumed >100K tokens (likely a stuck agent).
5. Never write feature code. Documentation only.
```

---

<a name="11-build-phases"></a>
## 11. Build phases

Each phase has: goal, deliverables, what to look at, success criteria.

### Phase 0 — Setup (Day 1, 4–6 hrs)

**Goal:** Working dev environment, scaffold, and agent infrastructure.

**Deliverables:**
- Repo created on GitHub
- Phaser+Vite+TS project scaffolded
- `CLAUDE.md`, `DESIGN.md`, `PROGRESS.md` populated from this build plan
- All 6 subagent files in `.claude/agents/`
- Playwright MCP wired up
- First commit pushed
- `pnpm dev` shows a "Hello THE LINE" canvas

**What to look at:**
- Open localhost in Chrome — see Phaser canvas? ✓
- `claude` CLI shows agents loaded? `/agents` should list 6.
- `.gitignore` includes `.claude/worktrees/`?

**Success criteria:** You can run `claude --worktree feat-test "make the canvas red"` and have it produce a working PR on a worktree branch with a passing test.

### Phase 1 — Vertical slice (Days 2–7, ~25 hrs)

**Goal:** End-to-end loop. Train auto-moves left to right, one weapon, one enemy type, basic UI.

**Deliverables:**
- TrainSystem: 3 cars rendered (Engine, Weapon, Armor)
- ModuleAttachmentSystem: one module type renders on a car (the key engineering)
- CombatSystem: auto-fire at one enemy type
- EnemySpawner: simple spawner from offscreen
- Camera + parallax background
- Resource counter (kills → "Salvage")
- Save/load Salvage between sessions
- One Vitest test per system
- One Playwright E2E: "train kills 10 enemies and Salvage > 0"

**What to look at:**
- Watch a 5-minute play session. Does it feel like the start of a game?
- Check: silhouette readable? Module visible? Resources counting?
- Run Playwright headed (`pnpm test:e2e --headed`) and watch Claude play.

**Success criteria:** A friend could load the URL, watch for 30 seconds, and describe what's happening accurately.

### Phase 2 — Core systems (Weeks 2–4, ~50 hrs)

**Goal:** All v1 systems present in basic form. 3 car types → 5. 1 module → 10. 1 enemy → 5. Boss → 1.

**Deliverables:**
- All 5 car types
- 10 modules (2 per category for v1 categories)
- PowerSystem (FTL-style distribution UI)
- Crew slot system (4 slots, drag-drop)
- Slow-time pause
- 5 enemy types + 1 boss
- Encounter grammar (travel/swarm/boss working)
- Environmental effects matrix v1 (3×3 cells, expandable)
- Run/Hub split: actual Hub UI between runs
- Save versioning (`saveVersion: 1`) with migration runner stub

**What to look at:**
- Daily 15-min play sessions. Note what feels good and what doesn't in `docs/PLAYTEST_NOTES.md`.
- The "Recent activity" table in PROGRESS.md should be growing.
- Reviewer agent's notes should be in REVIEW_NOTES.md.

**Success criteria:** A complete run is playable end-to-end, including death and Hub return. Synergy depth is visible: combining two modules produces a third behavior.

### Phase 3 — Content + polish (Weeks 5–7, ~50 hrs)

**Goal:** Full v1 content load + visual/audio polish.

**Deliverables:**
- 30 modules total
- Full 5×5 environmental effects matrix
- All encounter types (mini-boss + 2 boss variants)
- Tech Tree (5 branches × 5 tiers)
- Build sharing via URL parameter (encoded build state)
- Visual polish: particle trails, screen shake, hit-stop, screen-edge damage flash
- Audio: 30 SFX, 3 music tracks (combat, hub, tense)
- Tutorial / onboarding (first run guides player through key mechanics)
- Idle income at Hub
- Auto-run mode

**What to look at:**
- Send a build-share URL to a friend. Do they recognize the build?
- Run the auto-run mode for 30 minutes. Does it feel rewarding to come back to?
- Does the tutorial actually onboard, or do players bounce in 2 minutes?

**Success criteria:** You'd be willing to post this to r/incremental_games tomorrow and not be embarrassed.

### Phase 4 — Launch prep (Weeks 8–10, ~30 hrs)

**Goal:** Ship.

**Deliverables:**
- Bug fixes from playtest
- Final balance pass
- itch.io page (screenshots, gif, description, tags)
- 30-second trailer (use OBS to record gameplay)
- r/incremental_games launch post (drafted weeks ago, polished now)
- 3 friends playtested for at least 30 min each, feedback incorporated
- Save migration tested with multiple historical schemas
- Performance budget: stable 60fps on Chrome with 200+ enemies on screen
- Privacy/analytics: optional Plausible or self-hosted simple analytics

**What to look at:**
- Watch a stranger play (over Discord screen-share, ideally). Where do they get confused?
- Trailer: does the 5-second mark hook?

**Success criteria:** Public launch on itch.io. r/incremental_games post is up. Day-1 traffic is measurable. Day-7 retention is measurable.

---

<a name="12-daily-review"></a>
## 12. Daily review workflow

The pattern to make this sustainable at 5–7 hrs/week.

### Morning (10 min)

1. Open `docs/PROGRESS.md`. Read "Recent activity" — what happened overnight?
2. Read "Open questions for human" — anything blocking?
3. Read `docs/REVIEW_NOTES.md` — any BLOCKER findings from reviewer?
4. Decide: do I unblock anything, or let agents continue?

### Working session (1–2 hrs, 3–5x/week)

1. Open Claude Code in repo: `claude`
2. If picking up a task: `/agents` → invoke `builder` with the next priority.
3. If reviewing/critiquing: open the worktree branch in browser, play it, take notes.
4. If designing: invoke `planner` with the question. Take its decision record. Update DESIGN.md if appropriate (you, not the agent).

### Evening (5 min, before overnight run)

1. Look at PROGRESS.md "Next priorities". Are top 3 marked READY?
2. If not, mark them READY or move to NEEDS DESIGN.
3. Kick off overnight run (Section 13).

---

<a name="13-overnight"></a>
## 13. Overnight iteration pattern

This is the big leverage. Set up once; pays off every night.

### 13.1 The handoff loop

```
[Evening] Josh marks 2-3 tasks READY in PROGRESS.md
   ↓
[Overnight] Headless agent picks top READY task
   ↓
[Overnight] Agent creates worktree, implements, tests, commits
   ↓
[Overnight] Agent updates PROGRESS.md (Recent activity + remove from queue)
   ↓
[Overnight] Reviewer runs against the new branch, writes REVIEW_NOTES.md entry
   ↓
[Overnight] Archivist cleans up logs, updates session log
   ↓
[Morning] Josh reads PROGRESS.md → REVIEW_NOTES.md → decides
```

### 13.2 The script

Save as `scripts/overnight.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Safety: cap total wall-clock at 6 hours
TIMEOUT="6h"

# Switch to the API key with overnight budget cap (separate from your dev key)
export ANTHROPIC_API_KEY="$ANTHROPIC_OVERNIGHT_KEY"

# Run builder on next READY task
timeout "$TIMEOUT" claude \
  --headless \
  --max-cost-usd 50 \
  --task "Read docs/PROGRESS.md. Pick the highest-priority READY task. Implement it via the builder agent. Run tests. Update PROGRESS.md. Exit cleanly when done or blocked." \
  > logs/overnight-$(date +%Y%m%d).log 2>&1

# After builder, run reviewer on the new branch
timeout 30m claude \
  --headless \
  --max-cost-usd 10 \
  --task "Run the reviewer agent against the most recent worktree branch. Write findings to docs/REVIEW_NOTES.md." \
  >> logs/overnight-$(date +%Y%m%d).log 2>&1

# Archivist cleans up
timeout 10m claude \
  --headless \
  --task "Run the archivist agent to update docs/SESSION_LOG.md and tidy PROGRESS.md formatting." \
  >> logs/overnight-$(date +%Y%m%d).log 2>&1

echo "Overnight run complete: $(date)"
```

Run with: `bash scripts/overnight.sh` before bed. (On Windows: same script under WSL or Git Bash.)

### 13.3 Safety controls

- **Separate API key for overnight.** Set a hard $50/night cap via Anthropic Console. If something goes pathological at 3 AM, you're out $50 not $500.
- **`--max-cost-usd 50`** flag enforces it from Claude Code's side too.
- **6-hour wall clock timeout.** Even if cost is fine, stop after 6h.
- **Tests must pass before commit.** The builder agent's CLAUDE.md instructions enforce this.
- **All work on worktrees.** Main branch is sacred.
- **No auto-merge.** Branches stay open until you (Josh) merge them in the morning.

### 13.4 What "smart" means in this loop

Each overnight run is "smart" because it:
- Reads `DESIGN.md` (the constraint frame)
- Reads `PROGRESS.md` (what's been done, what's next)
- Reads `REVIEW_NOTES.md` (what's known broken or contested)
- Picks the highest-priority READY task — not a random one
- Updates PROGRESS.md with what it did → next agent inherits this state
- Flags blockers explicitly → next morning Josh has a clean priority list

The system gets smarter as PROGRESS.md accumulates history. By week 3, the "Recent activity" log + "Open questions" section is a living institutional memory.

---

<a name="14-routing"></a>
## 14. Model routing strategy

| Model | Role | When to use | Estimated % of tokens |
|---|---|---|---|
| **Opus 4.7** | Advisor (planner, reviewer) | Architecture decisions, design reviews, complex algorithms (synergy combinatorics, balancer math), PR review against DESIGN.md | 10–15% |
| **Sonnet 4.6** | Worker (builder, balancer, qa-runner) | Feature implementation, bug fixes, refactors, test writing, balance tuning, Playwright runs | 75–85% |
| **Haiku 4.5** | Background (archivist) | Doc maintenance, log parsing, batch JSON ops, simple summaries | 5–10% |

**Cost discipline:**
- Cache `DESIGN.md` and `CLAUDE.md` aggressively. They're read every session.
- Use the Batch API for balance simulations (`balancer` agent generating 1000-run sims overnight).
- Don't put everything on Opus. Sonnet 4.6 handles 90% of game dev coding cleanly.

**The "high effort" lever for Opus.** When invoking the planner agent for a hard problem, use ultra-thinking-level prompts:

```
> /agent planner ultrathink: We're seeing the prestige curve flatten at run 7.
  Read DESIGN.md §11 and balancer logs from this week. Propose three structural
  fixes with their pros/cons and recommend one. Show your reasoning.
```

This routes the question correctly and lets Opus do its real work.

---

<a name="15-cost"></a>
## 15. Cost management

| Cost line | Frequency | Estimate |
|---|---|---|
| Max 20x subscription (already paying) | Monthly | $200 (sunk) |
| Marginal API for parallel/overnight agents | Monthly during build | $50–250/mo |
| ElevenLabs SFX | One month | $5 |
| Suno music | One month | $10–25 |
| Domain (optional) | Annual | $12–20 |
| Asset pack (if not vector) | One-time | $30 |
| Steam Direct (v2 only) | One-time, deferred | $100 |
| **Total marginal cost over 10-week build** | | **$200–625** |

Set a hard cap on the overnight API key: `$1500` total budget for the 10-week build. If it gets close, slow down parallel agents.

---

<a name="16-risks"></a>
## 16. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Scope creep eats the 10-week timeline | High | Phase 4 cutoff is non-negotiable. Cut features, never extend timeline. |
| Module attachment system harder than expected | Medium | Spend Phase 1 on it specifically. If it takes 2 weeks instead of 1, accept and re-baseline. |
| Agents diverge from DESIGN.md over time | Medium | Reviewer agent (Opus) catches this; daily PROGRESS.md review by Josh catches the rest. |
| Overnight runs burn money on stuck loops | Medium | $50/night cap, 6h wall clock, BLOCKED entry pattern. |
| Visual style looks AI-generated / generic | Medium | Vector-geometric commitment. Buy one $30 reference pack if needed. |
| Save schema breaks on update | Critical | Migration runner from day 1. Schema versioning sacred. |
| r/incremental_games launch post flops | Low | Draft and refine for weeks. Have backup channels (Newgrounds, GameJolt, /r/IndieGaming). |
| Active management audience doesn't overlap with idle audience | Medium | Auto-run mode bridges them. Marketing leans active. |
| Burn out from 5–7 hrs/week pace | Medium | Take week 5 off if needed. Consistency > sprint. |

---

<a name="17-quickstart"></a>
## 17. Day 1 quick-start checklist

If you do this today (~4–6 hrs), Phase 0 is done.

```bash
# 1. Install Node.js v22 LTS — https://nodejs.org

# 2. Install Claude Code + pnpm
npm install -g @anthropic-ai/claude-code pnpm

# 3. Login to Claude Code
claude login

# 4. Create the project (pick your project root)
cd C:\Users\joshs\Desktop\datamaker
mkdir the-line && cd the-line
pnpm create vite . --template vanilla-ts
pnpm install
pnpm install phaser
pnpm install -D vitest @playwright/test
pnpm install zustand localforage

# 5. Add Playwright MCP to Claude Code
claude mcp add playwright npx @playwright/mcp@latest

# 6. Create the docs/ folder structure
mkdir docs docs\screenshots docs\screenshots\baselines docs\ADRs
mkdir .claude .claude\agents
mkdir scripts

# 7. Copy this build plan into the project
# Save sections 7 (CLAUDE.md), 8 (DESIGN.md), 9 (PROGRESS.md template),
# and 10 (each subagent) into their respective files.

# 8. Create .gitignore (must include .claude/worktrees/)

# 9. Initialize git, push to GitHub
git init
git add .
git commit -m "Initial scaffold: Phaser+Vite+TS, agent setup"
gh repo create the-line --private --source=. --remote=origin --push

# 10. First sanity check
pnpm dev  # Should show vite dev server on localhost:5173
# Open in browser, confirm it loads.

# 11. First Claude Code session
claude
# At the prompt:
> /agents
# Verify all 6 agents are listed.

# 12. First task
> Use the builder agent. Read docs/DESIGN.md and docs/PROGRESS.md.
  Implement Phase 1 task 1: render a single Engine car as a vector geometric
  shape on the canvas. Add a Vitest test. Update PROGRESS.md.
```

If you get to step 12 and it works, you're set. The next session can be the first overnight run on Phase 1 task 2.

---

## Appendix: critical decisions captured

Pinned here so they don't drift:

- **Genre framing:** Active management roguelike with incremental progression. NOT pure idle.
- **Pause:** Slow-time (Bastion-style), not full pause. Hold spacebar → 25% time.
- **Crew:** Slot-based (4 slots), no individual avatars or pathing in v1.
- **Visual:** Vector-geometric. Commit. No pixel art for v1.
- **Save schema:** Versioned from commit one. Migrations sacred.
- **Determinism:** Every run seeded via `?seed=<n>` URL param.
- **Module data:** JSON, not code. Adding a module is adding a row.
- **Launch surface:** itch.io + r/incremental_games (with secondary on r/IndieDev, r/Vampire_Survivors, r/ftlgame).
- **v1 monetization:** None. Build the audience first.
- **v2 monetization:** Premium Steam at $5–7 with 25–40 hours of content.

These can change — but only via human decision, not agent drift. Update DESIGN.md if you change them.
