import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5210';
const out = process.env.OUT ?? 'docs/screenshots/task5-3-tech-tree.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// Pre-seed totalSalvage = 200 in localforage so multiple tiers are affordable
// in the screenshot. Done before navigation so SaveSystem.init reads it.
// First boot: lets SaveSystem.init create the IndexedDB store schema.
await page.goto(url);
await page.waitForTimeout(1500);

// Now seed totalSalvage=200 directly into the store localforage created.
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
      totalSalvage: 200,
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
        purchasedTechIds: [],
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

// Hub loads → wait for the hub overlay to appear, then click the Tech Tree card.
await page.waitForSelector('.hub-techtree', { timeout: 10000 });
await page.click('.hub-techtree');
await page.waitForSelector('.tech-tree-modal', { timeout: 5000 });
await page.waitForTimeout(500);
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
