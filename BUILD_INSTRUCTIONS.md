# THE LINE — Claude Code Build Instructions

> Operational companion to `THE_LINE_BUILD_PLAN.md`. This file tells you **exactly what to type into Claude Code** at each step. Save this in the project root as `BUILD_INSTRUCTIONS.md`.

---

## How to use this document

- Phases run in order. Don't skip ahead.
- Tasks within a phase are sequential unless marked `[parallel-safe]`.
- Each task has: **Goal**, **Prereqs**, **The Prompt** (copy-paste into Claude Code), **Validation**, **Commit message**.
- Strike through completed tasks with `~~Task X.Y~~` so you can see progress at a glance.
- **The Prompt** sections assume you're already inside `claude` at the project root.
- For every prompt: Claude reads `CLAUDE.md`, `docs/DESIGN.md`, `docs/PROGRESS.md`, and `docs/REVIEW_NOTES.md` at the start. You don't need to tell it to.

---

## Quick navigation

- [Phase 0: Environment Bootstrap](#phase-0-environment-bootstrap) — Day 1, ~3 hrs
- [Phase 1: Project Documentation](#phase-1-project-documentation) — Day 1, ~1 hr
- [Phase 2: Subagent Configuration](#phase-2-subagent-configuration) — Day 1, ~30 min
- [Phase 3: Vertical Slice](#phase-3-vertical-slice) — Days 2–7
- [Phase 4: Core Systems](#phase-4-core-systems) — Weeks 2–4
- [Phase 5: Content & Polish](#phase-5-content--polish) — Weeks 5–7
- [Phase 6: Launch Prep](#phase-6-launch-prep) — Weeks 8–10
- [Phase 7: Overnight Iteration](#phase-7-overnight-iteration) — set up after Phase 3
- [Appendix A: Prompt Templates](#appendix-a-prompt-templates)
- [Appendix B: Daily Workflow](#appendix-b-daily-workflow)
- [Appendix C: Troubleshooting](#appendix-c-troubleshooting)

---

# Phase 0: Environment Bootstrap

> One-time setup. Do all tasks in this phase before opening Claude Code.

## Task 0.1: Install Node.js v22 LTS

**Goal:** Working Node and npm.

**Steps:**
1. Download the LTS installer from https://nodejs.org (currently v22.x LTS)
2. Run the installer with default options
3. Open a new PowerShell or Git Bash window (the new env vars need a fresh shell)

**Validation:**
```bash
node --version    # v22.x.x
npm --version     # 10.x.x or higher
```

If `node` is not recognized after install, reboot. Windows PATH refresh is occasionally stubborn.

---

## Task 0.2: Install pnpm and Claude Code

**Goal:** Project tooling installed globally.

**Steps:**
```bash
npm install -g pnpm
npm install -g @anthropic-ai/claude-code
```

**Validation:**
```bash
pnpm --version       # 9.x or 10.x
claude --version     # latest
```

---

## Task 0.3: Login to Claude Code with your Max plan

**Goal:** Claude Code uses your Max 20x subscription, not API credits.

**Steps:**
```bash
claude login
```
Follow the browser prompt to authenticate. Choose your Max plan account.

**Validation:**
```bash
claude /status
```
Should show: `Plan: Max 20x` and `Model: opus` (default).

---

## Task 0.4: Create the project directory

**Goal:** Project skeleton in your standard location.

**Steps (PowerShell):**
```powershell
cd C:\Users\joshs\Desktop\datamaker
mkdir the-line
cd the-line
```

(Or Git Bash equivalent: `cd /c/Users/joshs/Desktop/datamaker && mkdir the-line && cd the-line`)

---

## Task 0.5: Initialize Vite + TypeScript project

**Goal:** Phaser-ready project scaffold.

**Steps:**
```bash
pnpm create vite . --template vanilla-ts
# When prompted "Current directory not empty. Remove existing files and continue?" — y
pnpm install
```

**Validation:**
```bash
pnpm dev
```
Should open http://localhost:5173 with the default Vite welcome page. `Ctrl+C` to stop.

---

## Task 0.6: Install game dependencies

**Goal:** All runtime libraries needed for v1.

**Steps:**
```bash
pnpm add phaser zustand localforage
pnpm add -D vitest @vitest/ui @playwright/test
pnpm exec playwright install chromium
```

**Validation:**
Open `package.json` — confirm `phaser`, `zustand`, `localforage` in `dependencies`; `vitest`, `@vitest/ui`, `@playwright/test` in `devDependencies`.

---

## Task 0.7: Add Playwright MCP to Claude Code

**Goal:** Claude can drive a real browser to test the game.

**Steps:**
```bash
claude mcp add playwright npx @playwright/mcp@latest
```

**Validation:**
```bash
claude mcp list
```
Should show `playwright` in the active list.

---

## Task 0.8: Configure project structure

**Goal:** Folders for everything that's coming.

**Steps (PowerShell):**
```powershell
mkdir src\scenes, src\systems, src\data, src\ui, src\lib
mkdir tests\unit, tests\e2e
mkdir public\assets
mkdir docs\screenshots, docs\screenshots\baselines, docs\ADRs
mkdir .claude\agents
mkdir scripts
```

(Git Bash: `mkdir -p src/{scenes,systems,data,ui,lib} tests/{unit,e2e} public/assets docs/{screenshots/baselines,ADRs} .claude/agents scripts`)

---

## Task 0.9: Create `.gitignore`

**Goal:** Don't commit build output, agent worktrees, or secrets.

**Steps:** Create `.gitignore` at the project root with:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build output
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Claude Code worktrees (AGENTS USE THESE — DO NOT COMMIT)
.claude/worktrees/

# Playwright
test-results/
playwright-report/
playwright/.cache/

# Temporary
.tmp/
*.tmp
```

---

## Task 0.10: Initialize git and push to GitHub

**Goal:** Code is in a remote repo with version control.

**Steps:**
```bash
git init
git add .
git commit -m "Initial scaffold: Vite + TypeScript + Phaser"

# If you have GitHub CLI:
gh repo create the-line --private --source=. --remote=origin --push

# Otherwise, create the repo manually on github.com, then:
# git remote add origin https://github.com/YOUR_USERNAME/the-line.git
# git branch -M main
# git push -u origin main
```

**Validation:** Open the repo URL on github.com — your code is there.

---

## Phase 0 complete. Verify before continuing:

- [ ] `node --version` → v22.x
- [ ] `claude /status` → Max 20x
- [ ] `claude mcp list` → playwright listed
- [ ] `pnpm dev` works on localhost:5173
- [ ] Repo pushed to GitHub
- [ ] All folders from Task 0.8 exist

---

# Phase 1: Project Documentation

> The four canonical docs. Agents read these every session. Do not skip any.

## Task 1.1: Create `CLAUDE.md`

**Goal:** Master agent operating instructions at repo root.

**Steps:** Create `CLAUDE.md` at the project root. Copy the entire content of Section 7 of `THE_LINE_BUILD_PLAN.md` into it.

**Validation:** `CLAUDE.md` exists at project root and contains the operating instructions verbatim.

---

## Task 1.2: Create `docs/DESIGN.md`

**Goal:** Canonical design doc.

**Steps:** Create `docs/DESIGN.md`. Copy the entire content of Section 8 of `THE_LINE_BUILD_PLAN.md` into it.

**This file is sacred.** Only humans modify it. Update the "Open questions" section as you make design decisions throughout the build.

**Validation:** `docs/DESIGN.md` exists and is populated.

---

## Task 1.3: Create `docs/PROGRESS.md`

**Goal:** Self-updating handoff doc.

**Steps:** Create `docs/PROGRESS.md` with the initial template:

```markdown
# PROGRESS.md

> Last updated: 2026-05-05 by human (initial setup)
> Build phase: 0 (setup complete)
> v1 ETA: 2026-07-15

## Current build status

- Phase 0 setup: ✅
- Phase 1 documentation: ✅
- Phase 2 subagents: 🚧
- Phase 3 vertical slice: ⏳
- Phase 4 core systems: ⏳
- Phase 5 content + polish: ⏳
- Phase 6 launch prep: ⏳

## Recent activity (last 10 sessions)

| Date | Agent | Branch | Summary | Tests |
|---|---|---|---|---|
| 2026-05-05 | human | main | Initial scaffold + docs | n/a |

## Next priorities (queue, ordered)

1. **READY** — Phase 3 Task 3.1: Initial planning session (planner/Opus)
2. **READY** — Phase 3 Task 3.2: Render basic Phaser canvas (builder/Sonnet)
3. **READY** — Phase 3 Task 3.3: Implement TrainSystem v0 (builder/Sonnet)

## Open questions for human (Josh)

- None currently.

## Blockers

- None currently.

## Performance metrics

- Total source: 0 LoC (scaffold only)
- Test coverage: n/a
- Bundle size: n/a (not built yet)
- 60fps target: n/a (not built yet)

## Screenshot log

- None yet.

## Cost ledger (rough)

- Phase 0–2 setup: ~$0 (manual work)
```

**Validation:** `docs/PROGRESS.md` exists.

---

## Task 1.4: Create `docs/REVIEW_NOTES.md`

**Goal:** Where the reviewer agent writes findings.

**Steps:** Create `docs/REVIEW_NOTES.md`:

```markdown
# REVIEW_NOTES.md

> Findings from the reviewer agent (Opus). New entries added at the top.
> Categories: BLOCKER | NEEDS-CHANGE | NIT | OK-AS-IS

## 2026-05-05 — Initial state
- No code to review yet. File ready for first build review.
```

---

## Task 1.5: Create `README.md`

**Goal:** Public-facing repo README. Doesn't have to be polished now.

**Steps:** Create `README.md`:

```markdown
# THE LINE

A side-scrolling combat train roguelike. FTL meets Vampire Survivors meets Binding of Isaac.

You build the train. The train fights itself. You manage power, crew, and abilities in real time.

## Status
🚧 In active development. v1 browser launch target: July 2026.

## Tech
Phaser 3 + TypeScript + Vite + Matter.js + Zustand.

## Development
\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Documentation
See `docs/DESIGN.md` for the canonical design and `THE_LINE_BUILD_PLAN.md` for the full build plan.
```

(Note: escaped backticks above — replace `\`\`\`` with triple backticks when you save.)

---

## Task 1.6: Commit documentation

**Steps:**
```bash
git add CLAUDE.md docs/ README.md
git commit -m "docs: initial CLAUDE.md, DESIGN.md, PROGRESS.md, REVIEW_NOTES.md"
git push
```

---

## Phase 1 complete. Verify:

- [ ] `CLAUDE.md` at root
- [ ] `docs/DESIGN.md` populated
- [ ] `docs/PROGRESS.md` populated
- [ ] `docs/REVIEW_NOTES.md` populated
- [ ] `README.md` at root
- [ ] All committed and pushed

---

# Phase 2: Subagent Configuration

> Six agents, each in `.claude/agents/`. After this phase, you can dispatch parallel work.

## Task 2.1: Create all 6 subagent files

**Goal:** Six `.md` files in `.claude/agents/`.

**Steps:** Create each file using the content from Section 10 of `THE_LINE_BUILD_PLAN.md`:

- `.claude/agents/planner.md` (Section 10.1, model: opus)
- `.claude/agents/builder.md` (Section 10.2, model: sonnet)
- `.claude/agents/balancer.md` (Section 10.3, model: sonnet)
- `.claude/agents/qa-runner.md` (Section 10.4, model: sonnet)
- `.claude/agents/reviewer.md` (Section 10.5, model: opus)
- `.claude/agents/archivist.md` (Section 10.6, model: haiku)

---

## Task 2.2: Create `.claude/settings.json`

**Goal:** Project-level Claude Code config.

**Steps:** Create `.claude/settings.json`:

```json
{
  "defaultModel": "sonnet",
  "permissions": {
    "allow": [
      "Bash(pnpm *)",
      "Bash(npm *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git branch *)",
      "Bash(git checkout *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Read(*)",
      "Edit(*)",
      "Write(src/**)",
      "Write(tests/**)",
      "Write(docs/**)",
      "Write(public/**)",
      "Write(scripts/**)"
    ],
    "deny": [
      "Write(docs/DESIGN.md)",
      "Bash(git push *)",
      "Bash(rm -rf *)",
      "Bash(curl *)"
    ]
  }
}
```

This locks DESIGN.md from agents, prevents agents from pushing to remote (you push manually), and blocks destructive commands.

---

## Task 2.3: Verify agents loaded

**Steps:**
```bash
claude
```
At the prompt:
```
> /agents
```

**Validation:** All 6 agents listed: planner, builder, balancer, qa-runner, reviewer, archivist.

If any are missing, check the frontmatter format in their `.md` file. Each must start with:
```yaml
---
name: <agent-name>
description: "..."
tools: ...
model: opus|sonnet|haiku
---
```

---

## Task 2.4: First sanity-check prompt

**Goal:** Confirm Claude has read everything correctly.

**The Prompt:**
> Read CLAUDE.md, docs/DESIGN.md, docs/PROGRESS.md, and docs/REVIEW_NOTES.md.
> Confirm you understand:
> 1. The game concept in one sentence
> 2. The 6 subagents available
> 3. The hard rules from CLAUDE.md
> 4. The first task in PROGRESS.md "Next priorities"
>
> Do not write any code. Do not modify any files. Just confirm understanding.

**Validation:** Claude responds with accurate summaries. If anything is wrong, fix the docs and re-prompt.

---

## Task 2.5: Commit subagent setup

**Steps:**
```bash
git add .claude/
git commit -m "subagents: initial 6 agents (planner, builder, balancer, qa-runner, reviewer, archivist)"
git push
```

---

## Phase 2 complete. Verify:

- [ ] 6 agent files in `.claude/agents/`
- [ ] `.claude/settings.json` exists
- [ ] `/agents` lists all 6
- [ ] Sanity-check prompt got accurate responses
- [ ] Committed and pushed

---

# Phase 3: Vertical Slice

> Days 2–7. Goal: end-to-end playable loop with one of everything. After this phase, the overnight iteration loop becomes useful.

## Task 3.1: Initial planning session (planner / Opus)

**Goal:** Stress-test DESIGN.md before writing code. Get Claude to find the gaps.

**The Prompt:**
> Use the planner agent. Read docs/DESIGN.md carefully.
>
> Your task: identify the top 5 design gaps, contradictions, or unspecified decisions that will cause problems during the Phase 1 vertical slice build. For each:
>
> 1. State the issue
> 2. Explain why it'll matter in code
> 3. Recommend a specific resolution (with tradeoffs)
>
> Output as a decision record. Do not modify any files. I will read your output and update DESIGN.md myself.

**Validation:** Claude returns 5+ concrete issues with reasoning. Read carefully. Update DESIGN.md "Open questions" section with anything you decide to defer, and update DESIGN.md proper with anything you decide now.

**Estimated cost:** ~$1–3 of Opus. High value.

**Commit message:** `docs: design refinements from initial planner session`

---

## Task 3.2: Phaser canvas + game loop (builder / Sonnet)

**Goal:** A working Phaser game with empty BootScene.

**Prereqs:** Tasks 0–2 complete. DESIGN.md updated from Task 3.1.

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md, docs/PROGRESS.md.
>
> Implement the initial Phaser scaffold:
>
> 1. Create src/main.ts: Phaser game config (1280×720, dark background, scene list)
> 2. Create src/scenes/BootScene.ts: loads no assets yet, just transitions to RunScene
> 3. Create src/scenes/RunScene.ts: empty scene with text "THE LINE — vertical slice"
> 4. Update index.html to load main.ts and have a div#game container
> 5. Run `pnpm dev` — verify localhost:5173 shows the canvas
> 6. Write a Vitest unit test that imports main.ts without errors
> 7. Update PROGRESS.md "Recent activity" and remove the completed task from "Next priorities"
> 8. Commit on a worktree branch named feat-canvas-bootstrap

**Validation:**
```bash
pnpm dev          # Canvas visible at localhost:5173
pnpm test         # Vitest unit test passes
```

**Commit:** Handled by builder agent on worktree.

---

## Task 3.3: TrainSystem v0 (builder / Sonnet)

**Goal:** A vector-rendered train with one Engine car visible on screen.

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md (especially §3.1 Cars + Modules) and docs/PROGRESS.md.
>
> Implement TrainSystem v0:
>
> 1. Create src/systems/TrainSystem.ts: a class managing an array of Car objects
> 2. Create src/data/cars.json with the 5 v1 car types (Engine, Weapon, Armor, Crew, Cargo) — for now, only the Engine type needs full data
> 3. Each Car renders as a vector geometric shape using Phaser.GameObjects.Graphics — distinct silhouette per type
> 4. The Engine car renders at left side of the screen
> 5. Train slowly auto-scrolls left-to-right (background moves, train stays visible) at 50 px/sec
> 6. Vitest tests for TrainSystem.addCar(), TrainSystem.update()
> 7. Playwright E2E test: navigate to localhost, screenshot at t=2s, verify train shape exists
> 8. Update PROGRESS.md
> 9. Commit on a worktree branch named feat-train-system-v0

**Validation:**
- Open localhost — see a vector-shaped engine car on the left
- Background scrolls past it (parallax effect)
- `pnpm test` passes
- `pnpm test:e2e` passes

---

## Task 3.4: ModuleAttachmentSystem v0 (builder / Sonnet)

**Goal:** The critical engineering — modules visually attach to cars.

**Prereqs:** Task 3.3 complete.

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md (§3.1 and §5).
>
> THIS IS THE MOST IMPORTANT TASK IN PHASE 3. The visual identity of the entire game depends on getting this generic module-attachment system right. Spend the time to design it well.
>
> Implement ModuleAttachmentSystem v0:
>
> 1. Create src/systems/ModuleAttachmentSystem.ts
> 2. Define Module interface in src/types/module.ts: { id, name, category, slotType, render(graphics, x, y), behavior }
> 3. Define attachment slots on each Car: top, sides, belly, with explicit (x, y) offsets per car type
> 4. Create src/data/modules.json with one module: "basic-cannon" (kinetic category, slotType: "top", renders as a small cannon shape)
> 5. Add the basic-cannon to the Engine car at the top slot
> 6. Render the module on top of the car as it scrolls
> 7. Vitest tests: ModuleAttachmentSystem.attach(), .detach(), .render()
> 8. Playwright: screenshot confirms cannon visible on top of engine
> 9. Update PROGRESS.md with notes on the attachment slot architecture (this affects every future module)
> 10. Commit on feat-module-attachment-v0

**After Claude finishes, before merging:**
> Use the reviewer agent. Review the feat-module-attachment-v0 branch against docs/DESIGN.md. Pay special attention to whether the slot system can scale to 30+ modules and 5 car types without rework. Write findings to docs/REVIEW_NOTES.md.

**Validation:** Open localhost, see a cannon on the engine. The cannon is positioned correctly relative to the car as it scrolls.

**If reviewer flags BLOCKER issues:** address them before continuing. The module system is foundational — fixing it later is 10× harder than fixing it now.

---

## Task 3.5: CombatSystem + EnemySpawner v0 (builder / Sonnet)

**Goal:** Cannon auto-fires at incoming enemies.

**Prereqs:** Task 3.4 complete and reviewed.

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.2 (Combat) and §6 (Vampire Survivors layer).
>
> Implement CombatSystem and EnemySpawner v0:
>
> 1. Create src/systems/CombatSystem.ts: tracks projectiles in flight, handles collision detection
> 2. Create src/systems/EnemySpawner.ts: spawns simple enemies offscreen at a configurable rate
> 3. Create src/data/enemies.json with one enemy: "scout" (small triangle, moves toward train at 80 px/sec, 10 HP)
> 4. The basic-cannon module from Task 3.4 auto-fires at the nearest scout every 1 second
> 5. Projectiles use Matter.js physics for arcs (gravity-affected)
> 6. On hit: enemy destroyed, +1 to a Salvage counter (display in top-right HUD)
> 7. Vitest tests for CombatSystem.fire(), .checkCollision(), EnemySpawner.spawn()
> 8. Playwright E2E: spawn 5 enemies, verify they're destroyed and Salvage counter increments
> 9. Update PROGRESS.md
> 10. Commit on feat-combat-v0

**Validation:**
- Open localhost — see enemies spawning, cannon firing, Salvage incrementing
- `pnpm test` and `pnpm test:e2e` pass

---

## Task 3.6: Save/load system (builder / Sonnet)

**Goal:** Persistent Salvage between sessions, with versioning.

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md and CLAUDE.md (§Hard rules — save versioning is sacred).
>
> Implement SaveSystem v0:
>
> 1. Create src/systems/SaveSystem.ts using localforage
> 2. Define SaveData interface in src/types/save.ts with field saveVersion: 1
> 3. Save: { saveVersion: 1, totalSalvage: number, lastSaved: ISO date string }
> 4. Auto-save every 30 seconds and on page unload
> 5. Load on game start; if no save, create new
> 6. Implement migration runner: function migrateSave(data) — if saveVersion mismatches, run migrations in order. v0 → v1 is identity (nothing to migrate yet) but the framework must exist.
> 7. Vitest tests for save/load round-trip, migration runner with mocked old saves
> 8. Update PROGRESS.md
> 9. Commit on feat-save-system

**Validation:**
- Reload localhost — Salvage persists
- Open browser DevTools → Application → IndexedDB → see saved data with saveVersion: 1

---

## Task 3.7: First overall vertical slice review (reviewer / Opus)

**Goal:** End-of-Phase-3 health check.

**The Prompt:**
> Use the reviewer agent. We've completed the Phase 3 vertical slice (TrainSystem + ModuleAttachmentSystem + CombatSystem + EnemySpawner + SaveSystem).
>
> Review:
> 1. Architecture quality — will this scale to 30 modules, 5 car types, 5 enemy types?
> 2. Test coverage gaps
> 3. DESIGN.md alignment — anything we drifted from?
> 4. Code smells, anti-patterns, hard-coded values that should be in JSON
> 5. Performance concerns for the future bullet-hell density
>
> Write findings to docs/REVIEW_NOTES.md as a "Phase 3 Review" section. Categorize each finding (BLOCKER / NEEDS-CHANGE / NIT / OK-AS-IS).

**After review:** address any BLOCKER or NEEDS-CHANGE items before starting Phase 4.

---

## Phase 3 complete. Verify:

- [ ] Train scrolls left-to-right with one engine car visible
- [ ] Module (cannon) attached to engine, positioned correctly
- [ ] Cannon auto-fires at enemies, enemies die, Salvage counts
- [ ] Salvage persists across page reloads
- [ ] Save versioning framework in place
- [ ] All Vitest unit tests pass
- [ ] All Playwright E2E tests pass
- [ ] Reviewer's BLOCKER and NEEDS-CHANGE items addressed
- [ ] PROGRESS.md fully reflects current state

**At this point, set up overnight iteration (Phase 7) so subsequent phases can run autonomously.**

---

# Phase 4: Core Systems

> Weeks 2–4. Build out everything else needed for a complete-feeling run. By end of phase: 5 car types, 10 modules, 5 enemies + 1 boss, working power/crew/pause systems.

## Task 4.1: Expand to all 5 car types (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.1.
>
> Expand TrainSystem to support all 5 car types: Engine, Weapon Car, Armor Car, Crew Car, Cargo Car.
>
> 1. Update src/data/cars.json with full data for all 5 (HP, slots, base stats from DESIGN)
> 2. Each renders with a distinct silhouette (geometric, immediately distinguishable)
> 3. Player starts with the default 5-car train: [Engine, Weapon, Armor, Crew, Cargo]
> 4. Train length displayed in HUD
> 5. Vitest + Playwright tests
> 6. Update PROGRESS.md
> 7. Commit on feat-all-car-types

---

## Task 4.2: 10 modules across categories (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.1 (Modules).
>
> Add 9 more modules to make 10 total: 2 kinetic, 2 fire, 2 cryo, 1 explosive, 1 electric, 2 support.
>
> For each: src/data/modules.json entry + render function + behavior. Use the existing ModuleAttachmentSystem.
>
> 1. Add modules to JSON
> 2. Implement render() for each (geometric vector shapes, distinct silhouettes)
> 3. Implement behavior() for each (firing pattern, effect)
> 4. Vitest tests for each module's behavior
> 5. Playwright: visual regression test capturing all modules attached to a test train
> 6. Commit on feat-10-modules

---

## Task 4.3: PowerSystem with FTL-style UI (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.3 (Skill layer — Power distribution).
>
> Implement PowerSystem:
>
> 1. Engine car generates 10 power/sec base
> 2. Each car has a power-allocation slider in a UI panel (DOM-based, not Phaser canvas)
> 3. Cars consume power per second (defined in cars.json)
> 4. Modules have power requirements; under-powered modules fire slower or not at all
> 5. UI shows: total generation, total consumption, per-car allocation
> 6. Drag handles to redistribute (real-time, not paused)
> 7. Vitest unit tests for power math
> 8. Playwright: drag a slider, verify a module's fire rate changes
> 9. Commit on feat-power-system

---

## Task 4.4: Crew slot system (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.3 (Crew assignment) — slot-based, no individual avatars.
>
> Implement CrewSystem:
>
> 1. 4 crew slots in the Crew Car
> 2. Each crew slot can be assigned to any car (drag-drop or click-to-assign UI)
> 3. Crew on a Weapon Car: +50% fire rate to all modules on that car
> 4. Crew on a damaged car (HP < 50%): +5 HP/sec passive repair
> 5. Crew on Engine Car: +10% power generation
> 6. Crew icons are simple vector dots with slot colors
> 7. Vitest tests for assignment math
> 8. Playwright: drag crew, verify buff applies
> 9. Commit on feat-crew-slots

---

## Task 4.5: Slow-time pause (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.3 (slow-time pause — Bastion-style, hold spacebar → 25% time).
>
> Implement SlowTimeSystem:
>
> 1. Hold spacebar → time scale 0.25
> 2. Release spacebar → time scale 1.0
> 3. Apply globally: enemies, projectiles, animations, all systems
> 4. Visual indicator: subtle desaturation + vignette while slowed
> 5. Vitest tests for time-scale propagation
> 6. Playwright: hold spacebar, verify enemy speed reduced
> 7. Commit on feat-slow-time

---

## Task 4.6: 5 enemy types + 1 boss (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.5 (encounter grammar).
>
> Add 4 more enemy types and 1 boss:
>
> 1. enemies.json gets 5 total: scout (existing), bruiser (slow, high HP), runner (fast, low HP), shooter (ranged), suicide-bomber (explodes on contact)
> 2. Plus boss: "Veil Hauler" — large, multi-phase, tanky
> 3. Each renders as distinct geometric shape with different color/silhouette
> 4. AI behavior per type (tracking, ranged, suicide, etc.)
> 5. Boss has 3 phases with different attack patterns
> 6. Vitest tests for each enemy's behavior
> 7. Playwright: spawn each enemy type, verify behavior
> 8. Commit on feat-enemy-roster

---

## Task 4.7: Encounter grammar (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.5.
>
> Implement EncounterSystem:
>
> 1. src/data/encounters.json defines encounter templates: travel, swarm, mini-boss, boss
> 2. Each template: enemy composition, duration, spawn pattern
> 3. Run flow: travel → swarm → travel → mini-boss → travel → boss
> 4. Pacing: ~50% travel, 25% swarm, 15% mini-boss, 10% boss
> 5. Visual indicator at top of screen: "[Travel — 90s remaining]", etc.
> 6. Vitest tests for encounter pacing
> 7. Playwright: verify a 3-minute simulated run includes at least one swarm
> 8. Commit on feat-encounter-grammar

---

## Task 4.8: Environmental effects matrix v1 (builder + planner combined)

**Step 1 — Planning (planner / Opus):**
> Use the planner agent. Read docs/DESIGN.md §3.4 (environmental effects matrix, 5×5).
>
> Design the data structure for the environmental effects matrix:
> 1. How is it stored? (JSON shape)
> 2. How does the EnvironmentSystem evaluate (weapon, terrain) → effect at runtime?
> 3. How do we handle terrain transitions during a run?
> 4. How do compound effects work (e.g., fire + forest → wildfire spreads)?
>
> Output: a design doc at docs/ADRs/001-environment-system.md with the chosen architecture and reasoning. Do not write code.

**Step 2 — Implementation (builder / Sonnet):**
> Use the builder agent. Read docs/ADRs/001-environment-system.md.
>
> Implement EnvironmentSystem v1 per the ADR:
> 1. src/data/biomes.json with 5 terrain types
> 2. src/data/environment-matrix.json (5×5 effect rules)
> 3. src/systems/EnvironmentSystem.ts: applies effects when weapons hit terrain
> 4. Visual: lingering effect particles (fire patches burn for 5s, ice for 3s, etc.)
> 5. Effects damage enemies passing through
> 6. Vitest tests for each of the 25 cells
> 7. Playwright: fire a fire weapon at forest terrain, verify wildfire spreads
> 8. Commit on feat-environment-matrix

---

## Task 4.9: Run/Hub split (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.6 (roguelike loop).
>
> Implement scene structure:
> 1. HubScene: between-run UI (DOM-heavy, Tailwind). Sections: Engineering Bay (modules), Crew Roster, Tech Tree (placeholder), Mission Board, Lore Log (placeholder)
> 2. RunScene: the actual gameplay
> 3. DeathScene: shown when train HP = 0; shows run summary, then back to Hub
> 4. Engineering Bay: drag modules onto cars, save train layout
> 5. Mission Board: pick which Line to run (1 line in v0)
> 6. "Depart" button → starts a run
> 7. Vitest tests for scene transitions
> 8. Playwright: complete a full Hub → Run → Death → Hub cycle
> 9. Commit on feat-hub-scene

---

## Task 4.10: Save versioning v2 (builder)

**The Prompt:**
> Use the builder agent. Read CLAUDE.md (save versioning sacred) and existing src/systems/SaveSystem.ts.
>
> Bump save schema to v2 with full Hub state:
> 1. saveVersion: 2
> 2. Save: { saveVersion, totalSalvage, hubState (modules owned, crew roster, train layout, completed runs), lastSaved }
> 3. Migration runner: v1 → v2 (preserves existing Salvage, initializes hub state)
> 4. Test migration with mocked v1 save data
> 5. Vitest tests for migration
> 6. Update SaveSystem to load v2
> 7. Commit on feat-save-v2

---

## Task 4.11: Phase 4 review (reviewer / Opus)

**The Prompt:**
> Use the reviewer agent. We've completed Phase 4 (core systems). Review the entire codebase against docs/DESIGN.md.
>
> Focus areas:
> 1. Power/Crew/Slow-time integration — do they compose cleanly?
> 2. EncounterSystem pacing — does it feel right per design targets?
> 3. EnvironmentSystem performance — will 25 cells × bullet-hell density hold 60fps?
> 4. SaveSystem migration robustness
> 5. Any missing tests for critical paths
>
> Write findings to docs/REVIEW_NOTES.md as "Phase 4 Review" section.

---

## Phase 4 complete. Verify:

- [ ] All 5 car types rendering, all 10 modules functional
- [ ] PowerSystem UI works, sliders affect module performance
- [ ] Crew slot drag-drop works
- [ ] Hold spacebar → time slows
- [ ] All 5 enemies + boss spawn correctly
- [ ] Travel/swarm/mini-boss/boss encounters in a run
- [ ] Fire on forest causes wildfire (and other matrix cells work)
- [ ] Hub UI lets you customize train and depart on a run
- [ ] Save schema is v2 with migration tested
- [ ] Reviewer's BLOCKER/NEEDS-CHANGE addressed

---

# Phase 5: Content & Polish

> Weeks 5–7. Scale to full v1 content, add polish, ship-ready.

## Task 5.1: Expand to 30 modules (builder + balancer)

**Step 1 (builder):**
> Use the builder agent. Read docs/DESIGN.md §3.1 (Modules — 30 in v1).
>
> Expand modules.json from 10 to 30. Distribution: 5 kinetic, 5 fire, 5 cryo, 4 explosive, 3 electric, 8 support/exotic.
>
> For each new module: JSON entry + render() + behavior() + Vitest test.
>
> Submit on a worktree branch named feat-30-modules-implementation.

**Step 2 (balancer):**
> Use the balancer agent. With 30 modules now in place, run the headless balance simulator: `pnpm sim:balance --runs 1000 --seed-range 1-1000`.
>
> Tune costs and effects so:
> - Median run length: 18 minutes
> - Time-to-first-prestige: 60–90 minutes of total play
> - No single module is mandatory; multiple viable build paths
>
> Iterate. Document findings in PROGRESS.md cost ledger. Commit data tweaks on feat-30-modules-balance.

---

## Task 5.2: Full 5×5 environmental matrix (builder)

**The Prompt:**
> Use the builder agent. Expand environment-matrix.json to all 25 cells per docs/DESIGN.md §3.4.
>
> 1. Implement all 25 weapon×terrain interactions
> 2. Implement compound effects (fire-on-forest spreads, electric-on-swamp chains, etc.)
> 3. Vitest tests for all 25 + 5+ compound effect tests
> 4. Playwright visual regression for each cell
> 5. Commit on feat-full-matrix

---

## Task 5.3: Tech Tree (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.6 (Tech Tree placeholder).
>
> Implement TechTree system:
> 1. 5 branches × 5 tiers (25 nodes total for v1)
> 2. src/data/tech-tree.json defines node prereqs and effects
> 3. Spend Salvage to unlock nodes
> 4. Effects: unlock new modules, +X% to a category, etc.
> 5. UI: a node graph in HubScene, click to unlock
> 6. Vitest tests for prereq logic
> 7. Playwright: unlock a node, verify effect applies in next run
> 8. Commit on feat-tech-tree

---

## Task 5.4: Build sharing via URL (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §11 (build sharing via URL parameter).
>
> Implement BuildSharing:
> 1. Encode train layout (cars, modules, crew assignment) as base64 in URL: ?build=<encoded>
> 2. "Share Build" button in Hub copies the current URL to clipboard
> 3. Loading a URL with ?build= imports it as a temporary trainable layout (player must own modules to actually equip them)
> 4. Vitest tests for encode/decode round-trip
> 5. Playwright: encode a build, decode it, verify match
> 6. Commit on feat-build-sharing

This is your viral mechanic. Don't skip it.

---

## Task 5.5: Visual polish (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.3 (visual style).
>
> Implement juice:
> 1. Particle trails on all kinetic projectiles
> 2. Screen shake on big impacts (configurable intensity)
> 3. Hit-stop: when boss takes damage, freeze all motion for 50ms
> 4. Screen-edge red flash when train HP < 25%
> 5. Module glow when about to fire (telegraph)
> 6. Smooth tween animations for HUD updates
> 7. No new Vitest tests required (visual only)
> 8. Playwright: capture before/after screenshots
> 9. Commit on feat-visual-polish

---

## Task 5.6: Audio integration (builder)

**The Prompt:**
> Use the builder agent. I will provide 30 SFX files in public/assets/audio/sfx/ and 3 music tracks in public/assets/audio/music/.
>
> Implement AudioSystem:
> 1. Load all SFX on boot
> 2. Play appropriate SFX on: shot fired, enemy killed, module purchased, level up, train damaged, run start, run end
> 3. Music tracks: hub.mp3, combat.mp3, tense.mp3 — auto-switch by scene
> 4. Volume sliders in Settings (master, sfx, music)
> 5. Settings persist via localforage
> 6. Vitest tests for AudioSystem.play(), .setVolume()
> 7. Commit on feat-audio

**Before this task:** generate the audio assets. SFX via ElevenLabs, music via Suno. Drop into the folders. Commit them separately.

---

## Task 5.7: Tutorial / onboarding (builder + planner combined)

**Step 1 (planner):**
> Use the planner agent. Read docs/DESIGN.md (the whole game). Design the first-time-player experience for THE LINE.
>
> 1. What does the player need to learn in their first 5 minutes?
> 2. In what order?
> 3. What's "show, don't tell" vs "explicit popup"?
> 4. How do we let experienced players skip?
>
> Output: a tutorial script in docs/TUTORIAL_DESIGN.md. Do not write code.

**Step 2 (builder):**
> Use the builder agent. Read docs/TUTORIAL_DESIGN.md and implement the tutorial flow per the spec.
>
> Includes: initial popups, contextual hints, first-run guidance, skip option for returning players. Tutorial state persists in save data.
>
> Commit on feat-tutorial.

---

## Task 5.8: Idle income + auto-run mode (builder)

**The Prompt:**
> Use the builder agent. Read docs/DESIGN.md §3.6 (idle hook).
>
> Implement IdleSystem and AutoRunSystem:
> 1. While at Hub, passive Salvage trickles in based on highest run completed (1% / sec of best-run total)
> 2. "Auto-Run" button: train auto-repeats most recent successful Line, generating reduced rewards (40%) without active play
> 3. Auto-Run continues across page reloads (offline progress capped at 8 hours)
> 4. UI shows: pending Salvage, auto-run status, next reward in X seconds
> 5. Vitest tests for idle math, offline-progress capping
> 6. Playwright: enable auto-run, reload, verify Salvage accumulated correctly
> 7. Commit on feat-idle-and-autorun

---

## Phase 5 complete. Verify:

- [ ] 30 modules implemented and balance-tuned
- [ ] Full 25-cell environmental matrix working
- [ ] Tech Tree with 25 unlockable nodes
- [ ] Build sharing via URL works (test by sending yourself a link)
- [ ] Visual polish: particles, shake, hit-stop, flash
- [ ] All audio integrated, settings persist
- [ ] Tutorial onboards new players cleanly
- [ ] Idle income + auto-run work correctly

---

# Phase 6: Launch Prep

> Weeks 8–10. Polish bugs, prep marketing assets, ship.

## Task 6.1: QA sweep (qa-runner / Sonnet)

**The Prompt:**
> Use the qa-runner agent. Run the full Playwright suite. Then:
>
> 1. Identify any flaky tests
> 2. Run a 30-minute headed Playwright session: simulate a real player going through Hub → Run → Death → Hub → upgrade → Run again
> 3. Take screenshots at every major state
> 4. Write a comprehensive QA report at docs/QA_PRELAUNCH.md including:
>    - All test results
>    - Performance metrics (fps, bundle size, load time)
>    - Visual issues spotted
>    - UX issues spotted
> 5. Update PROGRESS.md with the report summary

---

## Task 6.2: Bug fix sweep (builder)

**The Prompt:**
> Use the builder agent. Read docs/QA_PRELAUNCH.md.
>
> Address every issue tagged BLOCKER or HIGH-PRIORITY. For each:
> 1. Reproduce
> 2. Fix
> 3. Add a regression test
> 4. Commit on a worktree named bug-<short-name>
>
> Update QA_PRELAUNCH.md as items are fixed.

---

## Task 6.3: Final balance pass (balancer / Sonnet)

**The Prompt:**
> Use the balancer agent. Run a 5000-seed simulation for final balance.
>
> Tune until:
> - Median first-run completion rate: 60% (40% die)
> - Median time to 5 modules unlocked: 30 minutes
> - Median time-to-first-prestige: 90 minutes
> - No build is dominant (top 5 builds within 20% of each other in win rate)
>
> Document final values in docs/BALANCE_FINAL.md with the simulation outputs.

---

## Task 6.4: itch.io page setup (manual + archivist)

**Manual steps:**
1. Create itch.io creator account if you don't have one
2. New project: "THE LINE"
3. Genre: Action / Idle / Roguelike (multi-tag)
4. Pricing: Free (or "Name your own price" with $0 minimum)
5. Upload built game (run `pnpm build`, zip the dist/ folder)

**Then prompt archivist:**
> Use the archivist agent. Generate the itch.io page copy:
>
> 1. Short description (140 chars): tagline that gets clicks
> 2. Long description (markdown): what is the game, how to play, key features, controls
> 3. 5 thumbnail capsule descriptions
> 4. Tags list (10 tags)
>
> Save to docs/ITCHIO_COPY.md.

---

## Task 6.5: Trailer creation (manual)

**Manual steps:**
1. Install OBS Studio (free)
2. Record 3 minutes of varied gameplay: Hub overview, run start, swarm encounter, boss fight, death + hub return
3. Edit to 30 seconds in DaVinci Resolve (free) or CapCut
4. Hooks: first 5 seconds must show the train transformation (zoom from simple → loaded)
5. End with a clear call to action and itch.io URL

**Tip:** post the trailer to Twitter/X and Reddit's r/IndieGaming a few days before launch to build momentum.

---

## Task 6.6: r/incremental_games launch post (manual + planner)

**Prompt planner:**
> Use the planner agent. Draft a launch post for r/incremental_games announcing THE LINE.
>
> Format: title, gif/image suggestions, opening hook, what makes the game novel, key features, link, "feedback welcome" close.
>
> Reference: study the top 10 launch posts of the past 6 months on r/incremental_games. Match the tone they use.
>
> Save to docs/REDDIT_LAUNCH_POST.md.

**Manual:** refine, post on a Tuesday or Wednesday morning EST for max engagement. Stay online for 4 hours after to engage with comments.

---

## Task 6.7: Friend playtest (manual)

Send 3 friends the itch.io URL with this message:
> "Spend 30 min playing this. Take notes on: (1) when did you check the time? (2) what confused you? (3) what made you feel powerful? (4) would you keep playing tomorrow?"

Compile feedback. Address only critical issues — last-minute changes are dangerous.

---

## Task 6.8: Performance budget verification (qa-runner)

**The Prompt:**
> Use the qa-runner agent. Run performance benchmark:
>
> 1. Start a run, force max enemy density (200+ on screen)
> 2. Measure: fps, frame time, memory usage
> 3. Targets: 60fps stable on Chrome desktop, 30fps minimum on mobile
> 4. If targets missed: profile and identify hot paths, document in docs/PERF_FINAL.md
>
> If any target is missed by >20%: BLOCKER for launch. Address before shipping.

---

## Task 6.9: Launch (manual)

Launch day checklist:
- [ ] itch.io page live and tested by you in incognito
- [ ] r/incremental_games post submitted
- [ ] Cross-post to: r/IndieDev, r/IndieGaming, r/WebGames, r/playmygame
- [ ] Newgrounds upload submitted
- [ ] Twitter/X post with trailer
- [ ] Mastodon/Bluesky equivalent
- [ ] Discord (any indie game dev servers you're in)
- [ ] Stay online for 4–6 hours to respond to comments and bug reports

---

## Phase 6 complete. Verify:

- [ ] All BLOCKER bugs fixed
- [ ] Final balance numbers documented
- [ ] itch.io page live with copy + trailer
- [ ] Reddit post drafted and submitted
- [ ] Friends playtested, critical issues addressed
- [ ] Performance targets hit
- [ ] Game launched publicly

---

# Phase 7: Overnight Iteration

> Set up *after* Phase 3 (vertical slice), use throughout Phases 4–6. This is the multiplier on your 5–7 hrs/week.

## Task 7.1: Create separate API key with spending cap

**Goal:** Overnight runs can't blow your budget.

**Steps:**
1. Go to https://console.anthropic.com/
2. Create a new API key named `the-line-overnight`
3. Set spending cap: $50/day, $1000/month total
4. Save the key to a `.env` file in the project root (already in .gitignore):

```
ANTHROPIC_OVERNIGHT_KEY=sk-ant-...
```

---

## Task 7.2: Create overnight script

**Steps:** Save as `scripts/overnight.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Switch to overnight API key (capped at $50/day)
export ANTHROPIC_API_KEY="$ANTHROPIC_OVERNIGHT_KEY"

LOG="logs/overnight-$(date +%Y%m%d-%H%M).log"
mkdir -p logs

echo "=== Overnight run started at $(date) ===" | tee -a "$LOG"

# Run builder on next READY task (max 4 hours, max $30)
timeout 4h claude \
  --headless \
  --max-cost-usd 30 \
  --task "Read docs/PROGRESS.md. Pick the highest-priority task marked READY in the 'Next priorities' queue. Use the builder agent to implement it fully — including tests. Update PROGRESS.md to reflect completion or BLOCKED state. Exit cleanly when done." \
  >> "$LOG" 2>&1 || echo "Builder timed out or hit cost cap" >> "$LOG"

# Run reviewer on the new branch (max 30 min, max $10)
timeout 30m claude \
  --headless \
  --max-cost-usd 10 \
  --task "Use the reviewer agent. Diff the most recent worktree branch against main. Write findings to docs/REVIEW_NOTES.md. Update PROGRESS.md if any BLOCKER findings." \
  >> "$LOG" 2>&1 || echo "Reviewer timed out or hit cost cap" >> "$LOG"

# Archivist tidies up (max 10 min, max $2)
timeout 10m claude \
  --headless \
  --max-cost-usd 2 \
  --task "Use the archivist agent. Update docs/SESSION_LOG.md with today's session summary. Tidy PROGRESS.md formatting." \
  >> "$LOG" 2>&1 || echo "Archivist timed out or hit cost cap" >> "$LOG"

echo "=== Overnight run complete at $(date) ===" | tee -a "$LOG"
```

Make executable:
```bash
chmod +x scripts/overnight.sh
```

(Windows: run via Git Bash or WSL.)

---

## Task 7.3: First overnight run

**Before running:**
1. Open `docs/PROGRESS.md`
2. In "Next priorities", confirm at least 2 tasks are marked READY (not BLOCKED, not NEEDS DESIGN)
3. Pick tasks that are independent (don't require human decisions)

**Run:**
```bash
bash scripts/overnight.sh
```

(Or kick off via Windows Task Scheduler at 11pm.)

**The next morning:**
1. Check `logs/overnight-YYYYMMDD-HHMM.log` — did anything fail?
2. Read `docs/PROGRESS.md` "Recent activity" — what did the agents accomplish?
3. Read `docs/REVIEW_NOTES.md` — any BLOCKER findings?
4. Check the new worktree branches: `git branch -a`
5. Review and merge to main: open the branches, play the changes, then merge if good.

---

## Task 7.4: Schedule overnight (optional)

**Windows Task Scheduler:**
1. Open Task Scheduler
2. Create Basic Task → "THE LINE Overnight"
3. Trigger: Daily at 11:00 PM
4. Action: Start a program → `C:\Program Files\Git\bin\bash.exe`
5. Arguments: `-c "cd /c/Users/joshs/Desktop/datamaker/the-line && bash scripts/overnight.sh"`
6. Conditions: only run when computer is idle for 10 minutes

---

# Appendix A: Prompt Templates

> Save these in your head. Use them daily.

## A.1: Generic builder prompt

```
> Use the builder agent. Read docs/DESIGN.md §<section> and docs/PROGRESS.md.
>
> Implement <feature>:
> 1. <specific requirement>
> 2. <specific requirement>
> 3. <specific requirement>
>
> Write Vitest tests for <specific things>.
> Run pnpm test.
> If visible: write Playwright E2E.
> Update docs/PROGRESS.md.
> Commit on a worktree named feat-<short-name>.
```

## A.2: Generic planner prompt

```
> Use the planner agent. Read docs/DESIGN.md and any relevant code.
>
> Question: <specific design question>
>
> Output:
> - 2-3 options with explicit tradeoffs
> - Your recommendation with reasoning
> - Save as docs/ADRs/NNN-<short-name>.md
>
> Do not modify code.
```

## A.3: Generic reviewer prompt

```
> Use the reviewer agent. Review the <branch-name> branch against main.
> Read docs/DESIGN.md.
>
> Categorize each finding: BLOCKER | NEEDS-CHANGE | NIT | OK-AS-IS.
> Write to docs/REVIEW_NOTES.md as a dated section.
```

## A.4: Generic balancer prompt

```
> Use the balancer agent. Read docs/DESIGN.md §<section>.
>
> Run: pnpm sim:balance --runs <N> --seed-range 1-<N>
>
> Tune <variable> in <data file> to hit target: <metric> = <value>.
>
> Document results in PROGRESS.md cost ledger.
> Commit on data-<short-name>.
```

---

# Appendix B: Daily Workflow

## Morning (10 minutes)

1. Open `docs/PROGRESS.md`. Read "Recent activity" section.
2. Read `docs/REVIEW_NOTES.md` for any BLOCKER findings.
3. Check `git branch -a` for new worktrees from overnight.
4. For each new branch: `git checkout <branch>`, `pnpm dev`, play it. Decide: merge, request changes, or kill.
5. Merge approved branches: `git checkout main && git merge <branch> && git push`.

## Working session (1–2 hrs)

1. Open `claude` at the project root.
2. Pick a task from "Next priorities" in PROGRESS.md.
3. Use the appropriate prompt template from Appendix A.
4. While Claude works: review code as it writes, intervene if you see drift.
5. After completion: review the diff, run tests, decide on commit/merge.

## Evening (5 minutes, before overnight)

1. Open `docs/PROGRESS.md`.
2. Mark 2–3 of the next priorities as READY (or NEEDS DESIGN if blocked).
3. Trigger overnight: `bash scripts/overnight.sh` or let Task Scheduler do it.
4. Close laptop.

---

# Appendix C: Troubleshooting

## "Claude isn't reading DESIGN.md"

Check `CLAUDE.md` instructs reading it at session start. If yes, ensure DESIGN.md is at `docs/DESIGN.md` not project root. If still failing, your Claude Code version may be stale: `npm install -g @anthropic-ai/claude-code@latest`.

## "Overnight run blew through budget"

Check the log. Likely the builder got stuck in a loop. Lower `--max-cost-usd` to $15, set tighter timeouts, and add stricter "exit cleanly when blocked" instructions to the prompt.

## "Worktree branches piling up unmerged"

You're not reviewing fast enough. Either reduce overnight task count or schedule a daily 30-min review block. Don't let the worktree count exceed 5 — review bandwidth bottleneck.

## "Tests passing but the game feels broken"

Tests verify mechanics, not feel. Add manual playtest entries to `docs/PLAYTEST_NOTES.md` and address feel issues with planner-led design refinements, not just builder code fixes.

## "Save schema break — players lost progress"

CRITICAL. You skipped a migration. Roll back the offending update immediately. Add the missing migration. Test it with mocked old saves. Re-deploy. Apologize publicly. Do not let this happen twice.

## "Claude rewrote DESIGN.md autonomously"

Check `.claude/settings.json` — `Write(docs/DESIGN.md)` should be in the deny list. Revert from git. Re-strengthen the deny rule. This should never happen if Phase 2 was set up correctly.

## "I'm out of ideas / stuck on a hard design problem"

Open a planner session. Use the prompt:

```
> Use the planner agent. Read docs/DESIGN.md and docs/PROGRESS.md.
> Current problem: <describe>
> What I've tried: <list>
>
> Brainstorm 5 different approaches I haven't tried. For each:
> - The core idea (1 sentence)
> - Why it might work
> - The biggest risk
>
> Then recommend which one to try first. Reasoning explicit.
```

This unsticks more than you'd think.

---

## Final note

This document is the operational manual. It assumes you trust the build plan in `THE_LINE_BUILD_PLAN.md` for the why, and use this file for the how. Keep both files alive. Update them as you learn.

The pattern: design → plan → dispatch → review → merge → repeat. Hold to it. Ship in 10 weeks.
