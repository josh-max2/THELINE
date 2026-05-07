// Screenshot the RunScene mid-combat. Clicks DEPART, waits a few seconds for
// projectiles + impacts to be in flight, then captures the canvas.
//
// Usage: node scripts/screenshot-run.mjs <out-path> [waitMs]

import { chromium } from '@playwright/test';

const url = 'http://localhost:5173';
const out = process.argv[2] ?? 'docs/screenshots/run.png';
const waitMs = Number(process.argv[3] ?? 8000);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// Pre-mark the tutorial as seen so the modal doesn't block DEPART.
await page.addInitScript(() => {
  try {
    localStorage.setItem('theline:tutorial-seen-v1', 'true');
  } catch {
    // no-op
  }
});

await page.goto(url, { waitUntil: 'networkidle' });

// DEPART is a button inside the Mission Board card.
await page.getByText('DEPART').click();

// Wait for combat to be in flight.
await page.waitForTimeout(waitMs);

await page.screenshot({ path: out, fullPage: false });

await browser.close();
console.log(JSON.stringify({ out, waitMs }, null, 2));
