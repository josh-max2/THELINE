import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5218';
const out = 'docs/screenshots/task5-7-tutorial-overlay.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// Fresh storage means the tutorial appears on first hub-enter.
await page.goto(url);
await page.waitForSelector('.tutorial-modal', { timeout: 8000 });
await page.waitForTimeout(400);
await page.screenshot({ path: out });
console.log('saved', out);

await browser.close();
