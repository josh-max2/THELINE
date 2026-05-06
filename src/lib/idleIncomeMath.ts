// Pure helpers for hub-idle salvage accrual. Per Task 5.8.
//
// While the player is away from the Hub, salvage trickles in at a fixed rate.
// Capped so a multi-day absence doesn't dump thousands at once (v0 cap = 4h).

/** 1 salvage per minute. Slow trickle so active play remains primary. */
export const IDLE_RATE_PER_SEC = 1 / 60;
/** Hard cap on accrual window — beyond this, more time-away earns nothing. */
export const IDLE_CAP_SEC = 4 * 60 * 60;
/** Convenience: max salvage per single hub-enter. */
export const IDLE_CAP_SALVAGE = Math.floor(IDLE_RATE_PER_SEC * IDLE_CAP_SEC);

/**
 * Compute integer-floor salvage accrued between `lastExitMs` and `nowMs`,
 * clamped to the IDLE_CAP_SEC window. Returns 0 for invalid / non-positive
 * inputs (defensive: a save with lastExitMs=0 / NaN returns 0 cleanly).
 */
export function accruedSalvage(lastExitMs: number, nowMs: number): number {
  if (!Number.isFinite(lastExitMs) || !Number.isFinite(nowMs)) return 0;
  if (lastExitMs <= 0) return 0; // never exited yet
  const elapsedMs = nowMs - lastExitMs;
  if (elapsedMs <= 0) return 0;
  const cappedSec = Math.min(elapsedMs / 1000, IDLE_CAP_SEC);
  return Math.floor(cappedSec * IDLE_RATE_PER_SEC);
}
