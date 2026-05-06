// Phase 5 closeout audit — boots the game, navigates Hub → Run, exercises
// every Phase 5 feature, captures every console message + page error.
import { chromium } from '@playwright/test';
const url = process.env.URL ?? 'http://localhost:5220';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await ctx.newPage();

const messages = [];
page.on('console', (m) => messages.push({ type: m.type(), text: m.text() }));
page.on('pageerror', (e) => messages.push({ type: 'pageerror', text: e.message + '\n' + (e.stack ?? '') }));

// Skip tutorial so DEPART works.
await page.addInitScript(() => {
  try { localStorage.setItem('theline:tutorial-seen-v1', 'true'); } catch {}
});

console.log('[1] Goto hub');
await page.goto(url);
await page.waitForSelector('.hub-depart', { timeout: 10000 });

console.log('[2] Verify mute toggle, salvage HUD');
const muteText = await page.locator('.hub-mute').textContent();
console.log('    mute label:', JSON.stringify(muteText));
const salvageText = await page.locator('.hub-salvage').textContent();
console.log('    salvage label:', JSON.stringify(salvageText));

console.log('[3] Click Tech Tree, verify modal opens');
await page.click('.hub-techtree');
await page.waitForSelector('.tech-tree-modal', { timeout: 5000 });
const tierLabels = await page.locator('.tech-tree-tier-label').allTextContents();
console.log('    tier labels:', tierLabels);
await page.click('.tech-tree-close');
await page.waitForSelector('.tech-tree-modal', { state: 'detached', timeout: 5000 });

console.log('[4] DEPART → Run scene');
await page.click('.hub-depart');
await page.waitForTimeout(2500);

console.log('[5] Verify run-scene buttons + HUD');
const abandonExists = await page.locator('.run-abandon').count();
const shareExists = await page.locator('.run-share').count();
console.log('    abandon:', abandonExists, 'share:', shareExists);

console.log('[6] Click share to test build encoding');
await page.click('.run-share');
await page.waitForTimeout(300);
const clipboardUrl = await page.evaluate(async () => {
  try { return await navigator.clipboard.readText(); } catch { return null; }
});
console.log('    copied URL has ?b= →', clipboardUrl?.includes('?b='));

console.log('[7] Wait 10s mid-combat to exercise effects/audio/env zones');
await page.waitForTimeout(10000);

console.log('[8] Read salvage via window.__salvage');
const finalSalvage = await page.evaluate(() => window.__salvage?.total);
console.log('    salvage after combat:', finalSalvage);

console.log('[9] Abandon → back to Hub');
await page.click('.run-abandon');
await page.waitForTimeout(1500);
const backOnHub = await page.locator('.hub-depart').count();
console.log('    on hub:', backOnHub > 0);

console.log('\n=== console errors / warnings (excluding WebGL perf hints) ===');
const errs = messages.filter((m) =>
  (m.type === 'error' || m.type === 'pageerror' || m.type === 'warning') &&
  !m.text.includes('GL Driver') &&
  !m.text.includes('GPU stall'),
);
for (const m of errs) console.log(`[${m.type}] ${m.text}`);
console.log('total console messages:', messages.length, 'errors+warnings (excluding WebGL):', errs.length);

await browser.close();
