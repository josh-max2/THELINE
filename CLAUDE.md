# Claude Operating Instructions for THE LINE

## Read at session start (in this order)

1. `docs/DESIGN.md` — the canonical design doc. NEVER contradict it without flagging.
2. `docs/PROGRESS.md` — current build state and next priorities.
3. `docs/REVIEW_NOTES.md` — open issues from the reviewer agent.

## Hard rules

1. **Never modify `docs/DESIGN.md` autonomously.** Propose changes in PROGRESS.md under "Open questions for human"; the human decides.
2. **All work happens in worktrees.** Never commit directly to `main`. Use `claude --worktree feat-<name>` or `isolation: worktree` in subagent calls.
3. **Tests must pass before commit.** Run `pnpm test` (Vitest) and `pnpm test:e2e` (Playwright) on changes. If they fail, fix or document and exit.
4. **Update `docs/PROGRESS.md` before ending any session.** Use the template in section 9 of `THE_LINE_BUILD_PLAN.md`.
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

## Audit discipline (project-specific — non-negotiable)

You ARE the auditor of your own work. Don't trust silent success.

1. **Audit at task boundaries.** Stop after every meaningful unit of work — not just at the end of a session. Verify what actually happened, not what you intended to happen.
2. **Screenshot visible changes.** Use `node scripts/screenshot.mjs <url> <out-path>`. The script is wired up (Playwright + Chromium). Save to `docs/screenshots/YYYY-MM-DD-<short-name>.png`.
3. **"Tests pass" is not "feature works."** Compilation success is a floor, not proof. For visual features the bar is: passing test PLUS a screenshot showing the rendered output looks right.
4. **Read what you just wrote.** When you create or edit a config file, JSON, or critical source file, Read it back to confirm the on-disk state matches what you intended.
5. **Run what you said you'd run.** If you claim `pnpm dev` works, prove it: start it, hit localhost, screenshot. Don't claim and move on.
6. **State divergences from the build plan explicitly.** Write them in PROGRESS.md "Recent activity" — never silently substitute. Example: "Pinned Phaser to ^3.90 instead of latest because the build plan assumes v3 idioms."
7. **Every screenshot gets logged.** One-line entry in PROGRESS.md "Screenshot log" section.
8. **Before declaring done, ask: would I bet money this works?** If no, do another audit pass.

## Test before claiming done

A task is "done" only after:
- [ ] Code compiles (`pnpm build` if applicable, otherwise `tsc --noEmit`)
- [ ] Vitest passes (`pnpm test`)
- [ ] Playwright E2E for the affected feature passes (`pnpm test:e2e`)
- [ ] PROGRESS.md updated (Recent activity + Next priorities + Screenshot log if visual)
- [ ] If visual change: screenshot saved to `docs/screenshots/YYYY-MM-DD-<feature>.png`
- [ ] You took 60 seconds to ask: "would I bet money this works?"
