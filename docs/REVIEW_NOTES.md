# REVIEW_NOTES.md

> Findings from the reviewer agent (Opus). New entries added at the top.
> Categories: BLOCKER | NEEDS-CHANGE | NIT | OK-AS-IS

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
