import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closeTestDatabase,
  hasTestDatabase,
  resetTables,
  useTestDatabase,
} from '../__tests__/helpers/testDb.js';
import { FREE_GARAGE_LIMIT, PRO_GARAGE_LIMIT } from '../types/account.types.js';

// Clerk is the one external dependency here. A bearer token of the form
// "test:<userId>" verifies as that user; anything else is rejected, the way an
// expired or forged session token would be.
vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn(async (token: string) => {
    if (!token.startsWith('test:')) throw new Error('invalid token');
    return { sub: token.slice('test:'.length) };
  }),
  createClerkClient: () => ({
    users: {
      getUser: async (id: string) => ({
        primaryEmailAddressId: 'email_1',
        emailAddresses: [{ id: 'email_1', emailAddress: `${id}@example.com` }],
      }),
    },
  }),
}));

const { default: app } = await import('../app.js');
const { getAllCars } = await import('../services/car.service.js');
const { setUserPlan } = await import('../db/user-store.js');

const as = (userId: string) => ({ authorization: `Bearer test:${userId}` });

let carIds: string[];

describe.skipIf(!hasTestDatabase)('account API', () => {
  beforeAll(async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_clerk';
    await useTestDatabase();
    carIds = getAllCars()
      .slice(0, 40)
      .map((c) => c.id);
  });
  beforeEach(resetTables);
  afterAll(async () => {
    delete process.env.CLERK_SECRET_KEY;
    await closeTestDatabase();
  });

  describe('authentication', () => {
    it('rejects requests without a token', async () => {
      expect((await request(app).get('/api/me')).status).toBe(401);
    });

    it('rejects an invalid token', async () => {
      const res = await request(app).get('/api/me').set('authorization', 'Bearer forged');
      expect(res.status).toBe(401);
    });

    it('creates the account on first authenticated call, with the Clerk email', async () => {
      const res = await request(app).get('/api/me').set(as('user_a'));
      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({
        id: 'user_a',
        email: 'user_a@example.com',
        plan: 'free',
      });
      expect(res.body.data.garageLimit).toBe(FREE_GARAGE_LIMIT);
    });
  });

  describe('garage', () => {
    it('adds, lists and removes vehicles', async () => {
      const add = await request(app)
        .post('/api/me/garage/items')
        .set(as('user_a'))
        .send({ carId: carIds[0] });
      expect(add.status).toBe(200);
      expect(add.body.data.ids).toEqual([carIds[0]]);

      const list = await request(app).get('/api/me/garage').set(as('user_a'));
      expect(list.body.data.cars.map((c: { id: string }) => c.id)).toEqual([carIds[0]]);

      const del = await request(app)
        .delete(`/api/me/garage/items/${encodeURIComponent(carIds[0])}`)
        .set(as('user_a'));
      expect(del.body.data.ids).toEqual([]);
    });

    it('refuses to add a vehicle that does not exist', async () => {
      const res = await request(app)
        .post('/api/me/garage/items')
        .set(as('user_a'))
        .send({ carId: 'not-a-real-car' });
      expect(res.status).toBe(404);
    });

    it('keeps each user’s garage private', async () => {
      await request(app).post('/api/me/garage/items').set(as('user_a')).send({ carId: carIds[0] });
      const other = await request(app).get('/api/me/garage').set(as('user_b'));
      expect(other.body.data.ids).toEqual([]);
    });

    it('enforces the free cap with a machine-readable error', async () => {
      const res = await request(app)
        .put('/api/me/garage')
        .set(as('user_a'))
        .send({ carIds: carIds.slice(0, FREE_GARAGE_LIMIT + 1) });
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ code: 'GARAGE_LIMIT', limit: FREE_GARAGE_LIMIT });
    });

    it('lets Pro save past the free cap', async () => {
      await request(app).get('/api/me').set(as('user_pro')); // create the account
      await setUserPlan('user_pro', 'pro');
      const res = await request(app)
        .put('/api/me/garage')
        .set(as('user_pro'))
        .send({ carIds: carIds.slice(0, FREE_GARAGE_LIMIT + 5) });
      expect(res.status).toBe(200);
      expect(res.body.data.ids).toHaveLength(FREE_GARAGE_LIMIT + 5);
      expect(res.body.data.garageLimit).toBeNull();
    });

    it('drops unknown and malformed ids from a sync instead of storing junk', async () => {
      // Regression: PUT used to persist any string, so a sync could plant rows
      // that failed to resolve on every later read.
      const res = await request(app)
        .put('/api/me/garage')
        .set(as('user_a'))
        .send({ carIds: [carIds[0], 'ghost-car', 42, null, '', 'x'.repeat(500), carIds[1]] });
      expect(res.status).toBe(200);
      expect(new Set(res.body.data.ids)).toEqual(new Set([carIds[0], carIds[1]]));
    });

    it('rejects an oversized sync before touching the database', async () => {
      const res = await request(app)
        .put('/api/me/garage')
        .set(as('user_a'))
        .send({ carIds: Array.from({ length: PRO_GARAGE_LIMIT + 1 }, (_, i) => `car-${i}`) });
      expect(res.status).toBe(413);
    });

    it('requires a carIds array', async () => {
      const res = await request(app)
        .put('/api/me/garage')
        .set(as('user_a'))
        .send({ carIds: 'nope' });
      expect(res.status).toBe(400);
    });
  });
});
