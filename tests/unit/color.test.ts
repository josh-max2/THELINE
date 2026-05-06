import { describe, expect, test } from 'vitest';
import { parseColor } from '../../src/lib/color';

describe('parseColor', () => {
  test('parses 6-digit hex with hash', () => {
    expect(parseColor('#ff8800')).toBe(0xff8800);
  });

  test('parses 6-digit hex without hash', () => {
    expect(parseColor('aabbcc')).toBe(0xaabbcc);
  });

  test('expands 3-digit shorthand', () => {
    expect(parseColor('#abc')).toBe(0xaabbcc);
    expect(parseColor('#000')).toBe(0x000000);
    expect(parseColor('#fff')).toBe(0xffffff);
  });

  test('handles black and white edge cases', () => {
    expect(parseColor('#000000')).toBe(0x000000);
    expect(parseColor('#ffffff')).toBe(0xffffff);
  });
});
