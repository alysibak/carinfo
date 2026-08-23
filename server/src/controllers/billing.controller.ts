import type { Request, Response } from 'express';
import Stripe from 'stripe';
import {
  ensureUser,
  findUserByStripeCustomerId,
  getUser,
  isAccountsStorageReady,
  setStripeCustomerId,
  setUserPlan,
} from '../db/user-store.js';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ID?.trim(),
  );
}

function appOrigin(req: Request): string {
  return (
    process.env.APP_ORIGIN?.replace(/\/$/, '') ||
    `${req.protocol}://${req.get('host')}`
  );
}

export async function createCheckoutSession(req: Request, res: Response) {
  try {
    if (!isBillingConfigured()) {
      res.status(503).json({ success: false, error: 'Billing is not configured' });
      return;
    }
    if (!isAccountsStorageReady()) {
      res.status(503).json({ success: false, error: 'Account storage is not configured' });
      return;
    }

    const stripe = getStripe()!;
    const auth = req.authUser!;
    const user = await ensureUser(auth.userId, auth.email);

    if (user.plan === 'pro') {
      res.status(400).json({ success: false, error: 'Already on Pro' });
      return;
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { clerkUserId: user.id },
      });
      customerId = customer.id;
      await setStripeCustomerId(user.id, customerId);
    }

    const origin = appOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/account?checkout=cancel`,
      client_reference_id: user.id,
      metadata: { clerkUserId: user.id },
      subscription_data: {
        metadata: { clerkUserId: user.id },
      },
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (error) {
    console.error('[billing] checkout failed:', error);
    res.status(500).json({ success: false, error: 'Failed to start checkout' });
  }
}

export async function createPortalSession(req: Request, res: Response) {
  try {
    if (!isBillingConfigured()) {
      res.status(503).json({ success: false, error: 'Billing is not configured' });
      return;
    }
    if (!isAccountsStorageReady()) {
      res.status(503).json({ success: false, error: 'Account storage is not configured' });
      return;
    }

    const stripe = getStripe()!;
    const auth = req.authUser!;
    const user = await ensureUser(auth.userId, auth.email);
    if (!user.stripeCustomerId) {
      res.status(400).json({ success: false, error: 'No billing customer on file' });
      return;
    }

    const origin = appOrigin(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/account`,
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (error) {
    console.error('[billing] portal failed:', error);
    res.status(500).json({ success: false, error: 'Failed to open billing portal' });
  }
}

/** Stripe webhook — must receive raw Buffer body. */
export async function handleStripeWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !webhookSecret) {
    res.status(503).send('Billing webhook not configured');
    return;
  }
  if (!isAccountsStorageReady()) {
    res.status(503).send('Account storage not configured');
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    res.status(400).send('Missing stripe-signature');
    return;
  }

  let event: Stripe.Event;
  try {
    const rawBody = req.body;
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[billing] webhook signature failed:', err);
    res.status(400).send('Invalid signature');
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.client_reference_id ||
          session.metadata?.clerkUserId ||
          null;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;
        if (userId) {
          await ensureUser(userId, session.customer_email);
          if (customerId) await setStripeCustomerId(userId, customerId);
          await setUserPlan(userId, 'pro', customerId ?? null);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const user =
          (await findUserByStripeCustomerId(customerId)) ||
          (sub.metadata?.clerkUserId
            ? await getUser(sub.metadata.clerkUserId)
            : null);
        if (user) {
          const active =
            event.type === 'customer.subscription.updated' &&
            (sub.status === 'active' || sub.status === 'trialing');
          await setUserPlan(user.id, active ? 'pro' : 'free');
        }
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (error) {
    console.error('[billing] webhook handler failed:', error);
    res.status(500).send('Webhook handler error');
  }
}
