import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'docs/screenshots/screenshot.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: out, fullPage: false });
const title = await page.title();
const bodyText = await page.locator('body').innerText();
await browser.close();

console.log(JSON.stringify({ url, out, title, bodyTextSnippet: bodyText.slice(0, 200) }, null, 2));
