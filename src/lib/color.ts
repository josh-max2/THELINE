/** Convert "#rrggbb", "#rgb", "rrggbb", or "rgb" to a 0xRRGGBB integer for Phaser. */
export function parseColor(hex: string): number {
  let s = hex.replace('#', '');
  if (s.length === 3) {
    s = s
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return Number.parseInt(s, 16);
}
