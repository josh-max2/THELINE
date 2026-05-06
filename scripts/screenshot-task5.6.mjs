import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5217';
const out = 'docs/screenshots/task5-6-hub-with-mute.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto(url);
await page.waitForSelector('.hub-mute', { timeout: 10000 });
await page.waitForTimeout(400);
await page.screenshot({ path: out });
console.log('saved', out);

await browser.close();
