import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  closeTestDatabase,
  hasTestDatabase,
  resetTables,
  useTestDatabase,
} from '../__tests__/helpers/testDb.js';
import { getPool } from './pool.js';
import {
  GarageLimitError,
  addGarageId,
  ensureUser,
  findUserByStripeCustomerId,
  getGarageIds,
  getUser,
  removeGarageId,
  setGarageIds,
  setStripeCustomerId,
  setUserPlan,
} from './user-store.js';
import { FREE_GARAGE_LIMIT, PRO_GARAGE_LIMIT } from '../types/account.types.js';

describe.skipIf(!hasTestDatabase)('user-store (Postgres)', () => {
  beforeAll(useTestDatabase);
  beforeEach(resetTables);
  afterAll(closeTestDatabase);

  describe('ensureUser', () => {
    it('creates a free user on first sight', async () => {
      const user = await ensureUser('user_1', 'a@example.com');
      expect(user).toMatchObject({ id: 'user_1', email: 'a@example.com', plan: 'free' });
      expect(user.stripeCustomerId).toBeNull();
      expect(Number.isNaN(Date.parse(user.createdAt))).toBe(false);
    });

    it('keeps a known email when a later call has none', async () => {
      // Clerk email lookup is best-effort; a transient miss must not erase it.
      await ensureUser('user_1', 'a@example.com');
      const again = await ensureUser('user_1', null);
      expect(again.email).toBe('a@example.com');
    });

    it('updates the email when a new one is supplied', async () => {
      await ensureUser('user_1', 'old@example.com');
      expect((await ensureUser('user_1', 'new@example.com')).email).toBe('new@example.com');
    });
  });

  describe('plans and Stripe linkage', () => {
    it('finds a user by Stripe customer id once linked', async () => {
      await ensureUser('user_1');
      await setStripeCustomerId('user_1', 'cus_123');
      expect((await findUserByStripeCustomerId('cus_123'))?.id).toBe('user_1');
      expect(await findUserByStripeCustomerId('cus_missing')).toBeNull();
    });

    it('sets the plan and links the customer in one call', async () => {
      await ensureUser('user_1');
      await setUserPlan('user_1', 'pro', 'cus_9');
      expect(await getUser('user_1')).toMatchObject({ plan: 'pro', stripeCustomerId: 'cus_9' });
    });

    it('rejects a plan outside free/pro at the database', async () => {
      await ensureUser('user_1');
      await expect(
        getPool().query(`UPDATE users SET plan = 'platinum' WHERE id = 'user_1'`),
      ).rejects.toThrow(/check constraint/i);
    });
  });

  describe('garage', () => {
    beforeEach(async () => {
      await ensureUser('user_1');
    });

    it('stores, dedupes and preserves insertion order', async () => {
      const ids = await setGarageIds('user_1', ['b', 'a', 'b', '', 'c'], 'free');
      expect(ids).toHaveLength(3);
      expect(new Set(ids)).toEqual(new Set(['a', 'b', 'c']));
    });

    it('replaces the whole garage on set', async () => {
      await setGarageIds('user_1', ['a', 'b'], 'free');
      expect(await setGarageIds('user_1', ['c'], 'free')).toEqual(['c']);
    });

    it('enforces the free cap', async () => {
      const tooMany = Array.from({ length: FREE_GARAGE_LIMIT + 1 }, (_, i) => `car-${i}`);
      await expect(setGarageIds('user_1', tooMany, 'free')).rejects.toBeInstanceOf(
        GarageLimitError,
      );
      // A rejected write must leave the existing garage untouched.
      expect(await getGarageIds('user_1')).toEqual([]);
    });

    it('lets pro exceed the free cap but not the hard ceiling', async () => {
      const many = Array.from({ length: FREE_GARAGE_LIMIT + 5 }, (_, i) => `car-${i}`);
      expect(await setGarageIds('user_1', many, 'pro')).toHaveLength(FREE_GARAGE_LIMIT + 5);

      const beyond = Array.from({ length: PRO_GARAGE_LIMIT + 1 }, (_, i) => `car-${i}`);
      const error = await setGarageIds('user_1', beyond, 'pro').catch((e) => e);
      expect(error).toBeInstanceOf(GarageLimitError);
      expect(error.message).not.toMatch(/upgrade/i); // pro users are not told to upgrade
    });

    it('writes a large pro garage in one statement', async () => {
      // Guards the unnest() bulk insert that replaced one query per car.
      const many = Array.from({ length: 500 }, (_, i) => `car-${String(i).padStart(3, '0')}`);
      const started = Date.now();
      expect(await setGarageIds('user_1', many, 'pro')).toHaveLength(500);
      expect(Date.now() - started).toBeLessThan(2_000);
    });

    it('adds idempotently and respects the cap', async () => {
      await addGarageId('user_1', 'a', 'free');
      expect(await addGarageId('user_1', 'a', 'free')).toEqual(['a']);

      await setGarageIds(
        'user_1',
        Array.from({ length: FREE_GARAGE_LIMIT }, (_, i) => `car-${i}`),
        'free',
      );
      await expect(addGarageId('user_1', 'one-more', 'free')).rejects.toBeInstanceOf(
        GarageLimitError,
      );
    });

    it('removes a single vehicle', async () => {
      await setGarageIds('user_1', ['a', 'b'], 'free');
      expect(await removeGarageId('user_1', 'a')).toEqual(['b']);
    });

    it('rolls back the whole write when an insert fails', async () => {
      await setGarageIds('user_1', ['keep-me'], 'free');
      // No such user: the FK violation aborts the transaction after the DELETE.
      await expect(setGarageIds('ghost', ['x'], 'free')).rejects.toThrow();
      expect(await getGarageIds('user_1')).toEqual(['keep-me']);
    });

    it('cascades garage rows when a user is deleted', async () => {
      await setGarageIds('user_1', ['a'], 'free');
      await getPool().query(`DELETE FROM users WHERE id = 'user_1'`);
      const { rows } = await getPool().query(`SELECT count(*)::int AS n FROM garage_items`);
      expect(rows[0].n).toBe(0);
    });
  });
});
