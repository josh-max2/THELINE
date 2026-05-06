// Capture the run scene mid-combat so muzzle flashes / hit flashes / kill
// bursts have a chance to be visible. We grab a couple of frames at different
// times to maximize odds of catching the effects mid-animation.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5216';
const out = 'docs/screenshots/task5-5-combat-effects.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto(url);
await page.waitForTimeout(1500);
await page.click('.hub-depart');
await page.waitForTimeout(3500);
// Burst-capture 12 frames at 80ms intervals so at least one lands during a
// hit flash / muzzle flash / kill burst (those tweens are 90-360ms).
const frames = [];
for (let i = 0; i < 12; i++) {
  const buf = await page.screenshot();
  frames.push(buf);
  await page.waitForTimeout(80);
}
// Pick the largest frame (most non-background pixels = most effects on screen).
let best = frames[0];
let bestSize = best.length;
for (const buf of frames) {
  if (buf.length > bestSize) {
    best = buf;
    bestSize = buf.length;
  }
}
await import('node:fs').then((fs) => fs.writeFileSync(out, best));
console.log('saved', out, 'best frame size:', bestSize);

await browser.close();
