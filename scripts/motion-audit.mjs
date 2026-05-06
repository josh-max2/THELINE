// Motion audit: take two screenshots ~1500ms apart and compare byte hashes.
// If parallax actually scrolls, hashes will differ. If hashes match, the
// scene is static (motion broken).
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';

const url = process.argv[2] ?? 'http://localhost:5180';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: 'networkidle' });

const sample = async () => {
  const buf = await page.screenshot({ fullPage: false });
  return { hash: createHash('sha256').update(buf).digest('hex').slice(0, 16), bytes: buf.length };
};

await page.waitForTimeout(500); // let Phaser settle
const a = await sample();
await page.waitForTimeout(1500);
const b = await sample();

await browser.close();

const moved = a.hash !== b.hash;
console.log(JSON.stringify({ a, b, moved }, null, 2));
if (!moved) {
  console.error('MOTION FAILURE: scene is static after 1.5s.');
  process.exit(1);
}
