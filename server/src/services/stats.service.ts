import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { dataFileCandidates } from '../utils/data-paths.js';
import { ensureSchema, getPool, isDatabaseConfigured } from '../db/pool.js';

/**
 * Site visit counter.
 *
 * The original implementation wrote a JSON file on every hit. That works on a
 * long-lived box and is a no-op on serverless: the filesystem is read-only, the
 * write throws, the catch swallows it, and the counter resets to zero on every
 * cold start — so the number on the page was decorative.
 *
 * Postgres is the source of truth when DATABASE_URL is set. Without it we fall
 * back to the file (useful for a self-hosted single process) and, failing that,
 * to memory — but `durable` reports which, so the UI can decline to show a
 * number it cannot stand behind rather than quietly showing a wrong one.
 */

export type StatsBackend = 'postgres' | 'file' | 'memory';

interface SiteStats {
  visits: number;
  updatedAt: string;
}

export interface SiteStatsResult {
  visits: number;
  /** False when the count cannot survive a restart — do not present it as real. */
  durable: boolean;
  backend: StatsBackend;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS site_stats (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  visits BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO site_stats (id, visits) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
`;

let statsSchemaReady: Promise<void> | null = null;

async function ensureStatsSchema(): Promise<void> {
  await ensureSchema();
  if (!statsSchemaReady) {
    statsSchemaReady = (async () => {
      await getPool().query(SCHEMA_SQL);
    })().catch((err) => {
      // Never cache a failure — retry on the next request instead.
      statsSchemaReady = null;
      throw err;
    });
  }
  await statsSchemaReady;
}

// ─── File fallback ────────────────────────────────────────────────────────────

function statsPath(): string {
  const candidates = dataFileCandidates('site-stats.json');
  const existing = candidates.find((p) => existsSync(p));
  if (existing) return existing;
  return candidates[0] ?? resolve(process.cwd(), 'data', 'site-stats.json');
}

function readFileStats(): SiteStats {
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

/** Returns false when the write failed — the caller must not claim durability. */
function writeFileStats(stats: SiteStats): boolean {
  const path = statsPath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(stats, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

let memory = readFileStats();
let fileWritable: boolean | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getSiteStats(): Promise<SiteStatsResult> {
  if (isDatabaseConfigured()) {
    try {
      await ensureStatsSchema();
      const { rows } = await getPool().query('SELECT visits FROM site_stats WHERE id = 1');
      return { visits: Number(rows[0]?.visits ?? 0), durable: true, backend: 'postgres' };
    } catch (err) {
      console.error('[stats] postgres read failed, falling back:', err);
    }
  }
  return {
    visits: memory.visits,
    durable: fileWritable === true,
    backend: fileWritable === true ? 'file' : 'memory',
  };
}

/** Increment visit count (call once per browser session from the client). */
export async function recordVisit(): Promise<SiteStatsResult> {
  if (isDatabaseConfigured()) {
    try {
      await ensureStatsSchema();
      const { rows } = await getPool().query(
        `UPDATE site_stats SET visits = visits + 1, updated_at = NOW()
         WHERE id = 1 RETURNING visits`,
      );
      return { visits: Number(rows[0]?.visits ?? 0), durable: true, backend: 'postgres' };
    } catch (err) {
      console.error('[stats] postgres increment failed, falling back:', err);
    }
  }

  memory = { visits: memory.visits + 1, updatedAt: new Date().toISOString() };
  fileWritable = writeFileStats(memory);
  return {
    visits: memory.visits,
    durable: fileWritable,
    backend: fileWritable ? 'file' : 'memory',
  };
}

/** Test seam. */
export function __resetStatsMemory(): void {
  memory = { visits: 0, updatedAt: new Date().toISOString() };
  fileWritable = null;
  statsSchemaReady = null;
}
