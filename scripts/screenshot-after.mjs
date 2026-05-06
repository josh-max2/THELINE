// Screenshot after a delay so the scene has time to spawn enemies + fire.
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5190';
const out = process.argv[3] ?? 'docs/screenshots/screenshot.png';
const delayMs = Number(process.argv[4] ?? 5000);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(delayMs);
await page.screenshot({ path: out, fullPage: false });
const salvage = await page.evaluate(() => window.__salvage?.total);
await browser.close();

console.log(JSON.stringify({ url, out, delayMs, salvage }, null, 2));
