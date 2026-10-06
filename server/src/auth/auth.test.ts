import request from 'supertest';
import { getMigrations } from 'better-auth/db/migration';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cookiesOf,
  signUp,
  SITE,
  TEST_AUTH_SECRET,
  type TestUser,
} from '../__tests__/helpers/auth.js';
import {
  closeTestDatabase,
  hasTestDatabase,
  resetTables,
  useTestDatabase,
} from '../__tests__/helpers/testDb.js';
import app from '../app.js';
import { getPool } from '../db/pool.js';
import { getGarageIds, getUser, setUserPlan } from '../db/user-store.js';
import { getAllCars } from '../services/car.service.js';
import { __resetAuthForTests, authOptions } from './auth.js';
import { __setEmailSenderForTests, type EmailMessage } from './email.js';

const as = (user: TestUser) => ({ cookie: user.cookie, origin: SITE });

let sent: EmailMessage[] = [];

/** The link in the last email to `to`, as a path this app serves. */
function linkSentTo(to: string): string {
  const message = sent.filter((m) => m.to === to).at(-1);
  if (!message) throw new Error(`no email to ${to}`);
  const url = new URL(/https?:\/\/\S+/.exec(message.text)![0]);
  return `${url.pathname}${url.search}`;
}

describe.skipIf(!hasTestDatabase)('sign-in', () => {
  let carIds: string[];

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET = TEST_AUTH_SECRET;
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'CarInfo <accounts@example.com>';
    __setEmailSenderForTests(async (message) => {
      sent.push(message);
    });
    await useTestDatabase();
    carIds = getAllCars()
      .slice(0, 3)
      .map((c) => c.id);
  });
  beforeEach(async () => {
    await resetTables();
    sent = [];
  });
  afterAll(async () => {
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    __setEmailSenderForTests(null);
    __resetAuthForTests();
    await closeTestDatabase();
  });

  it('makes exactly the tables Better Auth would', async () => {
    // pool.ts writes them out; an upgrade that wants more fails here.
    const migrations = await getMigrations(authOptions(getPool()));
    expect(migrations.toBeCreated.map((t) => t.table)).toEqual([]);
    expect(migrations.toBeAdded.map((t) => t.table)).toEqual([]);
  });

  it('says what sign-in offers', async () => {
    const res = await request(app).get('/api/me/status');
    expect(res.body.data).toMatchObject({
      authConfigured: true,
      emailConfigured: true,
      googleSignIn: false,
    });
  });

  it('signs in with the password, and not without it', async () => {
    await signUp(app, 'driver@example.com');
    const wrong = await request(app)
      .post('/api/auth/sign-in/email')
      .set('origin', SITE)
      .send({ email: 'driver@example.com', password: 'not the password' });
    expect(wrong.status).toBe(401);
    const right = await request(app)
      .post('/api/auth/sign-in/email')
      .set('origin', SITE)
      .send({ email: 'driver@example.com', password: 'correct horse battery' });
    expect(right.status).toBe(200);
    expect((await request(app).get('/api/me').set('cookie', cookiesOf(right))).status).toBe(200);
  });

  it('refuses a sign-in posted from another site', async () => {
    await signUp(app, 'driver@example.com');
    const res = await request(app)
      .post('/api/auth/sign-in/email')
      .set('origin', 'https://evil.example')
      .send({ email: 'driver@example.com', password: 'correct horse battery' });
    expect(res.status).toBe(403);
  });

  describe('an account from before (Clerk)', () => {
    beforeEach(async () => {
      await getPool().query(
        `INSERT INTO users (id, email, plan, stripe_customer_id) VALUES ('user_2old', 'Old@Example.com', 'pro', 'cus_old')`,
      );
      await getPool().query(
        `INSERT INTO garage_items (user_id, car_id) SELECT 'user_2old', unnest($1::text[])`,
        [carIds],
      );
    });

    it('moves to the new sign-in once the address is confirmed', async () => {
      const user = await signUp(app, 'old@example.com');
      // Unconfirmed: anyone could have typed this address.
      const before = await request(app).get('/api/me').set(as(user));
      expect(before.body.data.user.plan).toBe('free');
      expect(before.body.data.garageIds).toEqual([]);

      const confirm = await request(app).get(linkSentTo('old@example.com'));
      expect(confirm.status).toBe(302);

      expect(await getUser(user.id)).toMatchObject({ plan: 'pro', stripeCustomerId: 'cus_old' });
      expect(new Set(await getGarageIds(user.id))).toEqual(new Set(carIds));
      expect(await getUser('user_2old')).toBeNull();
    });

    it('stays put for a different address', async () => {
      const user = await signUp(app, 'new@example.com');
      await request(app).get(linkSentTo('new@example.com'));
      expect((await getUser(user.id))?.plan ?? 'free').toBe('free');
      expect(await getUser('user_2old')).toMatchObject({ plan: 'pro' });
    });
  });

  it('resets a forgotten password through the emailed link', async () => {
    const user = await signUp(app, 'forgetful@example.com', 'first password 1');
    const ask = await request(app)
      .post('/api/auth/request-password-reset')
      .set('origin', SITE)
      .send({ email: 'forgetful@example.com', redirectTo: '/reset-password' });
    expect(ask.status).toBe(200);

    // The link checks the token, then sends the browser to the site's form.
    const follow = await request(app).get(linkSentTo('forgetful@example.com'));
    expect(follow.status).toBe(302);
    const token = new URL(follow.headers.location, SITE).searchParams.get('token');
    expect(token).toBeTruthy();

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .set('origin', SITE)
      .send({ token, newPassword: 'second password 2' });
    expect(reset.status).toBe(200);

    const signIn = (password: string) =>
      request(app)
        .post('/api/auth/sign-in/email')
        .set('origin', SITE)
        .send({ email: 'forgetful@example.com', password });
    expect((await signIn('first password 1')).status).toBe(401);
    expect((await signIn('second password 2')).status).toBe(200);
    // Sessions from before the reset end with it.
    expect((await request(app).get('/api/me').set('cookie', sessionTokenOf(user))).status).toBe(
      401,
    );
  });

  it('deletes the account and its garage', async () => {
    const user = await signUp(app, 'leaving@example.com');
    await request(app).post('/api/me/garage/items').set(as(user)).send({ carId: carIds[0] });
    const res = await request(app)
      .post('/api/auth/delete-user')
      .set(as(user))
      .send({ password: 'correct horse battery' });
    expect(res.status).toBe(200);
    expect(await getUser(user.id)).toBeNull();
    expect(await getGarageIds(user.id)).toEqual([]);
  });

  it('keeps a Pro account until Pro is cancelled', async () => {
    const user = await signUp(app, 'subscriber@example.com');
    await request(app).get('/api/me').set(as(user));
    await setUserPlan(user.id, 'pro');
    const res = await request(app)
      .post('/api/auth/delete-user')
      .set(as(user))
      .send({ password: 'correct horse battery' });
    expect(res.status).toBe(400);
    expect(await getUser(user.id)).toMatchObject({ plan: 'pro' });
  });

  it('limits password guesses, not session checks', async () => {
    process.env.DISABLE_RATE_LIMIT = 'false';
    __resetAuthForTests();
    try {
      const guess = () =>
        request(app)
          .post('/api/auth/sign-in/email')
          .set({ origin: SITE, 'x-forwarded-for': '203.0.113.9' })
          .send({ email: 'nobody@example.com', password: 'guess guess' });
      const statuses = [];
      for (let i = 0; i < 4; i++) statuses.push((await guess()).status);
      expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
      expect(statuses[3]).toBe(429);

      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/auth/get-session').set('x-forwarded-for', '203.0.113.9');
      }
      const { rows } = await getPool().query(
        `SELECT key FROM auth_rate_limit WHERE key LIKE '%get-session%'`,
      );
      expect(rows).toEqual([]);
    } finally {
      process.env.DISABLE_RATE_LIMIT = 'true';
      __resetAuthForTests();
    }
  });

  it('opens the VIN decoder to members only', async () => {
    // A malformed VIN never reaches NHTSA: 400 means the sign-in check passed.
    expect((await request(app).get('/api/vin/short')).status).toBe(401);
    const user = await signUp(app, 'vin@example.com');
    const res = await request(app).get('/api/vin/short').set(as(user));
    expect(res.status).toBe(400);
    expect(res.headers['cache-control']).toBe('private, max-age=3600');
  });
});

/** Just the session token: what is left once the cached copy expires. */
function sessionTokenOf(user: TestUser): string {
  return user.cookie
    .split('; ')
    .filter((c) => c.startsWith('better-auth.session_token='))
    .join('; ');
}
