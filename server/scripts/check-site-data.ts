/**
 * Before the weekly public data goes on main (.github/workflows/public-data.yml):
 * each of the site's files the run built is held against the one a git ref
 * has. A file that will not read, was built before the ref's, or holds fewer records than
 * the ref's (past a small allowance, as when a download stopped part way) is
 * put back to the ref's, with the reason; the rest go on. Run from anywhere
 * in the repository:
 *
 *   npx tsx server/scripts/check-site-data.ts origin/main
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** How far a count may fall before the file is held back: a few lines renamed or merged. */
const ALLOWED_DROP = 0.02;

interface Shape {
  /** When the file was built: an ISO date, or a year and month. */
  stamp: string | null;
  /** Its record counts, by name. */
  counts: Record<string, number>;
}

function sizeOf(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return 0;
}

function jsonShape(stampKey: string, countKeys: string[]) {
  return (text: string): Shape => {
    const data = JSON.parse(text) as Record<string, unknown>;
    const counts: Record<string, number> = {};
    for (const key of countKeys) counts[key] = sizeOf(data[key]);
    const stamp = data[stampKey];
    return { stamp: typeof stamp === 'string' ? stamp : null, counts };
  };
}

/** scripts/build-pump-prices.ts writes it; its months and cities are what matter. */
export function pumpPricesShape(text: string): Shape {
  if (!text.includes('export const PUMP_PRICES')) throw new Error('no PUMP_PRICES');
  const through = /through: '(\d{4}-\d{2})'/.exec(text)?.[1] ?? null;
  return { stamp: through, counts: { cities: (text.match(/latest: \{/g) ?? []).length } };
}

export const SITE_FILES: { path: string; shape: (text: string) => Shape }[] = [
  {
    path: 'server/data/recalls-canada.json',
    shape: jsonShape('builtAt', ['recalls', 'byLine']),
  },
  { path: 'server/data/complaints.json', shape: jsonShape('builtAt', ['byLine']) },
  {
    path: 'server/data/investigations.json',
    shape: jsonShape('builtAt', ['investigations', 'byLine']),
  },
  { path: 'server/data/nhtsa-ratings.json', shape: jsonShape('fetchedAt', ['tests']) },
  { path: 'server/data/canadian-specs.json', shape: jsonShape('fetchedAt', ['vehicles']) },
  { path: 'server/src/config/pump-prices.ts', shape: pumpPricesShape },
];

/** Why the new file should not replace the old, or null where it may. */
export function heldBackFor(old: Shape, next: Shape): string | null {
  if (!next.stamp) return 'it says nothing of when it was built';
  if (old.stamp && next.stamp < old.stamp)
    return `it was built before the one there (${next.stamp} < ${old.stamp})`;
  for (const [name, count] of Object.entries(old.counts)) {
    const now = next.counts[name] ?? 0;
    if (now < count * (1 - ALLOWED_DROP)) return `${name} fell from ${count} to ${now}`;
  }
  return null;
}

function main(): void {
  const ref = process.argv[2];
  if (!ref) {
    console.error('Usage: check-site-data.ts <git ref to hold the files against>');
    process.exit(2);
  }
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 30 });

  for (const { path, shape } of SITE_FILES) {
    let oldText: string;
    try {
      oldText = git('show', `${ref}:${path}`);
    } catch {
      console.log(`${path}: new on ${ref}, taken as it is`);
      continue;
    }
    let reason: string | null;
    let summary = '';
    try {
      const next = shape(readFileSync(join(root, path), 'utf8'));
      const old = shape(oldText);
      reason = heldBackFor(old, next);
      summary = Object.entries(next.counts)
        .map(([name, count]) => `${name} ${old.counts[name] ?? 0} → ${count}`)
        .join(', ');
    } catch (error) {
      reason = `it will not read (${error instanceof Error ? error.message : String(error)})`;
    }
    if (reason) {
      git('checkout', ref, '--', path);
      console.log(`${path}: kept ${ref}'s, as ${reason}`);
    } else {
      console.log(`${path}: ${summary}`);
    }
  }
}

if (process.argv[1]?.endsWith('check-site-data.ts')) main();
