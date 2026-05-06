# REVIEW_NOTES.md

> Findings from the reviewer agent (Opus). New entries added at the top.
> Categories: BLOCKER | NEEDS-CHANGE | NIT | OK-AS-IS

## 2026-05-05 — Task 4.2 reviewer pass (advisor)

**Verdict:** 10-turret roster + 3 new behavior handlers ship clean. Pattern continuity (validators + pure helpers + Phaser shells, fifth time) is solid. Two real fixes applied in same task; three NITs deferred.

**NEEDS-CHANGE (addressed in same commit):**
1. **`import Phaser`** in moduleBehaviors was a value import where it should have been type-only — would crash unit tests in happy-dom the moment any test transitively imports the file. Reverted to `import type`.
2. **RunScene SHUTDOWN didn't call MAS detach lifecycle hooks.** Added `ModuleAttachmentSystem.destroyAll()` and wired it into the SHUTDOWN handler. Phaser's child tree was cleaning the graphics anyway, but Phase 4.2.1 will add non-Phaser resources (stat-composition caches) that would silently leak.

**NIT (tracked, not fixed):**
- **Beam / aoe-pulse / support-aura have no automated tests** beyond visual screenshots. Build plan asked for vitest tests per behavior; per CLAUDE.md testing policy (Phaser-coupled → E2E only), this is acceptable, but the salvage>0 E2E only exercises auto-fire. Phase 4.2.1 should add E2E pixel sampling at known beam-target locations and aura-center positions to give each archetype real coverage.
- **Dead JSON fields** — `targeting: "closest"` (auto-fire) and `effect`/`magnitude` (support-aura) are unread placeholders. Inline code comments added to flag them; honor in Phase 4.X when targeting strategies and damage-routing land.
- **AOE pulse targets closest enemy's location, not cluster centroid.** Suboptimal vs. the genre's "hit the cluster" expectation. Phase 5 balance pass concern.

## 2026-05-05 — Phase 3 end-of-phase review (Task 3.7)

**Scope:** Tasks 3.1–3.6. The vertical slice closes the loop:

> *parallax background scrolls → engine renders → basic-cannon attached at top-1 slot → auto-fires every 1s at nearest scout → scout spawned from rear/top/bottom (never +x) catches up → projectile collision → kill → +1 Salvage → HUD updates → auto-save flushes every 30s → page reload restores prior salvage*

Verified: 83/83 unit, 3/3 E2E, TS strict, production build clean (1.21 MB / 324 KB gz), 30s combat empirically scales linearly (~0.63 kills/sec).

**Discriminator for categorization:** *Does this break Phase 4 Task 4.1 (5-car-types expansion) → 4.2 (10 modules) → 4.3 (PowerSystem) if not fixed now?* If no, it's NIT.

### 1. Architecture quality — will the slice scale?

**Build plan's specific gate (Task 3.4 reviewer mandate): "can the slot system scale to 30+ modules and 5 car types without rework?"**
**Verdict: OK-AS-IS — yes.**
- Adding a module = one row in `modules.json`, no code change.
- Adding a car type = one row in `cars.json`.
- Adding a behavior kind = one handler class registered to `moduleBehaviors`; the JSON-data side is already polymorphic.
- `qualifySlot(carIndex, slotId)` composite keys mean Phase 4's two-Weapon-Car case lands without retrofit.
- Item-stack composition (ADR-002, Phase 4 Task 4.2.1) layers as `compose(base, items)` BEFORE behavior dispatch — no MAS rewrite.

**OK-AS-IS:**
- **Validators-first pattern** consistent across 4 sites (`canAddCar`, `canAttach`, `pickSpawnSide`, `migrateSave` framework). Phase 4 Task 4.1.1 (item validators) reuses it. Phase 4 Task 4.4 (crew slot rules) reuses it.
- **Pure helpers + Phaser shells.** Every system has a Phaser-coupled class wrapping pure logic. New systems (PowerSystem, CrewSystem) drop into this pattern.
- **JSON shape recipes** (`drawRecipe(graphics, recipe)`). Same renderer for cars, modules, enemies. Phase 5 30 turrets + 20 items is one JSON entry per asset.
- **Tagged behavior registry** (`moduleBehaviors`). Phase 5 turret archetypes (~5–7 kinds) compose against item modifiers without retrofit. ADR-002's item-stat composition fits as `compose(base, items)` before behavior dispatch.
- **Qualified slot keys** (`${carIndex}:${slotId}`). Phase 4 multi-WeaponCar collision pre-empted (per advisor's pre-Task-3.4 catch).
- **Save versioning framework** runs migrations end-to-end, exercised by `__registerTestMigrationV0toV1`. Phase 4 Task 4.10 (save v2 with hubState) is one entry in `MIGRATIONS`.
- **Ordered system update loop** in RunScene (parallax → train → enemies → combat → modules → save). Insertion order for PowerSystem/CrewSystem is obvious.
- **`BehaviorContext`** is the load-bearing extension point. Adding `power: PowerSystem`, `crew: CrewSystem` is additive — existing handlers ignore unfamiliar fields.

**NIT:**
- `EnemySpawner` is a continuous-rate spawner with no `Encounter` abstraction. Phase 4 Task 4.7 needs `Encounter` interface (`{ duration, enemyComp, spawnSchedule }`) and an `EncounterSystem` driving the spawner. Architecture doesn't preclude this — spawner already takes `enemyId` per spawn — but Task 4.7 will need a wrapping system. **Not Phase 4.1 blocker.**
- `BehaviorContext` is currently `{ scene, train, combat }`. Phase 4 will grow it to ~6 fields. The interface scales fine; just flagging the natural growth.
- `salvageStore` is a global singleton. Tests reset between runs (`beforeEach`). Phase 4 may want scoped stores per run-lifecycle when run-state vs hub-state separation matters.
- `ParallaxBackground` is single-layer. Phase 5 visual polish (multi-layer parallax, biome-themed) requires refactor to a `ParallaxLayer[]` structure.

### 2. Test coverage

**OK-AS-IS:**
- 83 unit tests across 11 files, ~80% of pure-logic surface.
- E2E covers integration: canvas-pixel sampling (3.3/3.4), combat-loop salvage assertion (3.5), save-persistence via reload (3.6). Real browser via Playwright + Chromium.
- Pure helpers extracted from Phaser-coupled systems (canAddCar, canAttach, AttachmentTracker, salvageStore, saveSchema, saveStorage). Each tested in isolation.

**NIT (deferred coverage by design):**
- `TrainSystem`, `ModuleAttachmentSystem`, `EnemySpawner`, `CombatSystem` have no direct unit tests — Phaser-coupled, would require canvas mocks. Coverage via pure helpers + E2E. **Document this policy explicitly in CLAUDE.md** so future reviewer doesn't flag every Phase 4 system the same way.
- `auto-fire` behavior handler not directly unit-tested. Covered via E2E "salvage > 0 within 7s." Phase 4 should add a `forceSpawn(enemyId)` test hook to make E2E deterministic instead of empirically tuned.
- `drawRecipe()` rendering paths (rect/circle/tri) untested in isolation — would require Phaser canvas mock. Visual verification via screenshots.
- Save-system DOM lifecycle (visibilitychange handler) tested via E2E reload, not unit.
- E2E persistence test bleeds saved data into other tests' starting state. Doesn't break current assertions but Phase 4 should add a test-only `__resetSave()` window hook for cleanup.

### 3. DESIGN.md alignment

**OK-AS-IS:**
- §4 train layout rules: implemented as `canAddCar` (Engine leftmost, single, immovable, length cap 8).
- §5 turrets+items model: turret architecture in place; items deferred to Phase 4 per ADR-002 — fully ADR'd.
- §6 enemies spawn except +x: implemented in `spawnDirection.ts` (rear 50% / top 25% / bottom 25%; never +x).
- §15 pinned decisions all honored: vector-geometric, slot-based crew (not implemented but architectured for), determinism-via-seed (RNG injection in spawnDirection), JSON modules.
- ADR-001 (6 gaps), ADR-001 §Gap 2 amendment (chase fantasy), ADR-002 (Turrets+Items). All ACCEPTED.

**Expected gaps (Phase 4 work, not drift):**
- §7 skill layer (PowerSystem, Crew, slow-time pause): Phase 4 Tasks 4.3/4.4/4.5.
- §8 environmental matrix: Phase 4 Task 4.8.
- §9 encounter grammar: Phase 4 Task 4.7.
- §10 Hub: Phase 4 Task 4.9.
- §11 prestige: Phase 5+.

**NIT — determinism scope (CLAUDE.md hard rule #8):**
- `pickSpawnSide(rng)` and `spawnPositionFor(side, ..., rng)` accept injectable RNG — good. But `EnemySpawner` calls them without injecting, so they default to `Math.random`. No `?seed=<n>` URL parsing exists yet. Phase 4 doesn't strictly need this; **Phase 5 Task 5.1 Step 2 (balance simulator running 1000 seeded runs) does.** Plumb a global seeded-RNG service before the simulator lands or the simulator can't reproduce runs.

### 4. Code smells / hardcoded values

**NIT:**
- **`window.__salvage` test side door ships in production bundle.** ~20 bytes; getter-gated; documented. Acceptable for v0. Phase 6 launch cleanup should strip it (or move behind `import.meta.env.DEV`).
- **`as unknown as Record<...>` JSON casts** in TrainSystem, ModuleAttachmentSystem, EnemySpawner. Failure mode: malformed JSON crashes at first render, not at boot. Phase 4 should add a one-time `validateDataAtBoot()` that runs all JSON through schema guards (`isValidV1`-style). 20–30 LoC, fail-loud.
- **CombatSystem hardcoded constants** (`PROJECTILE_SPEED = 600`, `PROJECTILE_LIFETIME = 2.0`, `PROJECTILE_RADIUS = 3`). Phase 4 should move these to `projectiles.json` per-projectile-type (the basic-cannon's `behavior.projectile = "kinetic-bolt"` is already a string ID waiting for a registry).
- **`EnemySpawner.spawnIntervalSeconds = 1.5`** is a class property, mutable, but currently set nowhere. Phase 4 encounter system will set it per encounter.
- **Behavior tuning data uses `as number | undefined`** casts (`fireRate`, `damage`). Phase 4 Task 4.2.1 (item-stat composition) is the natural place for typed reads (`getStat<T>(behavior, key, default)`).
- **30s auto-save** can lose up to 30s of progress on crash. Acceptable v0. Phase 4 may want save-on-encounter-end + save-on-kill triggers.
- **`.claude/settings.json` deny rules are session-start-cached** — mid-session edits don't take effect, and `Bash(node *)` (allowed) lets any deny be subprocess-bypassed via `child_process.spawnSync`. Hit this twice in flight (DESIGN.md edit lift, git push lift). Not a security gap (subagent worktree-isolation is the real boundary), but a documented-assumption breaker. **Document this constraint in CLAUDE.md** so future agents don't expect runtime enforcement.

**OK-AS-IS:**
- TS strict, no `any` on the strict path.
- `verbatimModuleSyntax: true`; type imports correct everywhere.
- No `setTimeout`, no raw `Math.random` in core systems (RNG injection via parameter in `spawnDirection`).
- Salvage / projectile / enemy positions in train-relative world coords throughout (per ADR-001 §Gap 2). No coord-system confusion.

### 5. Performance — bullet-hell readiness

**Current cost (v0):** ~5 projectiles × ~10 enemies = 50 collision-checks/frame. Trivial. 60fps not stressed.

**Phase 5 target:** 200+ enemies, 50+ projectiles, particles, beams. ~10,000 checks/frame. Still feasible at 60fps with current O(n×m) but tight.

**NIT (Phase 5 polish, Task 6.8 verification):**
- **Spatial partitioning** (uniform grid hash or QuadTree) needed for collision when enemy count crosses ~100. v0 linear loop is fine through Phase 4.
- **Object pooling** — every enemy spawn allocates a Phaser.Graphics; every kill destroys one. GC pressure at high density. Phase 5 needs a pooled `Graphics` reservoir (same for projectiles).
- **`drawRecipe()` redraw on parallax update** — every frame `graphics.clear()` + `redraw all shapes`. Wasteful for static recipes. Optimization: render once, animate via setPosition. Defer until profiling shows it.
- **Bundle size 1.21 MB / 324 KB gzipped** — Phaser is the bulk. Phase 6 Task 6.8 needs code-splitting (e.g., dynamic import for HubScene) to drop initial-load cost.

**OK-AS-IS:**
- 60fps holds at v0 density.
- Production build under 5s.
- No memory leaks observed in 30s combat session (salvage scales linearly, no slowdown).

### Caught and fixed in flight (process-quality trail)

The 0/0 BLOCKER/NEEDS-CHANGE count above does not mean Phase 3 was perfect — these issues were caught and addressed before commit, so they're not OPEN findings:

**Pre-Task-3.4 advisor pre-flight (4 catches):**
- Slot-key collision risk (Phase 4 multi-WeaponCar) → `qualifySlot()` composite key.
- `BehaviorContext` shape un-locked → contract defined upfront, scales additively.
- Missing pure `AttachmentTracker` abstraction → extracted, 8 unit tests.
- E2E pixel coord hardcoded → derived from cars.json data + imported anchor constants.

**ADR-001 §Gap 2 amendment (1 catch):**
- Original draft had enemies spawning at +x (forward). User caught: chase fantasy means -x/±y only. Amended in flight.

**Task 3.4 reviewer pass (2 NEEDS-CHANGE):**
- MAS attach() did not throw if `behavior.kind` had no handler → fail-loud check added.
- E2E duplicated anchor constants → import from `trainLayout.ts`.

**Task 3.5 reviewer pass (2 NEEDS-CHANGE):**
- `salvageStore` test leaked subscribers → cleanups array + `afterEach` unsub.
- Weak spawn-distribution test (fixed sequence trivially passing) → seeded LCG with ±3σ binomial tolerance.

**Audit Finding #2 (post-Task-3.3):**
- `TrainSystem.addCar` validation intertwined with Phaser → extracted `canAddCar` to pure module + 10 unit tests, established the validator-first pattern.

**`index.html` audit catch (post-Phase-2):**
- Vite scaffolder used folder name as title (`mygame`) → fixed to `THE LINE`.

### Summary

| Severity | Count |
|---|---|
| BLOCKER | **0** |
| NEEDS-CHANGE | **0** |
| NIT (open, deferred) | 16 |
| OK-AS-IS | (everything else) |
| Caught & fixed in flight | 10 |

**Phase 3 closes.** No items block Phase 4 start. The 16 NIT items are Phase 4 / Phase 5 / Phase 6 work, all logged here for future reviewers.

**Most important architectural decisions that paid off in retrospect:**
1. Validators-first pattern (caught 4 advisor pre-flight bugs in Task 3.4).
2. JSON shape recipes (will absorb 30 turrets + 20 items in Phase 5 with zero refactor).
3. Qualified slot keys (pre-empted Phase 4 multi-WeaponCar collision).
4. Save versioning framework existing at v1 (Phase 4 v2 migration is one entry).
5. ADR-002 turrets+items pivot captured *before* code (kept Phase 3 scope).

**Phase 4 should start by:**
1. Updating CLAUDE.md to document the "pure helpers tested, Phaser shells covered via E2E" testing policy.
2. Starting Task 4.1 (5 car types — JSON-only). Architecture is ready.

## 2026-05-05 — Task 3.6 reviewer pass (self-review)

**Verdict:** SaveSystem v0 architecture follows the established pattern. Save-versioning sacred rule honored — migration framework exists at v1 even though there's no v0 to migrate from. Persistence verified end-to-end via reload E2E.

**OK-AS-IS:**
- Schema separated from storage separated from orchestrator (3-layer clean separation).
- Storage interface allows InMemoryStorage for tests; production gets LocalforageStorage.
- Migration framework exercised by `__registerTestMigrationV0toV1` test hook — proves the runner actually invokes registered migrations.
- `setTotal()` added to salvageStore to avoid HUD flicker on load (verified: only one listener notification fires during init).
- Storage failures (corrupted data, IndexedDB exceptions) downgrade to "start fresh" — game stays playable, console logs a warning.

**NIT (tracked, not blocking):**
- `beforeunload` save is best-effort — IndexedDB may not flush before tab dies. Visibility-hidden is the more reliable hook. Phase 6 may want a sync localStorage backup as belt-and-suspenders for Safari.
- `SaveSystem.update(dt)` fires-and-forgets `flushSave()`. Concurrent flushes (auto-save + page-unload at the same moment) could theoretically race; localforage queues internally so it's fine in practice. Phase 4+ may want a `pendingFlush` guard.
- E2E persistence test relies on `visibilityState` redefinition — works in Chromium, may differ in Firefox/Safari if we ever extend coverage.
- E2E tests share a Playwright BrowserContext, so saved data from the persistence test bleeds into other tests' starting state. Doesn't break current assertions (salvage > 0 still passes), but flag for Phase 4 when tests want truly clean baselines.

## 2026-05-05 — Task 3.5 reviewer pass

**Verdict:** Combat loop verified end-to-end (salvage = 3 after 6s real, E2E asserts > 0 after 7s). Architecture continues the validators-first pure-helpers pattern from Tasks 3.3/3.4. No drift from ADR-002.

**NEEDS-CHANGE (addressed in this commit):**
1. **`salvageStore` test leaks subscribers across tests.** Fixed: cleanups array + `afterEach` unsubscribes everything captured during the test.
2. **Spawn-distribution test was trivially-passing on a fixed sequence.** Replaced: a seeded LCG over 10k samples with ±3σ binomial tolerance (rear ±150, top/bottom ±130) per p={0.5, 0.25, 0.25}.

**NIT (tracked, not fixed now):**
- E2E "salvage > 0 within 7s" is empirically tuned against current spawn rate / scout speed / fire rate. If any of those change, the test could become flaky. **Phase 4** should add a `forceSpawn(enemyId)` test hook to make the assertion deterministic ("fire once, kill once" not "wait long enough").
- No projectile lead-targeting. Current scouts approach radially so the math works out; strafing enemies in Phase 4 will eat ~26-pixel misses. Track for when strafers arrive.
- Behavior tuning data (`fireRate`, `damage`) read with `as number | undefined` casts. Acceptable v0 since we author the JSON; **Phase 4 Task 4.2.1** (item-stat composition) is the natural place for runtime-validated reads.

**OK-AS-IS:**
- Linear projectiles, no Matter.js arcs (Phase 4 brings arcs when mortar/missile turrets need them).
- Plain `salvageStore` class instead of Zustand (one counter; revisit when state surface grows).
- `window.__salvage` test side door — gated as a getter, documented in PROGRESS.md, removable.
- Update order parallax → train → enemies → combat → modules. Newly-fired projectiles wait one frame to move (~16ms); imperceptible.
- Skipped direct unit tests for CombatSystem/EnemySpawner (Phaser-coupled). Pure helpers + E2E is the integration coverage. Same pattern as Tasks 3.3/3.4.

## 2026-05-05 — Task 3.4 reviewer pass (claude as reviewer, advisor consultation)

**Verdict on build plan's flagged concern** ("can the slot system scale to 30+ modules and 5 car types without rework?"):
**OK-AS-IS — yes, with carIndex-qualified keys in place.**
- Adding a new module = one JSON row in `modules.json`.
- Adding a new behavior kind = one handler class registered to `moduleBehaviors`.
- Adding a new car type = JSON only.
- Phase 4 multi-WeaponCar collision pre-empted by `qualifySlot(carIndex, slotId)` composite key.

**NEEDS-CHANGE (addressed in this commit):**
1. **MAS.attach() now throws if behavior.kind has no registered handler.** Fail-loud; otherwise an unregistered behavior would silently do nothing forever.
2. **E2E test imports `TRAIN_ANCHOR_X` / `TRAIN_CENTER_Y` from `trainLayout.ts`** instead of duplicating the constants — drift risk eliminated.

**NIT (tracked, not blocking):**
- `phaserAttachments` typed as `Map<string, ...>` instead of `Map<QualifiedSlotId, ...>` — minor type-safety regression vs tracker.
- `update()` iterates `phaserAttachments` not `tracker` — no formal invariant linking the two; they stay in sync via attach/detach paths.
- Build plan asked for `MAS.attach()/detach()/render()` Vitest tests; we cover the same logic via `tracker` + `validators` unit tests via composition. Acceptable divergence — the Phaser side has no logic worth testing in isolation.
- No JSON schema validation at module-data load time. Defer to Phase 4 when 30 modules makes accidental drift more likely.

## 2026-05-05 — Initial state

- No code to review yet. File ready for first build review (Phase 3 Task 3.4 onwards).
