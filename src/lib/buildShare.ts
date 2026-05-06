// Pure encode/decode for sharable build URLs. Per Task 5.4.
//
// Format design constraints:
// - Versioned (so URLs from older builds still decode or fail loudly).
// - Compact-ish — short keys + base64url so links fit in a Reddit post.
// - Stable round-trip: encode(decode(s)) === s for any valid s.
// - No Phaser, no DOM. Tested in pure unit tests.
//
// v1 payload shape (single-letter keys to keep URLs short):
//   { v: 1, c: ['engine', 'weapon', ...], m: [{ c: 0, s: 'engine-top-1', m: 'basic-cannon', i: ['rivet-rounds'] }, ...] }
// where c = trainLayout, m = attached modules, m[].c = carIndex, m[].s = slotId,
// m[].m = moduleId, m[].i = item ids stacked on the slot.

import type { CarType } from './types';

export const BUILD_SHARE_VERSION = 1;
export const BUILD_SHARE_QUERY_KEY = 'b';

/** Player-facing logical shape — what callers see. */
export interface SharedBuild {
  trainLayout: CarType[];
  attachments: Array<{
    carIndex: number;
    slotId: string;
    moduleId: string;
    /** Item ids stacked on this turret, in stack order. */
    itemIds: string[];
  }>;
}

/** Internal compact shape — keep this in sync with the format comment. */
interface EncodedV1 {
  v: 1;
  c: CarType[];
  m: Array<{ c: number; s: string; m: string; i: string[] }>;
}

export type DecodeResult =
  | { ok: true; build: SharedBuild }
  | { ok: false; reason: 'malformed' | 'unsupported-version' | 'invalid-shape' };

/**
 * Encode a build to a base64url-safe string. The result is suitable as the
 * value of a URL query param (no `=`, `+`, `/`).
 */
export function encodeBuild(build: SharedBuild): string {
  const compact: EncodedV1 = {
    v: BUILD_SHARE_VERSION,
    c: [...build.trainLayout],
    m: build.attachments.map((a) => ({
      c: a.carIndex,
      s: a.slotId,
      m: a.moduleId,
      i: [...a.itemIds],
    })),
  };
  const json = JSON.stringify(compact);
  return base64UrlEncode(json);
}

/** Decode a previously-encoded build string. Never throws. */
export function decodeBuild(token: string): DecodeResult {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'malformed' };
  let json: string;
  try {
    json = base64UrlDecode(token);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!isPlainObject(parsed)) return { ok: false, reason: 'invalid-shape' };
  const v = (parsed as Record<string, unknown>).v;
  if (v !== BUILD_SHARE_VERSION) {
    return { ok: false, reason: 'unsupported-version' };
  }
  const validated = validateV1(parsed);
  if (!validated) return { ok: false, reason: 'invalid-shape' };
  return {
    ok: true,
    build: {
      trainLayout: [...validated.c],
      attachments: validated.m.map((a) => ({
        carIndex: a.c,
        slotId: a.s,
        moduleId: a.m,
        itemIds: [...a.i],
      })),
    },
  };
}

/** Read the build token from a window.location-shaped URL. Null if absent. */
export function buildTokenFromUrl(href: string): string | null {
  try {
    const url = new URL(href);
    return url.searchParams.get(BUILD_SHARE_QUERY_KEY);
  } catch {
    return null;
  }
}

/** Construct a sharable URL given an origin+path and an encoded build. */
export function shareUrl(originPath: string, token: string): string {
  // Strip any existing ?b= so re-shares don't double-encode.
  const url = new URL(originPath);
  url.searchParams.set(BUILD_SHARE_QUERY_KEY, token);
  return url.toString();
}

// ─── Internals ────────────────────────────────────────────────────────────

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function validateV1(raw: unknown): EncodedV1 | null {
  if (!isPlainObject(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.c)) return null;
  if (!r.c.every((x) => typeof x === 'string')) return null;
  if (!Array.isArray(r.m)) return null;
  const validCar: ReadonlySet<string> = new Set(['engine', 'weapon', 'armor', 'crew', 'cargo']);
  if (!r.c.every((x) => validCar.has(x as string))) return null;

  for (const entry of r.m as unknown[]) {
    if (!isPlainObject(entry)) return null;
    if (typeof entry.c !== 'number' || !Number.isFinite(entry.c) || entry.c < 0) return null;
    if (typeof entry.s !== 'string' || entry.s.length === 0) return null;
    if (typeof entry.m !== 'string' || entry.m.length === 0) return null;
    if (!Array.isArray(entry.i)) return null;
    if (!entry.i.every((x) => typeof x === 'string')) return null;
  }
  return r as unknown as EncodedV1;
}

/**
 * UTF-8 → base64url. Browser-safe: uses btoa via TextEncoder for unicode.
 * Server tests run in happy-dom which provides btoa/atob globals.
 */
function base64UrlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlDecode(s: string): string {
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
