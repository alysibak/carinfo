import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { dataFileCandidates } from '../utils/data-paths.js';

interface SiteStats {
  visits: number;
  updatedAt: string;
}

function statsPath(): string {
  const existing = dataFileCandidates('site-stats.json').find((p) => existsSync(p));
  if (existing) return existing;
  // Prefer server/data when running from repo root or server/
  const preferred = dataFileCandidates('site-stats.json')[0] ?? resolve(process.cwd(), 'data', 'site-stats.json');
  return preferred;
}

function readStats(): SiteStats {
  const path = statsPath();
  try {
    if (existsSync(path)) {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<SiteStats>;
      return {
        visits: Math.max(0, Number(raw.visits) || 0),
        updatedAt: raw.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    /* start fresh */
  }
  return { visits: 0, updatedAt: new Date().toISOString() };
}

function writeStats(stats: SiteStats): void {
  const path = statsPath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(stats, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist site stats:', err);
  }
}

let memory = readStats();

export function getSiteStats(): { visits: number } {
  return { visits: memory.visits };
}

/** Increment visit count (call once per browser session from the client). */
export function recordVisit(): { visits: number } {
  memory = {
    visits: memory.visits + 1,
    updatedAt: new Date().toISOString(),
  };
  writeStats(memory);
  return { visits: memory.visits };
}
