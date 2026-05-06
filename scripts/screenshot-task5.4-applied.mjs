// Proves Task 5.4 isn't inert: import a non-default layout via ?b=…,
// click Apply Build, depart to Run scene, screenshot the now-customized train.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5213';
const out = 'docs/screenshots/task5-4-applied-custom-layout.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// Custom layout: engine + 3 weapon cars + cargo. Encoded inline so the test
// doesn't depend on clipboard. Same encoder the runtime uses.
const customBuild = {
  trainLayout: ['engine', 'weapon', 'weapon', 'weapon', 'cargo'],
  attachments: [],
};
const compact = { v: 1, c: customBuild.trainLayout, m: [] };
const json = JSON.stringify(compact);
const token = btoa(unescape(encodeURIComponent(json)))
  .replaceAll('+', '-')
  .replaceAll('/', '_')
  .replaceAll('=', '');

await page.goto(`${url}/?b=${token}`);
await page.waitForSelector('.hub-import-banner', { timeout: 10000 });
await page.click('.hub-import-apply');
await page.waitForTimeout(400);
await page.click('.hub-depart');
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
console.log('saved', out);

await browser.close();
