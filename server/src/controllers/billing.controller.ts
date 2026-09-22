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

/**
 * Subscription statuses that entitle a customer to Pro.
 *
 * `past_due` is deliberately excluded: that was the existing policy (only
 * active/trialing counted), and changing when paying customers lose access is
 * a business decision, not a refactor. Add it here to grant a dunning grace
 * period.
 */
const ENTITLED_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set(['active', 'trialing']);

type StripeFactory = (secretKey: string) => Stripe;

let stripeFactory: StripeFactory = (secretKey) => new Stripe(secretKey);

/** Test seam: swap in a client whose API calls are stubbed. */
export function __setStripeFactoryForTests(factory: StripeFactory | null): void {
  stripeFactory = factory ?? ((secretKey) => new Stripe(secretKey));
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return stripeFactory(key);
}

function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ID?.trim());
}

/**
 * Where Stripe sends the user back to. In production this must be configured:
 * falling back to the request's Host header would let a forged header choose
 * the redirect target.
 */
function appOrigin(req: Request): string | null {
  const configured = process.env.APP_ORIGIN?.trim().replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') return null;
  return `${req.protocol}://${req.get('host')}`;
}

function customerIdOf(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

/**
 * Set a user's plan from what Stripe says *now*, not from the event payload.
 *
 * The handler used to take the plan from whichever single subscription an
 * event carried. Stripe does not guarantee delivery order and a customer can
 * hold more than one subscription, so that had two failure modes:
 *
 *  - Cancel, then resubscribe: the old subscription's `deleted` event fires at
 *    period end and downgraded the user to Free while the new one billed them.
 *  - An `updated(active)` delivered after `deleted` re-granted Pro to a
 *    customer who had cancelled.
 *
 * Re-reading the customer's subscriptions makes every event idempotent and
 * order-independent: whatever arrives, the plan ends up matching reality.
 */
export async function syncPlanFromStripe(
  stripe: Stripe,
  customerId: string,
  fallbackUserId?: string | null,
): Promise<{ userId: string; plan: 'pro' | 'free' } | null> {
  const user =
    (await findUserByStripeCustomerId(customerId)) ??
    (fallbackUserId ? await getUser(fallbackUserId) : null);
  if (!user) return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  });
  const entitled = subscriptions.data.some((s) => ENTITLED_STATUSES.has(s.status));
  const plan = entitled ? 'pro' : 'free';
  await setUserPlan(user.id, plan, customerId);
  return { userId: user.id, plan };
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
    const origin = appOrigin(req);
    if (!origin) {
      console.error('[billing] APP_ORIGIN must be set in production');
      res.status(503).json({ success: false, error: 'Billing is not configured' });
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
      // The idempotency key makes a double-clicked "Upgrade" create one Stripe
      // customer, not two — the second would orphan the first's subscription.
      const customer = await stripe.customers.create(
        { email: user.email ?? undefined, metadata: { clerkUserId: user.id } },
        { idempotencyKey: `carinfo-customer-${user.id}` },
      );
      customerId = customer.id;
      await setStripeCustomerId(user.id, customerId);
    }

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
    const origin = appOrigin(req);
    if (!origin) {
      console.error('[billing] APP_ORIGIN must be set in production');
      res.status(503).json({ success: false, error: 'Billing is not configured' });
      return;
    }

    const stripe = getStripe()!;
    const auth = req.authUser!;
    const user = await ensureUser(auth.userId, auth.email);
    if (!user.stripeCustomerId) {
      res.status(400).json({ success: false, error: 'No billing customer on file' });
      return;
    }

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
        const userId = session.client_reference_id || session.metadata?.clerkUserId || null;
        const customerId = customerIdOf(session.customer);
        if (userId && customerId) {
          await ensureUser(userId, session.customer_details?.email ?? session.customer_email);
          await setStripeCustomerId(userId, customerId);
          // Do not grant Pro just because checkout finished: with delayed
          // payment methods (e.g. Canadian pre-authorized debit) the session
          // completes unpaid and the subscription is `incomplete`. Syncing
          // grants Pro only once Stripe reports it active; the later
          // subscription.updated event covers the payment clearing.
          await syncPlanFromStripe(stripe, customerId, userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = customerIdOf(sub.customer);
        if (customerId) await syncPlanFromStripe(stripe, customerId, sub.metadata?.clerkUserId);
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (error) {
    // A 5xx makes Stripe retry, which is what we want for a transient failure
    // (database or Stripe API hiccup) — and sync is idempotent, so retries are safe.
    console.error('[billing] webhook handler failed:', error);
    res.status(500).send('Webhook handler error');
  }
}
