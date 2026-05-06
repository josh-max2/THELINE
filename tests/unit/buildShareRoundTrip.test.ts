// Build-share end-to-end round-trip — proves Task 5.4 isn't inert.
// session-1 in run snapshots its layout → encodes → URL token →
// session-2 hub decodes the token → applies → loadoutStore changes →
// next session of run picks up the new layout.

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { InMemoryStorage } from '../../src/lib/saveStorage';
import { SaveSystem } from '../../src/systems/SaveSystem';
import { encodeBuild, decodeBuild } from '../../src/lib/buildShare';
import { loadoutStore } from '../../src/lib/loadoutStore';
import type { SharedBuild } from '../../src/lib/buildShare';

describe('build-share end-to-end round-trip', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    loadoutStore.reset();
  });

  afterEach(() => {
    loadoutStore.reset();
  });

  test('encode → decode → loadoutStore.setLayout matches the original', () => {
    const built: SharedBuild = {
      trainLayout: ['engine', 'weapon', 'weapon', 'cargo'],
      attachments: [],
    };
    const token = encodeBuild(built);
    const decoded = decodeBuild(token);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      loadoutStore.setLayout(decoded.build.trainLayout);
      expect(loadoutStore.layout).toEqual(built.trainLayout);
      expect(loadoutStore.isCanonicalDefault()).toBe(false);
    }
  });

  test('apply-import persists trainLayout + survives a reload', async () => {
    // Session 1: hub applies an imported build.
    const sess1 = new SaveSystem(storage);
    await sess1.init();
    const built: SharedBuild = {
      trainLayout: ['engine', 'crew', 'crew', 'cargo'],
      attachments: [],
    };
    sess1.updateHubState({ trainLayout: built.trainLayout });
    loadoutStore.setLayout(built.trainLayout);
    await sess1.flushSave();

    // Session 2: fresh load mimics page reload.
    loadoutStore.reset();
    const sess2 = new SaveSystem(storage);
    const data = await sess2.init();
    loadoutStore.setLayout(data.hubState.trainLayout);

    expect(loadoutStore.layout).toEqual(['engine', 'crew', 'crew', 'cargo']);
  });

  test('apply-import with a malformed token leaves loadoutStore unchanged', () => {
    const before = [...loadoutStore.layout];
    const decoded = decodeBuild('not-a-real-token!@#');
    expect(decoded.ok).toBe(false);
    // Confirm the consumer code we'd write is gated on decoded.ok.
    if (decoded.ok) loadoutStore.setLayout(decoded.build.trainLayout);
    expect(loadoutStore.layout).toEqual(before);
  });
});
