import Stripe from 'stripe';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closeTestDatabase,
  hasTestDatabase,
  resetTables,
  useTestDatabase,
} from '../__tests__/helpers/testDb.js';
import app from '../app.js';
import { ensureUser, getUser, setStripeCustomerId } from '../db/user-store.js';
import { __setStripeFactoryForTests } from './billing.controller.js';

const WEBHOOK_SECRET = 'whsec_test_secret';

/** What Stripe's API reports the customer's subscriptions to be *right now*. */
let liveSubscriptions: Array<{ id: string; status: Stripe.Subscription.Status }> = [];
const listSubscriptions = vi.fn(async () => ({ data: liveSubscriptions }));

function stripeForTests(secretKey: string): Stripe {
  // A real client, so signature verification is the SDK's own — only the
  // outbound API call the handler makes is stubbed.
  const client = new Stripe(secretKey);
  (client.subscriptions as unknown as { list: typeof listSubscriptions }).list = listSubscriptions;
  return client;
}

function signedEvent(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({
    id: `evt_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    type,
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    data: { object },
  });
  const header = new Stripe('sk_test_x').webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  return { payload, header };
}

function post(event: { payload: string; header: string }) {
  return request(app)
    .post('/api/billing/webhook')
    .set('content-type', 'application/json')
    .set('stripe-signature', event.header)
    .send(event.payload);
}

describe.skipIf(!hasTestDatabase)('Stripe webhook', () => {
  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_PRICE_ID = 'price_test';
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    __setStripeFactoryForTests(stripeForTests);
    await useTestDatabase();
  });

  beforeEach(async () => {
    await resetTables();
    liveSubscriptions = [];
    listSubscriptions.mockClear();
  });

  afterAll(async () => {
    __setStripeFactoryForTests(null);
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_ID;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await closeTestDatabase();
  });

  describe('authenticity', () => {
    it('rejects a request with no signature', async () => {
      const res = await request(app)
        .post('/api/billing/webhook')
        .set('content-type', 'application/json')
        .send('{}');
      expect(res.status).toBe(400);
    });

    it('rejects a forged signature', async () => {
      const event = signedEvent('checkout.session.completed', { client_reference_id: 'user_1' });
      const res = await post({ ...event, header: event.header.replace(/v1=\w+/, 'v1=deadbeef') });
      expect(res.status).toBe(400);
      expect(await getUser('user_1')).toBeNull();
    });

    it('rejects a payload altered after signing', async () => {
      const event = signedEvent('checkout.session.completed', {
        client_reference_id: 'user_1',
        customer: 'cus_1',
      });
      const tampered = event.payload.replace('user_1', 'user_evil');
      const res = await post({ payload: tampered, header: event.header });
      expect(res.status).toBe(400);
    });
  });

  describe('checkout.session.completed', () => {
    it('grants Pro and links the customer once the subscription is active', async () => {
      liveSubscriptions = [{ id: 'sub_1', status: 'active' }];
      const res = await post(
        signedEvent('checkout.session.completed', {
          client_reference_id: 'user_1',
          customer: 'cus_1',
          customer_email: 'a@example.com',
        }),
      );
      expect(res.status).toBe(200);
      expect(await getUser('user_1')).toMatchObject({ plan: 'pro', stripeCustomerId: 'cus_1' });
    });

    it('does not grant Pro while a delayed payment is still pending', async () => {
      // Pre-authorized debit: checkout completes unpaid, subscription incomplete.
      liveSubscriptions = [{ id: 'sub_1', status: 'incomplete' }];
      await post(
        signedEvent('checkout.session.completed', {
          client_reference_id: 'user_1',
          customer: 'cus_1',
          payment_status: 'unpaid',
        }),
      );
      expect(await getUser('user_1')).toMatchObject({ plan: 'free', stripeCustomerId: 'cus_1' });

      // Payment clears later; the subscription event brings them to Pro.
      liveSubscriptions = [{ id: 'sub_1', status: 'active' }];
      await post(signedEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }));
      expect((await getUser('user_1'))?.plan).toBe('pro');
    });
  });

  describe('subscription lifecycle', () => {
    beforeEach(async () => {
      await ensureUser('user_1');
      await setStripeCustomerId('user_1', 'cus_1');
    });

    it('downgrades when the only subscription ends', async () => {
      liveSubscriptions = [{ id: 'sub_1', status: 'canceled' }];
      await post(signedEvent('customer.subscription.deleted', { id: 'sub_1', customer: 'cus_1' }));
      expect((await getUser('user_1'))?.plan).toBe('free');
    });

    it('keeps a resubscribed customer on Pro when the old subscription ends', async () => {
      // Regression: the handler took the plan from the event's subscription
      // alone, so the old sub's deletion downgraded a paying customer.
      liveSubscriptions = [
        { id: 'sub_old', status: 'canceled' },
        { id: 'sub_new', status: 'active' },
      ];
      await post(
        signedEvent('customer.subscription.deleted', { id: 'sub_old', customer: 'cus_1' }),
      );
      expect((await getUser('user_1'))?.plan).toBe('pro');
    });

    it('is not fooled by a stale "active" event delivered after cancellation', async () => {
      // Regression: Stripe does not guarantee ordering. A late updated(active)
      // used to re-grant Pro to a customer who had cancelled.
      liveSubscriptions = [{ id: 'sub_1', status: 'canceled' }];
      await post(
        signedEvent('customer.subscription.updated', {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'active', // the stale payload claims active…
        }),
      );
      expect((await getUser('user_1'))?.plan).toBe('free'); // …Stripe says otherwise
    });

    it('treats trialing as entitled and past_due as not', async () => {
      liveSubscriptions = [{ id: 'sub_1', status: 'trialing' }];
      await post(signedEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }));
      expect((await getUser('user_1'))?.plan).toBe('pro');

      liveSubscriptions = [{ id: 'sub_1', status: 'past_due' }];
      await post(signedEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }));
      expect((await getUser('user_1'))?.plan).toBe('free');
    });

    it('asks Stripe about the right customer', async () => {
      liveSubscriptions = [{ id: 'sub_1', status: 'active' }];
      await post(signedEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }));
      expect(listSubscriptions).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_1', status: 'all' }),
      );
    });
  });

  describe('unknown customers', () => {
    it('links through subscription metadata when the customer id is new', async () => {
      await ensureUser('user_2');
      liveSubscriptions = [{ id: 'sub_9', status: 'active' }];
      await post(
        signedEvent('customer.subscription.created', {
          id: 'sub_9',
          customer: 'cus_new',
          metadata: { clerkUserId: 'user_2' },
        }),
      );
      expect(await getUser('user_2')).toMatchObject({ plan: 'pro', stripeCustomerId: 'cus_new' });
    });

    it('acknowledges an event for a customer it cannot place', async () => {
      liveSubscriptions = [{ id: 'sub_x', status: 'active' }];
      const res = await post(
        signedEvent('customer.subscription.updated', { id: 'sub_x', customer: 'cus_stranger' }),
      );
      // 200, not 500: retrying would never succeed and Stripe would keep trying.
      expect(res.status).toBe(200);
    });
  });

  it('returns 500 so Stripe retries when its API is unavailable', async () => {
    await ensureUser('user_1');
    await setStripeCustomerId('user_1', 'cus_1');
    listSubscriptions.mockRejectedValueOnce(new Error('stripe is down'));
    const res = await post(
      signedEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
    );
    expect(res.status).toBe(500);
  });

  it('ignores event types it does not handle', async () => {
    const res = await post(signedEvent('invoice.upcoming', { customer: 'cus_1' }));
    expect(res.status).toBe(200);
    expect(listSubscriptions).not.toHaveBeenCalled();
  });
});

describe('Stripe webhook without configuration', () => {
  it('responds 503 when the webhook secret is missing', async () => {
    const res = await request(app)
      .post('/api/billing/webhook')
      .set('content-type', 'application/json')
      .set('stripe-signature', 't=1,v1=abc')
      .send('{}');
    expect(res.status).toBe(503);
  });
});
