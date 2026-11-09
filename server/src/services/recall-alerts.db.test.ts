import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { signUp, SITE, TEST_AUTH_SECRET, type TestUser } from '../__tests__/helpers/auth.js';
import {
  closeTestDatabase,
  hasTestDatabase,
  resetTables,
  useTestDatabase,
} from '../__tests__/helpers/testDb.js';
import app from '../app.js';
import { __setEmailSenderForTests, type EmailMessage } from '../auth/email.js';
import { getPool } from '../db/pool.js';
import { setGarageIds, withRecallAlertLock } from '../db/user-store.js';
import { getAllCars } from './car.service.js';
import { recallsForCar, runRecallAlerts } from './recall-alerts.service.js';
import { unsubscribeToken } from '../utils/unsubscribe-token.js';

const ENV = {
  BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'CarInfo <alerts@carinfo.example>',
  SITE_URL: 'https://carinfo.example',
  CRON_SECRET: 'cron-secret-for-tests',
};

let sent: EmailMessage[];
let recalledIds: string[];
let user: TestUser;

/** The session cookie without its five-minute cache, so the next call reads the database. */
const freshly = (u: TestUser) => ({
  cookie: u.cookie
    .split('; ')
    .filter((c) => c.startsWith('better-auth.session_token='))
    .join('; '),
  origin: SITE,
});

async function confirmEmail(u: TestUser) {
  await getPool().query(`UPDATE auth_user SET email_verified = TRUE WHERE id = $1`, [u.id]);
}

async function count(table: string, userId: string, where = 'TRUE') {
  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE user_id = $1 AND ${where}`,
    [userId],
  );
  return rows[0].n as number;
}

describe.skipIf(!hasTestDatabase)('recall alerts (Postgres)', () => {
  beforeAll(async () => {
    Object.assign(process.env, ENV);
    await useTestDatabase();
    __setEmailSenderForTests(async (message) => {
      sent.push(message);
    });
    recalledIds = getAllCars()
      .filter((c) => (recallsForCar(c.id)?.recalls.length ?? 0) >= 2)
      .slice(0, 3)
      .map((c) => c.id);
  });
  beforeEach(async () => {
    await resetTables();
    user = await signUp(app, 'driver@example.com');
    // Sign-up's own confirmation email is not an alert.
    sent = [];
  });
  afterAll(async () => {
    __setEmailSenderForTests(null);
    for (const key of Object.keys(ENV)) delete process.env[key];
    await closeTestDatabase();
  });

  async function turnOn(u = user) {
    await confirmEmail(u);
    const res = await request(app)
      .put('/api/me/alerts')
      .set(freshly(u))
      .send({ recallAlerts: true });
    expect(res.status).toBe(200);
  }

  it('turns on only for a confirmed address', async () => {
    const res = await request(app).put('/api/me/alerts').set(freshly(user)).send({
      recallAlerts: true,
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_UNVERIFIED');
    await turnOn();
    const me = await request(app).get('/api/me').set(freshly(user));
    expect(me.body.data.user.recallAlerts).toBe(true);
  });

  it('sends no backlog, then each new recall once', async () => {
    const carId = recalledIds[0];
    const listed = recallsForCar(carId)!.recalls;
    await request(app).post('/api/me/garage/items').set(freshly(user)).send({ carId });
    await turnOn();
    expect(await count('recall_watches', user.id)).toBe(1);
    expect(await count('recall_notices', user.id, 'sent_at IS NULL')).toBe(listed.length);

    expect((await runRecallAlerts()).emailed).toBe(0);

    // As if Transport Canada listed this one after the car was watched.
    await getPool().query(`DELETE FROM recall_notices WHERE user_id = $1 AND recall_number = $2`, [
      user.id,
      listed[0].number,
    ]);
    const run = await runRecallAlerts();
    expect(run).toMatchObject({ ran: true, emailed: 1, recalls: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('driver@example.com');
    expect(sent[0].text).toContain(listed[0].number);
    expect(sent[0].headers?.['List-Unsubscribe']).toContain(
      'https://carinfo.example/api/alerts/unsubscribe?token=',
    );
    expect(await count('recall_notices', user.id, 'sent_at IS NOT NULL')).toBe(1);

    expect((await runRecallAlerts()).emailed).toBe(0);
    expect(sent).toHaveLength(1);
  });

  it('watches a car saved later, or one the run finds unwatched, without an email', async () => {
    await turnOn();
    await request(app)
      .post('/api/me/garage/items')
      .set(freshly(user))
      .send({ carId: recalledIds[1] });
    expect(await count('recall_watches', user.id)).toBe(1);
    // Saved by a path that did not watch it.
    await setGarageIds(user.id, [recalledIds[1], recalledIds[2]], 'free');
    const run = await runRecallAlerts();
    expect(run).toMatchObject({ emailed: 0, newlyWatched: 1 });
    expect(await count('recall_watches', user.id)).toBe(2);
  });

  it('emails no one at an unconfirmed address', async () => {
    await request(app)
      .post('/api/me/garage/items')
      .set(freshly(user))
      .send({ carId: recalledIds[0] });
    await getPool().query(`UPDATE users SET recall_alerts = TRUE WHERE id = $1`, [user.id]);
    expect((await runRecallAlerts()).recipients).toBe(0);
  });

  it('forgets a car removed from the garage', async () => {
    const carId = recalledIds[0];
    await request(app).post('/api/me/garage/items').set(freshly(user)).send({ carId });
    await turnOn();
    await request(app).delete(`/api/me/garage/items/${carId}`).set(freshly(user));
    expect(await count('recall_watches', user.id)).toBe(0);
    expect(await count('recall_notices', user.id)).toBe(0);
  });

  it('unsubscribes from the email link, signed out, and forgets the history', async () => {
    await request(app)
      .post('/api/me/garage/items')
      .set(freshly(user))
      .send({ carId: recalledIds[0] });
    await turnOn();
    const bad = await request(app).post('/api/alerts/unsubscribe?token=nope');
    expect(bad.status).toBe(400);
    const token = unsubscribeToken(user.id)!;
    // A mail client's one-click unsubscribe: a form body, the token in the query.
    const res = await request(app)
      .post(`/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`)
      .type('form')
      .send('List-Unsubscribe=One-Click');
    expect(res.status).toBe(200);
    const me = await request(app).get('/api/me').set(freshly(user));
    expect(me.body.data.user.recallAlerts).toBe(false);
    expect(await count('recall_notices', user.id)).toBe(0);
  });

  it('downloads the account’s data, never a password', async () => {
    await request(app)
      .post('/api/me/garage/items')
      .set(freshly(user))
      .send({ carId: recalledIds[0] });
    await turnOn();
    const res = await request(app).get('/api/me/export').set(freshly(user));
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body.account.email).toBe('driver@example.com');
    expect(res.body.garage[0]).toMatchObject({ carId: recalledIds[0] });
    expect(res.body.recallAlerts.enabled).toBe(true);
    expect(res.body.recallAlerts.watching).toHaveLength(1);
    expect(res.body.signIn.sessions.length).toBeGreaterThan(0);
    expect(res.body.signIn.signInMethods[0].provider).toBe('credential');
    expect(JSON.stringify(res.body)).not.toMatch(/"password"|"token"|accessToken/);
  });

  it('runs from the cron call only with its secret, one run at a time', async () => {
    expect((await request(app).get('/api/cron/recall-alerts')).status).toBe(401);
    const wrong = await request(app)
      .get('/api/cron/recall-alerts')
      .set('authorization', 'Bearer wrong');
    expect(wrong.status).toBe(401);
    const ok = await request(app)
      .get('/api/cron/recall-alerts')
      .set('authorization', `Bearer ${ENV.CRON_SECRET}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.ran).toBe(true);

    const inner = await withRecallAlertLock(() => runRecallAlerts());
    expect(inner?.reason).toBe('Another run is in progress');

    delete process.env.CRON_SECRET;
    expect((await request(app).get('/api/cron/recall-alerts')).status).toBe(503);
    process.env.CRON_SECRET = ENV.CRON_SECRET;
  });
});
