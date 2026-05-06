// Tiny wrapper around localStorage for the "first-run tutorial seen" flag.
// Per Task 5.7. NOT part of the save schema — this is per-browser UX state,
// not game progression, so a save schema migration is overkill. Localstorage
// (sync) is the right tool.
//
// Versioned key so a v1 → v2 redesign of the tutorial can re-show it.

const TUTORIAL_KEY = 'theline:tutorial-seen-v1';

export function hasSeenTutorial(): boolean {
  try {
    return globalThis.localStorage?.getItem(TUTORIAL_KEY) === 'true';
  } catch {
    // Privacy-mode Safari + a few other niches throw on localStorage access.
    // Default to "seen" so we never block boot on a tutorial in those cases.
    return true;
  }
}

export function markTutorialSeen(): void {
  try {
    globalThis.localStorage?.setItem(TUTORIAL_KEY, 'true');
  } catch {
    // Same as above — non-fatal.
  }
}

/** Test/debug hook — reset so the tutorial shows again next reload. */
export function resetTutorialSeen(): void {
  try {
    globalThis.localStorage?.removeItem(TUTORIAL_KEY);
  } catch {
    // No-op.
  }
}
