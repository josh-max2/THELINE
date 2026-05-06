import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  hasSeenTutorial,
  markTutorialSeen,
  resetTutorialSeen,
} from '../../src/lib/tutorialState';

describe('tutorialState', () => {
  beforeEach(() => {
    resetTutorialSeen();
  });

  afterEach(() => {
    resetTutorialSeen();
  });

  test('returns false on a fresh storage', () => {
    expect(hasSeenTutorial()).toBe(false);
  });

  test('markTutorialSeen → hasSeenTutorial returns true', () => {
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);
  });

  test('reset clears the flag', () => {
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);
    resetTutorialSeen();
    expect(hasSeenTutorial()).toBe(false);
  });

  test('survives across two reads (localStorage persistence)', () => {
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);
    expect(hasSeenTutorial()).toBe(true);
  });

  test('returns true (defensive) when localStorage throws', () => {
    const real = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('private mode');
      },
    });
    try {
      // Defensive default — never block boot when storage is unavailable.
      expect(hasSeenTutorial()).toBe(true);
      // markTutorialSeen / resetTutorialSeen also no-op without throwing.
      expect(() => markTutorialSeen()).not.toThrow();
      expect(() => resetTutorialSeen()).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: real,
      });
    }
  });

  test('uses a versioned key (so a v2 redesign can re-show)', () => {
    markTutorialSeen();
    const keys = Object.keys(globalThis.localStorage ?? {});
    expect(keys.some((k) => k.includes('tutorial-seen-v1'))).toBe(true);
  });
});

// silence vi unused import warning if not used elsewhere
void vi;
