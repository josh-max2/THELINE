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

test.describe('Phase 3 / Tasks 3.3–3.5 — train + module + combat', () => {
  test('canvas is present and produces non-empty pixel data after 2 seconds', async ({ page }) => {
    await page.goto('/');

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
    await page.goto('/');
    // Wait long enough for: first scout spawn (~1.5s) + travel-to-train + cannon fire + projectile travel.
    await page.waitForTimeout(7000);

    const salvage = await page.evaluate(() => window.__salvage?.total);
    expect(salvage, 'salvage should be tracked on window').toBeDefined();
    expect(salvage, 'cannon should kill at least one scout in 7s').toBeGreaterThan(0);
  });
});
