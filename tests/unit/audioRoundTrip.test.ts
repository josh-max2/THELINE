// Round-trip integration test for the Task 5.6 audio-prefs pipeline.
// Toggle mute → SaveSystem.flushSave → fresh SaveSystem.init →
// audioStore.setState restores muted=true. Catches the "data written but
// no consumer reads it" class of bug (3rd-time-charm pattern).

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { InMemoryStorage } from '../../src/lib/saveStorage';
import { SaveSystem } from '../../src/systems/SaveSystem';
import { audioStore } from '../../src/lib/audioStore';
import { DEFAULT_MASTER_VOLUME } from '../../src/lib/audioMath';

describe('audio prefs end-to-end round-trip', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    audioStore.reset();
  });

  afterEach(() => {
    audioStore.reset();
  });

  test('mute → flushSave → reload → audioStore reflects muted=true', async () => {
    const sess1 = new SaveSystem(storage);
    await sess1.init();
    audioStore.setMuted(true);
    sess1.updateHubState({ audioMuted: audioStore.muted });
    await sess1.flushSave();

    audioStore.reset();
    expect(audioStore.muted).toBe(false);

    const sess2 = new SaveSystem(storage);
    const data = await sess2.init();
    audioStore.setState({ muted: data.hubState.audioMuted, volume: data.hubState.audioVolume });

    expect(audioStore.muted).toBe(true);
    expect(audioStore.volume).toBe(DEFAULT_MASTER_VOLUME);
  });

  test('custom volume survives reload', async () => {
    const sess1 = new SaveSystem(storage);
    await sess1.init();
    audioStore.setVolume(0.25);
    sess1.updateHubState({ audioVolume: audioStore.volume });
    await sess1.flushSave();

    audioStore.reset();
    const sess2 = new SaveSystem(storage);
    const data = await sess2.init();
    audioStore.setState({ muted: data.hubState.audioMuted, volume: data.hubState.audioVolume });

    expect(audioStore.volume).toBeCloseTo(0.25);
  });

  test('v1 save (no audio fields) migrates to defaults via v3→v4', async () => {
    storage.setRaw({ saveVersion: 1, totalSalvage: 0, lastSaved: 'x' });
    const sess = new SaveSystem(storage);
    const data = await sess.init();
    expect(data.hubState.audioMuted).toBe(false);
    expect(typeof data.hubState.audioVolume).toBe('number');
  });
});
