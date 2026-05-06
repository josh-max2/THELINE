import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { TRAIN_ANCHOR_X, TRAIN_CENTER_Y } from '../../src/lib/trainLayout';

// Compute the cannon's expected world position from data so the test stays in
// sync if engine slot positions are repositioned in cars.json.
// Playwright runs from project root, so a relative path works.
const cars = JSON.parse(fs.readFileSync('src/data/cars.json', 'utf8')) as Record<
  string,
  { slots: Array<{ id: string; x: number; y: number }> }
>;
const slot1 = cars.engine.slots.find((s) => s.id === 'engine-top-1')!;
const cannonWorldX = TRAIN_ANCHOR_X + slot1.x;
const cannonWorldY = TRAIN_CENTER_Y + slot1.y;

/** Helper: navigate from Hub → Run via the Depart button. */
async function departFromHub(page: import('@playwright/test').Page): Promise<void> {
  // Pre-mark the first-run tutorial as seen so the modal (Task 5.7) doesn't
  // block the DEPART button. Set BEFORE goto so HubScene reads it on enter.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('theline:tutorial-seen-v1', 'true');
    } catch {
      // happy-dom never throws, but Safari private mode might.
    }
  });
  await page.goto('/');
  // Click Depart to leave the Hub. Wait for the button so HubScene's DOM has rendered.
  const depart = page.locator('.hub-depart');
  await depart.waitFor({ state: 'visible', timeout: 10_000 });
  await depart.click();
  // Hub overlay disappears once RunScene starts.
  await depart.waitFor({ state: 'detached', timeout: 5_000 });
}

test.describe('Phase 3 / Tasks 3.3–3.5 — train + module + combat', () => {
  test('canvas is present and produces non-empty pixel data after 2 seconds', async ({ page }) => {
    await departFromHub(page);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    await page.waitForTimeout(2000);

    const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }));
    expect(dims.w).toBeGreaterThanOrEqual(1280);
    expect(dims.h).toBeGreaterThanOrEqual(720);

    const samples = await page.evaluate(
      async ({ cx, cy }: { cx: number; cy: number }) => {
        const c = document.querySelector('canvas') as HTMLCanvasElement;
        if (!c) return null;
        const off = document.createElement('canvas');
        off.width = c.width;
        off.height = c.height;
        const ctx = off.getContext('2d')!;
        ctx.drawImage(c, 0, 0);
        const scaleX = c.width / 1280;
        const scaleY = c.height / 720;
        const px = (x: number, y: number) =>
          Array.from(
            ctx.getImageData(Math.round(x * scaleX), Math.round(y * scaleY), 1, 1).data,
          );
        return {
          background: px(640, 100),
          engineBody: px(200, 360),
          cannon: px(cx, cy),
        };
      },
      { cx: cannonWorldX, cy: cannonWorldY },
    );

    expect(samples).not.toBeNull();
    if (!samples) return;

    // Engine body must paint over background.
    expect(samples.engineBody.slice(0, 3)).not.toEqual(samples.background.slice(0, 3));
    // Cannon must paint over background.
    expect(samples.cannon.slice(0, 3)).not.toEqual(samples.background.slice(0, 3));
    // Cannon must be a distinct fill from the engine body (they use different slate hues).
    expect(samples.cannon.slice(0, 3)).not.toEqual(samples.engineBody.slice(0, 3));
  });

  test('combat loop produces salvage within 7 seconds (Task 3.5)', async ({ page }) => {
    await departFromHub(page);
    // Wait long enough for: first scout spawn (~1.5s) + travel-to-train + cannon fire + projectile travel.
    await page.waitForTimeout(7000);

    const salvage = await page.evaluate(() => window.__salvage?.total);
    expect(salvage, 'salvage should be tracked on window').toBeDefined();
    expect(salvage, 'cannon should kill at least one scout in 7s').toBeGreaterThan(0);
  });

  test('salvage persists across page reload (Task 3.6)', async ({ page }) => {
    await departFromHub(page);
    await page.waitForTimeout(6000);

    const beforeReload = await page.evaluate(() => window.__salvage?.total);
    expect(beforeReload, 'salvage should accumulate before reload').toBeGreaterThan(0);

    // Force a save flush by simulating visibility-hidden (the lifecycle hook fires flushSave).
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // Give the async IndexedDB write a moment to land.
    await page.waitForTimeout(300);

    await page.reload();
    // Reload returns to Hub. Salvage is restored to the Hub's display via SaveSystem.init.
    // Re-depart to verify it carries into the Run.
    const depart = page.locator('.hub-depart');
    await depart.waitFor({ state: 'visible', timeout: 10_000 });
    await depart.click();
    await depart.waitFor({ state: 'detached', timeout: 5_000 });
    // Wait for SaveSystem.init() to load + restore.
    await page.waitForTimeout(1500);

    const afterReload = await page.evaluate(() => window.__salvage?.total);
    expect(afterReload, 'salvage should be restored from save').toBeGreaterThanOrEqual(beforeReload!);
  });
});
