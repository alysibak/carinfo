#!/usr/bin/env node
/**
 * Render the default link-preview image (client/public/og-image.png, 1200x630)
 * from HTML, with the site's own fonts and body-type illustration, so it stays
 * on-brand. Re-run after changing the brand or tagline:
 *
 *   node scripts/generate-og-image.mjs
 *
 * Needs a Chromium that Playwright can launch (`npx playwright install
 * chromium`, or set PLAYWRIGHT_CHROMIUM_PATH).
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const b64 = (path) => readFileSync(resolve(root, path)).toString('base64');
const font = (weight) =>
  `url(data:font/woff2;base64,${b64(`node_modules/@fontsource/archivo/files/archivo-latin-${weight}-normal.woff2`)}) format('woff2')`;
const sedan = `data:image/webp;base64,${b64('client/src/assets/body-types/sedan.webp')}`;

const html = `<!doctype html><html><head><style>
  @font-face { font-family: Archivo; font-weight: 400; src: ${font(400)}; }
  @font-face { font-family: Archivo; font-weight: 700; src: ${font(700)}; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #0c0c0e; color: #eaeaec;
         font-family: Archivo, sans-serif; position: relative; overflow: hidden; }
  .glow { position: absolute; right: -120px; bottom: -40px; width: 900px; height: 420px;
          background: radial-gradient(ellipse at 55% 70%, #3b82f655 0%, transparent 62%); }
  .car { position: absolute; right: 40px; bottom: 70px; width: 640px; opacity: 0.92; }
  .text { position: absolute; left: 80px; top: 88px; width: 620px; }
  h1 { font-size: 104px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; }
  p { margin-top: 28px; font-size: 34px; line-height: 1.3; color: #a1a1aa; }
  .foot { position: absolute; left: 80px; bottom: 64px; font-size: 22px; letter-spacing: 0.14em;
          text-transform: uppercase; color: #a1a1aa; }
  .rule { position: absolute; left: 80px; right: 80px; bottom: 116px; height: 1px; background: #2c2c30; }
</style></head><body>
  <div class="glow"></div>
  <img class="car" src="${sedan}" alt="">
  <div class="text">
    <h1>CarInfo</h1>
    <p>Specs you can trust: EPA fuel economy, NHTSA safety, and clearly labeled estimates.</p>
  </div>
  <div class="rule"></div>
  <div class="foot">35,000+ vehicles · 1995–2027 · Canadian costs</div>
</body></html>`;

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
// A string, since this runs in the page (where `document` exists), not in Node.
await page.evaluate('document.fonts.ready');
const out = resolve(root, 'client/public/og-image.png');
await page.screenshot({ path: out });
await browser.close();
console.log(`Wrote ${out}`);
