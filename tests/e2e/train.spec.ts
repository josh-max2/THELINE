import { test, expect } from '@playwright/test';

test.describe('Phase 3 / Task 3.3 — train renders', () => {
  test('canvas is present and produces non-empty pixel data after 2 seconds', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Let Phaser tick for a couple of seconds so the parallax has scrolled
    // and the engine car has rendered.
    await page.waitForTimeout(2000);

    const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(dims.w).toBeGreaterThanOrEqual(1280);
    expect(dims.h).toBeGreaterThanOrEqual(720);

    // Sample the engine area (around x≈200, y≈360 in canvas coords).
    // We just assert the pixel isn't pure background — meaning the engine
    // shape was drawn into the canvas.
    const samples = await page.evaluate(async () => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      if (!c) return null;
      // Use 2D drawImage to read pixels, since the live canvas is WebGL.
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
        background: px(640, 100), // upper middle, should be near background
        engine: px(200, 360), // engine center
        ground: px(640, 600), // ground band
      };
    });

    expect(samples).not.toBeNull();
    if (!samples) return;

    // Engine pixel should not equal background pixel — engine drew something there.
    expect(samples.engine.slice(0, 3)).not.toEqual(samples.background.slice(0, 3));
  });
});
