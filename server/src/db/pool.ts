import { Pool, type PoolConfig } from 'pg';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS garage_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, car_id)
);

CREATE INDEX IF NOT EXISTS garage_items_user_id_idx ON garage_items (user_id);
`;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * TLS mode, from DATABASE_SSL:
 *
 *   false      no TLS (local Postgres)
 *   verify     TLS, certificate verified against Node's CA store, or against
 *              DATABASE_CA_CERT (PEM) when the provider uses a private CA
 *   (unset)    TLS without certificate verification — the historical default
 *
 * The unset default encrypts the connection but does not authenticate the
 * server, so it is open to interception. It is kept only so an existing deploy
 * against a provider with a private CA does not break on upgrade; set
 * DATABASE_SSL=verify once you have confirmed your provider's certificate
 * validates (Neon's does out of the box).
 */
function sslConfig(): PoolConfig['ssl'] {
  const mode = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (mode === 'false') return undefined;
  if (mode === 'verify') {
    const ca = process.env.DATABASE_CA_CERT?.trim();
    return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
  }
  if (process.env.NODE_ENV === 'production' && !warnedAboutUnverifiedTls) {
    warnedAboutUnverifiedTls = true;
    console.warn(
      '[db] Postgres TLS certificate is not being verified. Set DATABASE_SSL=verify ' +
        '(and DATABASE_CA_CERT if your provider uses a private CA).',
    );
  }
  return { rejectUnauthorized: false };
}

let warnedAboutUnverifiedTls = false;

export function getPool(): Pool {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig(),
      // Each serverless instance holds its own pool, so the real ceiling is
      // instances × max. Keep it small, or point DATABASE_URL at a pooler.
      max: Number(process.env.DATABASE_POOL_MAX) || 5,
      // pg's default connection timeout is 0 — wait forever. An unreachable
      // database then hangs every account request until the platform kills
      // the function (60 s on Vercel) instead of failing fast.
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS) || 5_000,
      idleTimeoutMillis: 30_000,
    });
    // An idle client erroring (e.g. the server restarted) must not crash the
    // process; the pool discards it and the next query reconnects.
    pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  }
  return pool;
}

export async function ensureSchema(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await getPool().query(SCHEMA_SQL);
    })().catch((err) => {
      // Do not cache a failure: a transient outage at boot would otherwise
      // poison every later request in this process.
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

/** Test seam: close the pool and forget cached state between suites. */
export async function __resetPoolForTests(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
  schemaReady = null;
}
