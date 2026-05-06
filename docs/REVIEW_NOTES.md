# REVIEW_NOTES.md

> Findings from the reviewer agent (Opus). New entries added at the top.
> Categories: BLOCKER | NEEDS-CHANGE | NIT | OK-AS-IS

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
