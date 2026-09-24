#!/usr/bin/env node
/**
 * Fail the build when the client's critical-path JavaScript grows past budget.
 *
 * Bundle size regresses one innocent import at a time — the Clerk SDK ended up
 * in the entry chunk that way — and nobody notices until the landing page is
 * slow. This script measures what index.html actually loads on first paint
 * (the entry chunk plus anything it modulepreloads) and compares the gzipped
 * total against a budget. Lazy route chunks are reported but not gated: they
 * only cost the pages that use them.
 *
 * Usage: node scripts/check-bundle-size.mjs [--budget-kb=95]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = resolve(process.cwd(), 'client', 'dist');
const ASSETS = join(DIST, 'assets');

const budgetArg = process.argv.find((a) => a.startsWith('--budget-kb='));
// Entry chunk is ~84 KB gzip today (it was ~103 KB before axios gave way to
// fetch). The budget leaves headroom for normal growth while still catching a
// whole SDK or HTTP library landing on the critical path.
const BUDGET_KB = budgetArg ? Number(budgetArg.split('=')[1]) : 95;

function gzipKb(path) {
  return gzipSync(readFileSync(path), { level: 9 }).length / 1024;
}

let html;
try {
  html = readFileSync(join(DIST, 'index.html'), 'utf8');
} catch {
  console.error('client/dist/index.html not found — run `npm run build:client` first.');
  process.exit(1);
}

// Everything index.html loads before the app can render.
const critical = new Set();
for (const match of html.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)) {
  critical.add(match[1]);
}

let criticalKb = 0;
const rows = [];
for (const file of readdirSync(ASSETS).filter((f) => f.endsWith('.js'))) {
  const path = join(ASSETS, file);
  const gz = gzipKb(path);
  const raw = statSync(path).size / 1024;
  const isCritical = critical.has(file);
  if (isCritical) criticalKb += gz;
  rows.push({ file, raw, gz, isCritical });
}

rows.sort((a, b) => b.gz - a.gz);
console.log('\nClient JavaScript (gzip):\n');
for (const r of rows.slice(0, 12)) {
  const tag = r.isCritical ? 'CRITICAL' : 'lazy    ';
  console.log(`  ${tag}  ${r.gz.toFixed(1).padStart(7)} KB   ${r.file}`);
}

console.log(`\nCritical path: ${criticalKb.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)\n`);

if (criticalKb > BUDGET_KB) {
  console.error(
    `Bundle budget exceeded by ${(criticalKb - BUDGET_KB).toFixed(1)} KB. ` +
      'Something heavy reached the entry chunk — lazy-load it, or raise the budget deliberately.',
  );
  process.exit(1);
}
