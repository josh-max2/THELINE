// Task 5.4 visual proof:
//   (1) RunScene with the "Copy Build URL" button visible top-right.
//   (2) HubScene loaded with ?b=<token> showing the import banner.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5212';
const outRun = 'docs/screenshots/task5-4-run-share-button.png';
const outHub = 'docs/screenshots/task5-4-hub-import-banner.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();

// Shot 1: RunScene with share button visible. Goto Hub → Depart → wait → screenshot.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  // Grant clipboard so the button click actually flows to the success path.
  await browser.contexts()[0].grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(url);
  await page.waitForTimeout(1500);
  await page.click('.hub-depart');
  await page.waitForTimeout(2500);
  // Capture the build token before screenshot — we'll use it for shot 2.
  const token = await page.evaluate(async () => {
    const btn = document.querySelector('.run-share');
    btn.click();
    await new Promise((r) => setTimeout(r, 200));
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  });
  await page.screenshot({ path: outRun });
  console.log('saved', outRun);
  await page.close();

  // Shot 2: open the same URL the share button copied, in a fresh page.
  // Falls back to a synthetic token if clipboard wasn't readable.
  let importUrl = token;
  if (!importUrl) {
    importUrl = `${url}/?b=eyJ2IjoxLCJjIjpbImVuZ2luZSIsIndlYXBvbiJdLCJtIjpbXX0`;
  }
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page2.goto(importUrl);
  await page2.waitForSelector('.hub-import-banner', { timeout: 5000 });
  await page2.waitForTimeout(400);
  await page2.screenshot({ path: outHub });
  console.log('saved', outHub);
}

await browser.close();
