import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { signUp, SITE, TEST_AUTH_SECRET, type TestUser } from '../__tests__/helpers/auth.js';
import {
  closeTestDatabase,
  hasTestDatabase,
  resetTables,
  useTestDatabase,
} from '../__tests__/helpers/testDb.js';
import { FREE_GARAGE_LIMIT, PRO_GARAGE_LIMIT } from '../types/account.types.js';
import app from '../app.js';
import { getAllCars } from '../services/car.service.js';
import { setUserPlan } from '../db/user-store.js';

// Real sign-ins through Better Auth: each test signs its users up afresh.
const as = (user: TestUser) => ({ cookie: user.cookie, origin: SITE });

let carIds: string[];
let userA: TestUser;
let userB: TestUser;

describe.skipIf(!hasTestDatabase)('account API', () => {
  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET = TEST_AUTH_SECRET;
    await useTestDatabase();
    carIds = getAllCars()
      .slice(0, 40)
      .map((c) => c.id);
  });
  beforeEach(async () => {
    await resetTables();
    userA = await signUp(app, 'a@example.com');
    userB = await signUp(app, 'b@example.com');
  });
  afterAll(async () => {
    delete process.env.BETTER_AUTH_SECRET;
    await closeTestDatabase();
  });

  describe('authentication', () => {
    it('rejects requests without a session', async () => {
      expect((await request(app).get('/api/me')).status).toBe(401);
    });

    it('rejects a forged session cookie', async () => {
      const res = await request(app)
        .get('/api/me')
        .set('cookie', 'better-auth.session_token=forged.signature');
      expect(res.status).toBe(401);
    });

    it('creates the account on first signed-in call, with the sign-in email', async () => {
      const res = await request(app).get('/api/me').set(as(userA));
      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({
        id: userA.id,
        email: 'a@example.com',
        plan: 'free',
      });
      expect(res.body.data.garageLimit).toBe(FREE_GARAGE_LIMIT);
    });

    it('refuses a signed-in write sent from another site', async () => {
      const res = await request(app)
        .post('/api/me/garage/items')
        .set({ cookie: userA.cookie, origin: 'https://evil.example' })
        .send({ carId: carIds[0] });
      expect(res.status).toBe(403);
    });

    it('ends the session at sign-out', async () => {
      const out = await request(app).post('/api/auth/sign-out').set(as(userA)).send({});
      expect(out.status).toBe(200);
      // The browser's cookies are cleared...
      const cleared = (out.headers['set-cookie'] as unknown as string[]).map(
        (c) => c.split(';')[0],
      );
      expect(cleared.length).toBeGreaterThan(0);
      expect(cleared.every((c) => c.endsWith('='))).toBe(true);
      // ...and the session itself is gone: its token no longer signs anyone in.
      const token = userA.cookie
        .split('; ')
        .filter((c) => c.startsWith('better-auth.session_token='))
        .join('; ');
      expect((await request(app).get('/api/me').set('cookie', token)).status).toBe(401);
    });
  });

  describe('garage', () => {
    it('adds, lists and removes vehicles', async () => {
      const add = await request(app)
        .post('/api/me/garage/items')
        .set(as(userA))
        .send({ carId: carIds[0] });
      expect(add.status).toBe(200);
      expect(add.body.data.ids).toEqual([carIds[0]]);

      const list = await request(app).get('/api/me/garage').set(as(userA));
      expect(list.body.data.cars.map((c: { id: string }) => c.id)).toEqual([carIds[0]]);

      const del = await request(app)
        .delete(`/api/me/garage/items/${encodeURIComponent(carIds[0])}`)
        .set(as(userA));
      expect(del.body.data.ids).toEqual([]);
    });

    it('refuses to add a vehicle that does not exist', async () => {
      const res = await request(app)
        .post('/api/me/garage/items')
        .set(as(userA))
        .send({ carId: 'not-a-real-car' });
      expect(res.status).toBe(404);
    });

    it('keeps each user’s garage private', async () => {
      await request(app).post('/api/me/garage/items').set(as(userA)).send({ carId: carIds[0] });
      const other = await request(app).get('/api/me/garage').set(as(userB));
      expect(other.body.data.ids).toEqual([]);
    });

    it('enforces the free cap with a machine-readable error', async () => {
      const res = await request(app)
        .put('/api/me/garage')
        .set(as(userA))
        .send({ carIds: carIds.slice(0, FREE_GARAGE_LIMIT + 1) });
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ code: 'GARAGE_LIMIT', limit: FREE_GARAGE_LIMIT });
    });

    it('lets Pro save past the free cap', async () => {
      await request(app).get('/api/me').set(as(userA)); // create the account
      await setUserPlan(userA.id, 'pro');
      const res = await request(app)
        .put('/api/me/garage')
        .set(as(userA))
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
        .set(as(userA))
        .send({ carIds: [carIds[0], 'ghost-car', 42, null, '', 'x'.repeat(500), carIds[1]] });
      expect(res.status).toBe(200);
      expect(new Set(res.body.data.ids)).toEqual(new Set([carIds[0], carIds[1]]));
    });

    it('rejects an oversized sync before touching the database', async () => {
      const res = await request(app)
        .put('/api/me/garage')
        .set(as(userA))
        .send({ carIds: Array.from({ length: PRO_GARAGE_LIMIT + 1 }, (_, i) => `car-${i}`) });
      expect(res.status).toBe(413);
    });

    it('requires a carIds array', async () => {
      const res = await request(app).put('/api/me/garage').set(as(userA)).send({ carIds: 'nope' });
      expect(res.status).toBe(400);
    });
  });
});
