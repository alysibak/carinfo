#!/usr/bin/env node
/**
 * Render the app icons in client/public from the brand mark in favicon.svg:
 *
 * - favicon.ico (32px), for browsers and tools that only look for /favicon.ico
 * - apple-touch-icon.png (180px), for iOS home screens
 * - icon-192.png / icon-512.png, and a maskable 512px, for site.webmanifest
 *
 * Without them every one of those requests fell through to the HTML shell.
 * Home-screen and maskable icons drop the thin inset frame, which the
 * platform's rounded or circular mask would clip, and keep the glyph inside
 * the mask's safe zone. Re-run after changing favicon.svg:
 *
 *   node scripts/generate-icons.mjs
 *
 * Needs a Chromium that Playwright can launch (`npx playwright install
 * chromium`, or set PLAYWRIGHT_CHROMIUM_PATH).
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const publicDir = resolve(root, 'client/public');
const svg = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf8');

// The mark's colours and glyph, read from the favicon so the two stay in step.
const background = /<rect width="32" height="32" fill="([^"]+)"/.exec(svg)[1];
const glyph = /<path [^>]*\/>/.exec(svg)[0];

/**
 * The glyph alone on a full-bleed background. `scale` is the glyph's share of
 * the icon: the maskable safe zone is the central 80% circle.
 */
function glyphOnly(scale) {
  const size = 32 / scale;
  const offset = (size - 32) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-offset} ${-offset} ${size} ${size}">
  <rect x="${-offset}" y="${-offset}" width="${size}" height="${size}" fill="${background}"/>
  ${glyph}
</svg>`;
}

const icons = [
  { file: 'favicon-32.png', size: 32, svg },
  { file: 'apple-touch-icon.png', size: 180, svg: glyphOnly(0.8) },
  { file: 'icon-192.png', size: 192, svg: glyphOnly(0.8) },
  { file: 'icon-512.png', size: 512, svg: glyphOnly(0.8) },
  { file: 'icon-maskable-512.png', size: 512, svg: glyphOnly(0.62) },
];

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const rendered = {};
for (const { file, size, svg: markup } of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const src = `data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}`;
  await page.setContent(
    `<style>*{margin:0}img{display:block}</style><img src="${src}" width="${size}" height="${size}">`,
  );
  rendered[file] = await page.screenshot({ type: 'png' });
  await page.close();
}
await browser.close();

for (const [file, png] of Object.entries(rendered)) {
  if (file === 'favicon-32.png') continue;
  writeFileSync(resolve(publicDir, file), png);
  console.log(`Wrote client/public/${file}`);
}

// An .ico holding one PNG image, which every current browser reads.
const png = rendered['favicon-32.png'];
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette size
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
writeFileSync(resolve(publicDir, 'favicon.ico'), Buffer.concat([header, png]));
console.log('Wrote client/public/favicon.ico');
