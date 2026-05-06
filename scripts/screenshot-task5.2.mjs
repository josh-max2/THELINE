import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5204';
const out = process.env.OUT ?? 'docs/screenshots/task5-2-env-zones.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url);
// HubScene → Mission Board → DEPART, then wait for combat to spin up zones.
const departBtn = page.locator('button', { hasText: /depart/i }).first();
if (await departBtn.count()) await departBtn.click().catch(() => {});
await page.waitForTimeout(12000);
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
