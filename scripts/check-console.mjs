// Hits Hub then Run, captures every console message + page error.
import { chromium } from '@playwright/test';
const url = process.env.URL ?? 'http://localhost:5215';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const messages = [];
page.on('console', (m) => messages.push({ type: m.type(), text: m.text() }));
page.on('pageerror', (e) => messages.push({ type: 'pageerror', text: e.message + '\n' + (e.stack ?? '') }));

await page.goto(url);
await page.waitForTimeout(1500);
await page.click('.hub-depart');
await page.waitForTimeout(4000);
await browser.close();

const errs = messages.filter((m) => m.type === 'error' || m.type === 'pageerror' || m.type === 'warning');
console.log('--- error/warning messages ---');
for (const m of errs) console.log(`[${m.type}] ${m.text}`);
console.log('--- summary ---');
console.log('total:', messages.length, 'errors+warnings:', errs.length);
