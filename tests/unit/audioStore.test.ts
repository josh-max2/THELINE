import { afterEach, describe, expect, test } from 'vitest';
import { audioStore } from '../../src/lib/audioStore';
import { DEFAULT_MASTER_VOLUME } from '../../src/lib/audioMath';

describe('audioStore', () => {
  afterEach(() => {
    audioStore.reset();
  });

  test('starts at default volume + unmuted', () => {
    expect(audioStore.volume).toBe(DEFAULT_MASTER_VOLUME);
    expect(audioStore.muted).toBe(false);
  });

  test('setMuted toggles + notifies', () => {
    const seen: boolean[] = [];
    const unsub = audioStore.subscribe((s) => seen.push(s.muted));
    audioStore.setMuted(true);
    audioStore.setMuted(false);
    unsub();
    expect(seen).toEqual([true, false]);
  });

  test('setMuted is idempotent (no listener spam)', () => {
    let calls = 0;
    const unsub = audioStore.subscribe(() => calls++);
    audioStore.setMuted(false); // already false
    audioStore.setMuted(false);
    unsub();
    expect(calls).toBe(0);
  });

  test('setVolume clamps to [0,1]', () => {
    audioStore.setVolume(2);
    expect(audioStore.volume).toBe(1);
    audioStore.setVolume(-1);
    expect(audioStore.volume).toBe(0);
    audioStore.setVolume(0.3);
    expect(audioStore.volume).toBeCloseTo(0.3);
  });

  test('setState applies partial updates from save', () => {
    audioStore.setState({ muted: true });
    expect(audioStore.muted).toBe(true);
    expect(audioStore.volume).toBe(DEFAULT_MASTER_VOLUME);
    audioStore.setState({ volume: 0.7 });
    expect(audioStore.volume).toBeCloseTo(0.7);
    expect(audioStore.muted).toBe(true);
  });

  test('setState ignores invalid volume', () => {
    audioStore.setState({ volume: NaN });
    expect(audioStore.volume).toBe(DEFAULT_MASTER_VOLUME);
  });

  test('reset returns to defaults + notifies', () => {
    audioStore.setMuted(true);
    audioStore.setVolume(0.1);
    let saw = false;
    const unsub = audioStore.subscribe(() => (saw = true));
    audioStore.reset();
    unsub();
    expect(audioStore.muted).toBe(false);
    expect(audioStore.volume).toBe(DEFAULT_MASTER_VOLUME);
    expect(saw).toBe(true);
  });
});
