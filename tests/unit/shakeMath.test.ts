import { describe, expect, test } from 'vitest';
import {
  SHAKE_PRESETS,
  combineShake,
  shakeTierForKill,
  MAX_SHAKE_INTENSITY,
} from '../../src/lib/shakeMath';

describe('shakeTierForKill', () => {
  test('low-hp enemies → smallKill', () => {
    expect(shakeTierForKill({ hp: 5 })).toBe('smallKill');
    expect(shakeTierForKill({ hp: 29 })).toBe('smallKill');
  });

  test('mid-hp enemies → bigKill', () => {
    expect(shakeTierForKill({ hp: 30 })).toBe('bigKill');
    expect(shakeTierForKill({ hp: 100 })).toBe('bigKill');
  });

  test('boss flag overrides hp', () => {
    expect(shakeTierForKill({ hp: 1, isBoss: true })).toBe('bossKill');
    expect(shakeTierForKill({ hp: 400, isBoss: true })).toBe('bossKill');
  });
});

describe('combineShake', () => {
  test('keeps the louder of active vs requested', () => {
    const small = SHAKE_PRESETS.smallKill;
    const big = SHAKE_PRESETS.bigKill;
    expect(combineShake(small, big)).toBe(big);
    expect(combineShake(big, small)).toBe(big);
  });

  test('equal-intensity → keeps active (no restart spam)', () => {
    const a = { ...SHAKE_PRESETS.smallKill };
    const b = { ...SHAKE_PRESETS.smallKill };
    expect(combineShake(a, b)).toBe(a);
  });
});

describe('SHAKE_PRESETS', () => {
  test('intensities are monotonically non-decreasing across tiers', () => {
    const tiers = ['hit', 'smallKill', 'bigKill', 'explosion', 'bossKill'] as const;
    for (let i = 1; i < tiers.length; i++) {
      expect(SHAKE_PRESETS[tiers[i]].intensity).toBeGreaterThanOrEqual(
        SHAKE_PRESETS[tiers[i - 1]].intensity,
      );
    }
  });

  test('boss kill ≤ MAX_SHAKE_INTENSITY (sanity cap on the cap)', () => {
    expect(SHAKE_PRESETS.bossKill.intensity).toBeLessThanOrEqual(MAX_SHAKE_INTENSITY);
  });
});
