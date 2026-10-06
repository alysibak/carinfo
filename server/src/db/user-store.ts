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
            created_at AS "createdAt"
     FROM users WHERE id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    email: rows[0].email,
    plan: rows[0].plan as UserPlan,
    stripeCustomerId: rows[0].stripeCustomerId,
    createdAt: new Date(rows[0].createdAt).toISOString(),
  };
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
  return getGarageIds(userId);
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
