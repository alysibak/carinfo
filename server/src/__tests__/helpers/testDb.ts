import { randomBytes } from 'crypto';
import { Client } from 'pg';
import { __resetPoolForTests, ensureSchema, getPool } from '../../db/pool.js';
import { __resetStatsMemory } from '../../services/stats.service.js';

/**
 * Real-Postgres integration tests run when TEST_DATABASE_URL is set (CI
 * provides a service container) and skip otherwise, so a contributor without a
 * local database still gets a green run of everything else.
 *
 * Mocks were rejected on purpose: the garage write path depends on Postgres
 * specifics (unnest, ON CONFLICT, a transaction) that a fake would not check.
 *
 * Isolation: vitest runs test files in parallel workers, and two files
 * truncating the same tables would race. Each file gets its own schema, and
 * its connections pin `search_path` to it, so files never see each other.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL?.trim() || '';
export const hasTestDatabase = TEST_DATABASE_URL.length > 0;

let schema: string | null = null;

async function admin<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

function withSearchPath(url: string, searchPath: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('options', `-c search_path=${searchPath}`);
  return parsed.toString();
}

export async function useTestDatabase(): Promise<void> {
  schema = `test_${randomBytes(6).toString('hex')}`;
  await admin((c) => c.query(`CREATE SCHEMA ${schema}`));
  process.env.DATABASE_URL = withSearchPath(TEST_DATABASE_URL, schema);
  process.env.DATABASE_SSL = 'false';
  await __resetPoolForTests();
  await ensureSchema();
}

export async function resetTables(): Promise<void> {
  await getPool().query(
    'TRUNCATE garage_items, users RESTART IDENTITY CASCADE; DROP TABLE IF EXISTS site_stats;',
  );
  __resetStatsMemory();
}

export async function closeTestDatabase(): Promise<void> {
  await __resetPoolForTests();
  delete process.env.DATABASE_URL;
  if (schema) {
    const dropping = schema;
    schema = null;
    await admin((c) => c.query(`DROP SCHEMA IF EXISTS ${dropping} CASCADE`));
  }
}
