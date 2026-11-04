import {
  FREE_GARAGE_LIMIT,
  PRO_GARAGE_LIMIT,
  type AccountUser,
  type UserPlan,
} from '../types/account.types.js';
import { ensureSchema, getPool, isDatabaseConfigured } from './pool.js';

export class GarageLimitError extends Error {
  readonly limit: number;
  constructor(limit: number, plan: UserPlan = 'free') {
    super(
      plan === 'pro'
        ? `A garage can hold up to ${limit} vehicles.`
        : `Free plan allows up to ${limit} saved vehicles. Upgrade to Pro for unlimited garage.`,
    );
    this.name = 'GarageLimitError';
    this.limit = limit;
  }
}

export function isAccountsStorageReady(): boolean {
  return isDatabaseConfigured();
}

export async function ensureUser(id: string, email?: string | null): Promise<AccountUser> {
  await ensureSchema();
  const pool = getPool();
  await pool.query(
    `INSERT INTO users (id, email)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email)`,
    [id, email ?? null],
  );
  const user = await getUser(id);
  if (!user) throw new Error('Failed to upsert user');
  return user;
}

export async function getUser(id: string): Promise<AccountUser | null> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT id, email, plan, stripe_customer_id AS "stripeCustomerId",
            recall_alerts AS "recallAlerts", created_at AS "createdAt"
     FROM users WHERE id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    email: rows[0].email,
    plan: rows[0].plan as UserPlan,
    stripeCustomerId: rows[0].stripeCustomerId,
    recallAlerts: rows[0].recallAlerts === true,
    createdAt: new Date(rows[0].createdAt).toISOString(),
  };
}

// ─── Recall alerts ───────────────────────────────────────────────────────────

/**
 * Turns recall alerts on or off. Off forgets what was watched and sent: it is
 * kept only to send each recall once, and turning alerts back on starts over.
 */
export async function setRecallAlerts(userId: string, enabled: boolean): Promise<void> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET recall_alerts = $2 WHERE id = $1`, [userId, enabled]);
    if (!enabled) {
      await client.query(`DELETE FROM recall_watches WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM recall_notices WHERE user_id = $1`, [userId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Starts watching cars for recalls, and returns those not watched before.
 * `reset` forgets every earlier watch and notice first.
 */
export async function watchCars(
  userId: string,
  carIds: string[],
  { reset = false }: { reset?: boolean } = {},
): Promise<string[]> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (reset) {
      await client.query(`DELETE FROM recall_watches WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM recall_notices WHERE user_id = $1`, [userId]);
    }
    const { rows } = carIds.length
      ? await client.query(
          `INSERT INTO recall_watches (user_id, car_id)
           SELECT $1, car_id FROM unnest($2::text[]) AS car_id
           ON CONFLICT DO NOTHING
           RETURNING car_id`,
          [userId, Array.from(new Set(carIds))],
        )
      : { rows: [] };
    await client.query('COMMIT');
    return rows.map((r) => r.car_id as string);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getWatchedCarIds(userId: string): Promise<Set<string>> {
  await ensureSchema();
  const { rows } = await getPool().query(`SELECT car_id FROM recall_watches WHERE user_id = $1`, [
    userId,
  ]);
  return new Set(rows.map((r) => r.car_id as string));
}

export async function listRecallWatches(
  userId: string,
): Promise<Array<{ carId: string; since: string }>> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT car_id AS "carId", since FROM recall_watches WHERE user_id = $1 ORDER BY since, car_id`,
    [userId],
  );
  return rows.map((row) => ({ carId: row.carId, since: new Date(row.since).toISOString() }));
}

export interface RecallNoticeKey {
  carId: string;
  recallNumber: string;
}

/**
 * Notes recalls as known for a user's cars: sent (an alert went out) or not
 * (already listed when the car was first watched). A recall noted either way
 * is never emailed again.
 */
export async function recordRecallNotices(
  userId: string,
  notices: RecallNoticeKey[],
  sent: boolean,
): Promise<void> {
  if (!notices.length) return;
  await ensureSchema();
  await getPool().query(
    `INSERT INTO recall_notices (user_id, car_id, recall_number, sent_at)
     SELECT $1, n.car_id, n.recall_number, CASE WHEN $4::boolean THEN NOW() END
     FROM unnest($2::text[], $3::text[]) AS n(car_id, recall_number)
     ON CONFLICT (user_id, car_id, recall_number) DO UPDATE
       SET sent_at = COALESCE(recall_notices.sent_at, EXCLUDED.sent_at)`,
    [userId, notices.map((n) => n.carId), notices.map((n) => n.recallNumber), sent],
  );
}

/** The recalls already noted for each of a user's cars. */
export async function getRecallNoticeNumbers(userId: string): Promise<Map<string, Set<string>>> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT car_id, recall_number FROM recall_notices WHERE user_id = $1`,
    [userId],
  );
  const byCar = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = byCar.get(row.car_id) ?? new Set<string>();
    set.add(row.recall_number);
    byCar.set(row.car_id, set);
  }
  return byCar;
}

export interface RecallNoticeRow extends RecallNoticeKey {
  sentAt: string | null;
  createdAt: string;
}

export async function listRecallNotices(userId: string): Promise<RecallNoticeRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT car_id AS "carId", recall_number AS "recallNumber", sent_at AS "sentAt",
            created_at AS "createdAt"
     FROM recall_notices WHERE user_id = $1 ORDER BY created_at, car_id, recall_number`,
    [userId],
  );
  return rows.map((row) => ({
    carId: row.carId,
    recallNumber: row.recallNumber,
    sentAt: row.sentAt ? new Date(row.sentAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

export interface RecallAlertRecipient {
  userId: string;
  email: string;
  name: string | null;
}

/**
 * Who gets recall alerts: those who asked, at a confirmed address. An
 * unconfirmed one could be someone else's, typed by mistake or on purpose.
 */
export async function listRecallAlertRecipients(): Promise<RecallAlertRecipient[]> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT u.id AS "userId", a.email, NULLIF(a.name, '') AS name
     FROM users u JOIN auth_user a ON a.id = u.id
     WHERE u.recall_alerts AND a.email_verified
     ORDER BY u.id`,
  );
  return rows as RecallAlertRecipient[];
}

/**
 * Holds the recall-alert run's lock for the length of `fn`, so two runs (a
 * retried cron call, a manual run) never email the same recall twice.
 * Returns null without running `fn` when another run holds it.
 */
export async function withRecallAlertLock<T>(fn: () => Promise<T>): Promise<T | null> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `SELECT pg_try_advisory_lock(hashtext('carinfo-recall-alerts')) AS locked`,
    );
    if (!rows[0]?.locked) return null;
    try {
      return await fn();
    } finally {
      await client.query(`SELECT pg_advisory_unlock(hashtext('carinfo-recall-alerts'))`);
    }
  } finally {
    client.release();
  }
}

export async function setUserPlan(
  id: string,
  plan: UserPlan,
  stripeCustomerId?: string | null,
): Promise<void> {
  await ensureSchema();
  if (stripeCustomerId != null) {
    await getPool().query(
      `UPDATE users SET plan = $2, stripe_customer_id = COALESCE($3, stripe_customer_id) WHERE id = $1`,
      [id, plan, stripeCustomerId],
    );
  } else {
    await getPool().query(`UPDATE users SET plan = $2 WHERE id = $1`, [id, plan]);
  }
}

export async function setStripeCustomerId(id: string, stripeCustomerId: string): Promise<void> {
  await ensureSchema();
  await getPool().query(`UPDATE users SET stripe_customer_id = $2 WHERE id = $1`, [
    id,
    stripeCustomerId,
  ]);
}

export async function findUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<AccountUser | null> {
  await ensureSchema();
  const { rows } = await getPool().query(`SELECT id FROM users WHERE stripe_customer_id = $1`, [
    stripeCustomerId,
  ]);
  if (!rows[0]) return null;
  return getUser(rows[0].id);
}

export async function getGarageIds(userId: string): Promise<string[]> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT car_id FROM garage_items WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId],
  );
  return rows.map((r) => r.car_id as string);
}

/**
 * Replace garage contents. Enforces free-plan cap unless plan is pro.
 * Returns the saved ID list.
 */
export async function setGarageIds(
  userId: string,
  carIds: string[],
  plan: UserPlan,
): Promise<string[]> {
  await ensureSchema();
  const unique = Array.from(new Set(carIds.filter(Boolean)));

  if (plan !== 'pro' && unique.length > FREE_GARAGE_LIMIT) {
    throw new GarageLimitError(FREE_GARAGE_LIMIT);
  }
  // "Unlimited" is a plan promise, not an invitation to hold a pool connection
  // open while we insert a hundred thousand rows. Pro still gets a hard ceiling.
  if (unique.length > PRO_GARAGE_LIMIT) {
    throw new GarageLimitError(PRO_GARAGE_LIMIT, 'pro');
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM garage_items WHERE user_id = $1`, [userId]);
    // A car no longer saved is no longer watched for recalls.
    for (const table of ['recall_watches', 'recall_notices']) {
      await client.query(
        `DELETE FROM ${table} WHERE user_id = $1 AND NOT (car_id = ANY($2::text[]))`,
        [userId, unique],
      );
    }
    if (unique.length > 0) {
      // One statement instead of one round trip per car. A 200-car pro garage
      // went from 201 queries to 2.
      await client.query(
        `INSERT INTO garage_items (user_id, car_id)
         SELECT $1, car_id FROM unnest($2::text[]) AS car_id
         ON CONFLICT DO NOTHING`,
        [userId, unique],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getGarageIds(userId);
}

export async function addGarageId(
  userId: string,
  carId: string,
  plan: UserPlan,
): Promise<string[]> {
  const existing = await getGarageIds(userId);
  if (existing.includes(carId)) return existing;
  return setGarageIds(userId, [...existing, carId], plan);
}

export async function removeGarageId(userId: string, carId: string): Promise<string[]> {
  await ensureSchema();
  await getPool().query(`DELETE FROM garage_items WHERE user_id = $1 AND car_id = $2`, [
    userId,
    carId,
  ]);
  for (const table of ['recall_watches', 'recall_notices']) {
    await getPool().query(`DELETE FROM ${table} WHERE user_id = $1 AND car_id = $2`, [
      userId,
      carId,
    ]);
  }
  return getGarageIds(userId);
}

/** Saved cars with when each was saved, for the account's data download. */
export async function listGarageItems(
  userId: string,
): Promise<Array<{ carId: string; savedAt: string }>> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT car_id AS "carId", created_at AS "savedAt" FROM garage_items
     WHERE user_id = $1 ORDER BY created_at, car_id`,
    [userId],
  );
  return rows.map((row) => ({ carId: row.carId, savedAt: new Date(row.savedAt).toISOString() }));
}

/**
 * What sign-in keeps about a user (Better Auth's tables), for the data
 * download: the profile, linked providers, and sessions. Never a password
 * hash or a token.
 */
export async function exportSignInData(userId: string): Promise<{
  profile: {
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
  } | null;
  signInMethods: Array<{ provider: string; linkedAt: string }>;
  sessions: Array<{
    startedAt: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
}> {
  await ensureSchema();
  const pool = getPool();
  const [profile, accounts, sessions] = await Promise.all([
    pool.query(
      `SELECT name, email, email_verified AS "emailVerified", image, created_at AS "createdAt"
       FROM auth_user WHERE id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT provider_id AS provider, created_at AS "linkedAt" FROM auth_account
       WHERE user_id = $1 ORDER BY created_at`,
      [userId],
    ),
    pool.query(
      `SELECT created_at AS "startedAt", expires_at AS "expiresAt", ip_address AS "ipAddress",
              user_agent AS "userAgent"
       FROM auth_session WHERE user_id = $1 ORDER BY created_at`,
      [userId],
    ),
  ]);
  const iso = (value: unknown) => new Date(value as string).toISOString();
  const row = profile.rows[0];
  return {
    profile: row
      ? {
          name: row.name,
          email: row.email,
          emailVerified: row.emailVerified === true,
          image: row.image ?? null,
          createdAt: iso(row.createdAt),
        }
      : null,
    signInMethods: accounts.rows.map((a) => ({ provider: a.provider, linkedAt: iso(a.linkedAt) })),
    sessions: sessions.rows.map((s) => ({
      startedAt: iso(s.startedAt),
      expiresAt: iso(s.expiresAt),
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? null,
    })),
  };
}

/**
 * Move accounts made before the switch to Better Auth (Clerk's, ids
 * `user_…`) to the signed-in user with the same confirmed address: plan,
 * Stripe customer and garage. An old account is one with no sign-in of its
 * own. Callers pass only a confirmed address, or anyone could sign up with
 * another person's email and take their garage and plan.
 *
 * Returns whether anything moved.
 */
export async function claimLegacyAccount(userId: string, email: string): Promise<boolean> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: legacy } = await client.query(
      `SELECT id, plan, stripe_customer_id FROM users u
       WHERE lower(u.email) = lower($2) AND u.id <> $1
         AND NOT EXISTS (SELECT 1 FROM auth_user a WHERE a.id = u.id)
       ORDER BY u.created_at
       FOR UPDATE`,
      [userId, email],
    );
    if (legacy.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(
      `INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [userId, email],
    );
    for (const old of legacy) {
      // stripe_customer_id is unique: free it before the new row takes it.
      await client.query(`UPDATE users SET stripe_customer_id = NULL WHERE id = $1`, [old.id]);
      const { rows } = await client.query(
        `UPDATE users
         SET plan = CASE WHEN $2 = 'pro' THEN 'pro' ELSE plan END,
             stripe_customer_id = COALESCE(stripe_customer_id, $3)
         WHERE id = $1
         RETURNING stripe_customer_id`,
        [userId, old.plan, old.stripe_customer_id],
      );
      if (old.stripe_customer_id && rows[0]?.stripe_customer_id !== old.stripe_customer_id) {
        console.warn(
          `[account] ${userId} keeps Stripe customer ${rows[0]?.stripe_customer_id}; ` +
            `${old.stripe_customer_id} from ${old.id} is no longer linked to an account`,
        );
      }
      await client.query(
        `INSERT INTO garage_items (user_id, car_id, created_at)
         SELECT $1, car_id, created_at FROM garage_items WHERE user_id = $2
         ON CONFLICT DO NOTHING`,
        [userId, old.id],
      );
      await client.query(`DELETE FROM users WHERE id = $1`, [old.id]);
    }
    await client.query('COMMIT');
    console.log(`[account] moved ${legacy.map((r) => r.id).join(', ')} to ${userId}`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** A deleted sign-in's plan and garage. */
export async function deleteAccountData(userId: string): Promise<void> {
  await ensureSchema();
  await getPool().query(`DELETE FROM users WHERE id = $1`, [userId]);
}
