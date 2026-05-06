// Closeout audit: navigate Hub → Run via Depart, then wait + screenshot.
// Reads window.__salvage to verify run state.
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5203';
const out = process.argv[3] ?? 'docs/screenshots/screenshot.png';
const delayMs = Number(process.argv[4] ?? 30000);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: 'networkidle' });

// Click DEPART to enter the Run.
const depart = page.locator('.hub-depart');
await depart.waitFor({ state: 'visible', timeout: 10_000 });
await depart.click();
await depart.waitFor({ state: 'detached', timeout: 5_000 });

// Wait for the run to evolve.
await page.waitForTimeout(delayMs);
await page.screenshot({ path: out, fullPage: false });
const salvage = await page.evaluate(() => window.__salvage?.total);
await browser.close();

console.log(JSON.stringify({ url, out, delayMs, salvage }, null, 2));
