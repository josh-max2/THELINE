// Screenshot the Hub (no tutorial overlay). Pre-seeds tutorial-seen so the
// modal doesn't cover the cards.
//
// Usage: node scripts/screenshot-hub.mjs <out-path>

import { chromium } from '@playwright/test';

const url = 'http://localhost:5173';
const out = process.argv[2] ?? 'docs/screenshots/hub.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.addInitScript(() => {
  try {
    localStorage.setItem('theline:tutorial-seen-v1', 'true');
  } catch {
    // no-op
  }
});

await page.goto(url, { waitUntil: 'networkidle' });
// Allow Hub overlay to mount + render fonts.
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: false });
await browser.close();

console.log(JSON.stringify({ out }, null, 2));
