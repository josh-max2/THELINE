// Capture a cinematic cover-image candidate for the itch.io page.
// Goal: a single frame with the train + combat happening + visual juice +
// no HUD chrome blocking the action. Burst-capture 12 frames at 80ms
// intervals (same trick used for Task 5.5) and pick the one with the most
// non-background pixels — proxies "most action on screen".
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5221';
const out = 'docs/screenshots/cover-candidate.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

await page.addInitScript(() => {
  try { localStorage.setItem('theline:tutorial-seen-v1', 'true'); } catch {}
});
await page.goto(url);
await page.waitForSelector('.hub-depart', { timeout: 10000 });
await page.click('.hub-depart');

// Wait deep enough into the run that the encounter has spawned multiple enemies
// and turrets are mid-fire. ~5–8s seems the sweet spot in Travel encounters.
await page.waitForTimeout(6000);

const frames = [];
for (let i = 0; i < 14; i++) {
  frames.push(await page.screenshot());
  await page.waitForTimeout(80);
}
let best = frames[0];
for (const buf of frames) if (buf.length > best.length) best = buf;
writeFileSync(out, best);
console.log('saved', out, 'best frame size:', best.length);

await browser.close();
