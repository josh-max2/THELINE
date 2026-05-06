// Captures a 2-shot proof of the tech-tree round trip:
//   (1) Hub: tier 1 + tier 2 nodes pre-purchased, salvage = 100
//   (2) Run: same scene with "Unlocks: …" HUD line showing t1-frostworks +
//       t2-reinforced-rounds tags active (proves consumer wiring works).

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5211';
const outHub = 'docs/screenshots/task5-3-tech-tree-purchased.png';
const outRun = 'docs/screenshots/task5-3-runscene-with-unlocks.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto(url);
await page.waitForTimeout(1500);

// Seed save with two purchased tech ids: t1-frostworks (category-cryo)
// and t2-reinforced-rounds (global-damage-buff).
await page.evaluate(async () => {
  const open = indexedDB.open('the-line');
  const db = await new Promise((res, rej) => {
    open.onsuccess = () => res(open.result);
    open.onerror = () => rej(open.error);
  });
  const tx = db.transaction('save', 'readwrite');
  tx.objectStore('save').put(
    {
      saveVersion: 3,
      totalSalvage: 100,
      hubState: {
        modulesOwned: ['basic-cannon'],
        crewRoster: [
          { id: 0, color: '#e08040' },
          { id: 1, color: '#40a0e0' },
          { id: 2, color: '#80c060' },
          { id: 3, color: '#d8c040' },
        ],
        trainLayout: ['engine', 'weapon', 'armor', 'crew', 'cargo'],
        completedRuns: 0,
        purchasedTechIds: ['t1-frostworks', 't2-reinforced-rounds'],
      },
      lastSaved: new Date().toISOString(),
    },
    'the-line:save',
  );
  await new Promise((res, rej) => {
    tx.oncomplete = () => res(undefined);
    tx.onerror = () => rej(tx.error);
  });
  db.close();
});
await page.reload();

// Hub: open the modal so we can see Frostworks + Reinforced Rounds marked OWNED.
await page.waitForSelector('.hub-techtree', { timeout: 10000 });
await page.click('.hub-techtree');
await page.waitForSelector('.tech-tree-modal', { timeout: 5000 });
await page.waitForTimeout(400);
await page.screenshot({ path: outHub });
console.log('saved', outHub);

// Close modal + Depart so RunScene HUD shows the active unlocks.
await page.click('.tech-tree-close');
await page.click('.hub-depart');
await page.waitForTimeout(2500);
await page.screenshot({ path: outRun });
console.log('saved', outRun);

await browser.close();
