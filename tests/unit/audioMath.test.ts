import { describe, expect, test } from 'vitest';
import { DEFAULT_MASTER_VOLUME, SFX, effectiveGain } from '../../src/lib/audioMath';

describe('SFX catalog', () => {
  test('contains the v0 SFX ids', () => {
    expect(Object.keys(SFX).sort()).toEqual(['depart', 'fire', 'hit', 'kill', 'purchase']);
  });

  test('every entry has finite start hz + duration + peak gain', () => {
    for (const [id, d] of Object.entries(SFX)) {
      expect(Number.isFinite(d.startHz), id).toBe(true);
      expect(d.durationSec, id).toBeGreaterThan(0);
      expect(d.peakGain, id).toBeGreaterThan(0);
      expect(d.peakGain, id).toBeLessThanOrEqual(1);
    }
  });
});

describe('effectiveGain', () => {
  test('multiplies master × peak when not muted', () => {
    expect(effectiveGain({ masterVolume: 0.5, peakGain: 0.4, muted: false })).toBeCloseTo(0.2);
  });

  test('returns 0 when muted (regardless of master/peak)', () => {
    expect(effectiveGain({ masterVolume: 1, peakGain: 1, muted: true })).toBe(0);
  });

  test('clamps master into [0, 1]', () => {
    expect(effectiveGain({ masterVolume: 9, peakGain: 0.5, muted: false })).toBeCloseTo(0.5);
    expect(effectiveGain({ masterVolume: -3, peakGain: 0.5, muted: false })).toBe(0);
  });

  test('clamps peak into [0, 1]', () => {
    expect(effectiveGain({ masterVolume: 1, peakGain: 9, muted: false })).toBe(1);
    expect(effectiveGain({ masterVolume: 1, peakGain: -2, muted: false })).toBe(0);
  });
});

describe('DEFAULT_MASTER_VOLUME', () => {
  test('is in (0, 1) — sensible boot value', () => {
    expect(DEFAULT_MASTER_VOLUME).toBeGreaterThan(0);
    expect(DEFAULT_MASTER_VOLUME).toBeLessThan(1);
  });
});
