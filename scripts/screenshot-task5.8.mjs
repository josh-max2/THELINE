// Hub with idle-income banner + auto-run toggle visible (Eternal Engine owned).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5219';
const outIdle = 'docs/screenshots/task5-8-idle-banner.png';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.addInitScript(() => {
  try { localStorage.setItem('theline:tutorial-seen-v1', 'true'); } catch {}
});
await page.goto(url);
await page.waitForTimeout(1500);

await page.evaluate(async () => {
  const open = indexedDB.open('the-line');
  const db = await new Promise((res, rej) => {
    open.onsuccess = () => res(open.result);
    open.onerror = () => rej(open.error);
  });
  const tx = db.transaction('save', 'readwrite');
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  tx.objectStore('save').put(
    {
      saveVersion: 5,
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
        purchasedTechIds: ['t1-spare-parts', 't2-reinforced-rounds', 't3-eternal-engine'],
        audioMuted: false,
        audioVolume: 0.5,
        lastHubExitMs: thirtyMinAgo,
        autoRunEnabled: false,
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
await page.waitForSelector('.hub-idle-banner', { timeout: 10000 });
await page.waitForTimeout(400);
await page.screenshot({ path: outIdle });
console.log('saved', outIdle);
await browser.close();
