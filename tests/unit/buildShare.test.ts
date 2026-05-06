import { describe, expect, test } from 'vitest';
import {
  BUILD_SHARE_QUERY_KEY,
  BUILD_SHARE_VERSION,
  buildTokenFromUrl,
  decodeBuild,
  encodeBuild,
  shareUrl,
  type SharedBuild,
} from '../../src/lib/buildShare';

const sampleBuild: SharedBuild = {
  trainLayout: ['engine', 'weapon', 'armor', 'crew', 'cargo'],
  attachments: [
    { carIndex: 0, slotId: 'engine-top-1', moduleId: 'basic-cannon', itemIds: ['rivet-rounds', 'auto-loader'] },
    { carIndex: 1, slotId: 'weapon-top-1', moduleId: 'flamethrower', itemIds: [] },
  ],
};

describe('encodeBuild + decodeBuild round-trip', () => {
  test('encodes to base64url-safe string (no +, /, =)', () => {
    const tok = encodeBuild(sampleBuild);
    expect(tok).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test('encode → decode is identity', () => {
    const tok = encodeBuild(sampleBuild);
    const r = decodeBuild(tok);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.build).toEqual(sampleBuild);
    }
  });

  test('encode is deterministic for equal inputs', () => {
    expect(encodeBuild(sampleBuild)).toBe(encodeBuild(sampleBuild));
  });

  test('handles empty attachments + minimal layout', () => {
    const minimal: SharedBuild = { trainLayout: ['engine'], attachments: [] };
    const tok = encodeBuild(minimal);
    const r = decodeBuild(tok);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.build).toEqual(minimal);
  });

  test('preserves item stack order', () => {
    const ordered: SharedBuild = {
      trainLayout: ['engine'],
      attachments: [
        { carIndex: 0, slotId: 'engine-top-1', moduleId: 'gatling', itemIds: ['a', 'b', 'c'] },
      ],
    };
    const r = decodeBuild(encodeBuild(ordered));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.build.attachments[0].itemIds).toEqual(['a', 'b', 'c']);
  });
});

describe('decodeBuild — error paths', () => {
  test('rejects empty / non-string', () => {
    expect(decodeBuild('').ok).toBe(false);
    // @ts-expect-error -- explicit malformed input
    expect(decodeBuild(null).ok).toBe(false);
    // @ts-expect-error -- explicit malformed input
    expect(decodeBuild(undefined).ok).toBe(false);
  });

  test('rejects non-base64url garbage', () => {
    const r = decodeBuild('!!!invalid!!!@@@');
    expect(r.ok).toBe(false);
  });

  test('rejects valid base64 with non-JSON contents', () => {
    const tok = btoa('not json at all').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    const r = decodeBuild(tok);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('malformed');
  });

  test('rejects unsupported version', () => {
    const tok = btoa(JSON.stringify({ v: 999, c: [], m: [] }))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
    const r = decodeBuild(tok);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unsupported-version');
  });

  test('rejects invalid car type', () => {
    const tok = btoa(JSON.stringify({ v: 1, c: ['engine', 'spaceship'], m: [] }))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
    const r = decodeBuild(tok);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-shape');
  });

  test('rejects malformed attachment (negative carIndex)', () => {
    const tok = btoa(
      JSON.stringify({ v: 1, c: ['engine'], m: [{ c: -1, s: 'x', m: 'y', i: [] }] }),
    )
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
    const r = decodeBuild(tok);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-shape');
  });
});

describe('buildTokenFromUrl', () => {
  test('returns the token from ?b=…', () => {
    const tok = encodeBuild(sampleBuild);
    expect(buildTokenFromUrl(`https://x.test/path?${BUILD_SHARE_QUERY_KEY}=${tok}`)).toBe(tok);
  });

  test('returns null when no ?b= param', () => {
    expect(buildTokenFromUrl('https://x.test/path')).toBeNull();
  });

  test('returns null on malformed URL', () => {
    expect(buildTokenFromUrl('not a url')).toBeNull();
  });
});

describe('shareUrl', () => {
  test('appends ?b=token to the path', () => {
    const tok = encodeBuild(sampleBuild);
    const url = shareUrl('https://x.test/path', tok);
    expect(url).toContain(`${BUILD_SHARE_QUERY_KEY}=${tok}`);
  });

  test('replaces an existing ?b= rather than duplicating', () => {
    const tok = encodeBuild(sampleBuild);
    const url = shareUrl('https://x.test/path?b=oldtoken', tok);
    expect(url).toContain(`${BUILD_SHARE_QUERY_KEY}=${tok}`);
    expect(url).not.toContain('oldtoken');
  });
});

describe('BUILD_SHARE_VERSION', () => {
  test('is 1 — bump this in tandem with adding a v2 decoder', () => {
    expect(BUILD_SHARE_VERSION).toBe(1);
  });
});
