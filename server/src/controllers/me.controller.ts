import type { Request, Response } from 'express';
import * as carService from '../services/car.service.js';
import {
  GarageLimitError,
  addGarageId,
  ensureUser,
  exportSignInData,
  getGarageIds,
  getUser,
  isAccountsStorageReady,
  listGarageItems,
  listRecallNotices,
  listRecallWatches,
  removeGarageId,
  setGarageIds,
  setRecallAlerts,
} from '../db/user-store.js';
import { FREE_GARAGE_LIMIT, PRO_GARAGE_LIMIT, type AccountUser } from '../types/account.types.js';
import { startWatching } from '../services/recall-alerts.service.js';
import { isAuthConfigured } from '../auth/auth.js';
import { configuredProviders } from '../auth/providers.js';
import { isEmailConfigured } from '../auth/email.js';
import { isBillingConfigured } from './billing.controller.js';

/** Hard ceiling on one sync payload, checked before any database work. */
const MAX_GARAGE_PAYLOAD = PRO_GARAGE_LIMIT;

/**
 * A car saved while alerts are on is watched from now: a recall listed later
 * is emailed, the ones it already has are not. Saving must not fail over it;
 * the daily run watches any car this missed.
 */
async function watchSavedCars(user: AccountUser, carIds: string[]): Promise<void> {
  if (!user.recallAlerts || !carIds.length) return;
  try {
    await startWatching(user.id, carIds);
  } catch (error) {
    console.error('[me] watching saved cars failed:', error);
  }
}

function storageUnavailable(res: Response): boolean {
  if (!isAccountsStorageReady()) {
    res.status(503).json({
      success: false,
      error: 'Account storage is not configured (missing DATABASE_URL)',
    });
    return true;
  }
  return false;
}

/** Pro is offered only where it can be bought. */
function limitMessage(err: GarageLimitError): string {
  if (isBillingConfigured()) return err.message;
  return `Your garage holds up to ${err.limit} vehicles. Remove one to save another.`;
}

/**
 * Public capability probe for the client: which sign-in methods to offer, and
 * whether the tools need an account (they do once accounts are configured).
 */
export function getAccountStatus(_req: Request, res: Response) {
  const authConfigured = isAuthConfigured();
  res.json({
    success: true,
    data: {
      authConfigured,
      storageConfigured: isAccountsStorageReady(),
      billingConfigured: authConfigured && isBillingConfigured(),
      // Google, Apple, Microsoft: each once its keys are set.
      providers: authConfigured ? configuredProviders() : [],
      // A sign-in code, password reset and address confirmation all need email.
      emailConfigured: authConfigured && isEmailConfigured(),
      freeGarageLimit: FREE_GARAGE_LIMIT,
    },
  });
}

export async function getMe(req: Request, res: Response) {
  try {
    if (storageUnavailable(res)) return;
    const auth = req.authUser!;
    const user = await ensureUser(auth.userId, auth.email);
    const garageIds = await getGarageIds(user.id);
    res.json({
      success: true,
      data: {
        user,
        garageIds,
        freeGarageLimit: FREE_GARAGE_LIMIT,
        garageLimit: user.plan === 'pro' ? null : FREE_GARAGE_LIMIT,
      },
    });
  } catch (error) {
    console.error('[me] getMe failed:', error);
    res.status(500).json({ success: false, error: 'Failed to load account' });
  }
}

export async function getMyGarage(req: Request, res: Response) {
  try {
    if (storageUnavailable(res)) return;
    const auth = req.authUser!;
    await ensureUser(auth.userId, auth.email);
    const ids = await getGarageIds(auth.userId);
    const cars = ids
      .map((id) => carService.getCarById(id))
      .filter((c): c is NonNullable<typeof c> => c != null);

    const user = await getUser(auth.userId);
    res.json({
      success: true,
      data: {
        ids,
        cars,
        plan: user?.plan ?? 'free',
        freeGarageLimit: FREE_GARAGE_LIMIT,
        garageLimit: user?.plan === 'pro' ? null : FREE_GARAGE_LIMIT,
      },
    });
  } catch (error) {
    console.error('[me] getMyGarage failed:', error);
    res.status(500).json({ success: false, error: 'Failed to load garage' });
  }
}

/** Replace full garage ID list (merge/sync from client). */
export async function putMyGarage(req: Request, res: Response) {
  try {
    if (storageUnavailable(res)) return;
    const auth = req.authUser!;
    const user = await ensureUser(auth.userId, auth.email);
    if (!Array.isArray(req.body?.carIds)) {
      res.status(400).json({ success: false, error: 'carIds array required' });
      return;
    }

    // Reject oversized payloads before touching the database, and drop IDs that
    // do not name a real vehicle. POST /garage/items already validated its one
    // ID; this path used to accept anything, so a sync could plant junk rows
    // that then failed to resolve on every subsequent read.
    const raw = req.body.carIds as unknown[];
    if (raw.length > MAX_GARAGE_PAYLOAD) {
      res.status(413).json({
        success: false,
        error: `A garage sync may contain at most ${MAX_GARAGE_PAYLOAD} vehicles.`,
      });
      return;
    }

    const carIds = raw
      .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 128)
      .filter((id) => carService.getCarById(id) != null);

    try {
      const ids = await setGarageIds(user.id, carIds, user.plan);
      await watchSavedCars(user, ids);
      const cars = ids
        .map((id) => carService.getCarById(id))
        .filter((c): c is NonNullable<typeof c> => c != null);
      res.json({
        success: true,
        data: {
          ids,
          cars,
          plan: user.plan,
          freeGarageLimit: FREE_GARAGE_LIMIT,
          garageLimit: user.plan === 'pro' ? null : FREE_GARAGE_LIMIT,
        },
      });
    } catch (err) {
      if (err instanceof GarageLimitError) {
        res.status(403).json({
          success: false,
          error: limitMessage(err),
          code: 'GARAGE_LIMIT',
          limit: err.limit,
        });
        return;
      }
      throw err;
    }
  } catch (error) {
    console.error('[me] putMyGarage failed:', error);
    res.status(500).json({ success: false, error: 'Failed to save garage' });
  }
}

export async function addMyGarageItem(req: Request, res: Response) {
  try {
    if (storageUnavailable(res)) return;
    const auth = req.authUser!;
    const user = await ensureUser(auth.userId, auth.email);
    const carId = typeof req.body?.carId === 'string' ? req.body.carId : null;
    if (!carId) {
      res.status(400).json({ success: false, error: 'carId required' });
      return;
    }
    if (!carService.getCarById(carId)) {
      res.status(404).json({ success: false, error: 'Car not found' });
      return;
    }

    try {
      const ids = await addGarageId(user.id, carId, user.plan);
      await watchSavedCars(user, [carId]);
      res.json({
        success: true,
        data: {
          ids,
          plan: user.plan,
          freeGarageLimit: FREE_GARAGE_LIMIT,
          garageLimit: user.plan === 'pro' ? null : FREE_GARAGE_LIMIT,
        },
      });
    } catch (err) {
      if (err instanceof GarageLimitError) {
        res.status(403).json({
          success: false,
          error: limitMessage(err),
          code: 'GARAGE_LIMIT',
          limit: err.limit,
        });
        return;
      }
      throw err;
    }
  } catch (error) {
    console.error('[me] addMyGarageItem failed:', error);
    res.status(500).json({ success: false, error: 'Failed to add garage item' });
  }
}

export async function removeMyGarageItem(req: Request, res: Response) {
  try {
    if (storageUnavailable(res)) return;
    const auth = req.authUser!;
    await ensureUser(auth.userId, auth.email);
    const carId = req.params.carId;
    if (!carId) {
      res.status(400).json({ success: false, error: 'carId required' });
      return;
    }
    const ids = await removeGarageId(auth.userId, carId);
    const user = await getUser(auth.userId);
    res.json({
      success: true,
      data: {
        ids,
        plan: user?.plan ?? 'free',
        freeGarageLimit: FREE_GARAGE_LIMIT,
        garageLimit: user?.plan === 'pro' ? null : FREE_GARAGE_LIMIT,
      },
    });
  } catch (error) {
    console.error('[me] removeMyGarageItem failed:', error);
    res.status(500).json({ success: false, error: 'Failed to remove garage item' });
  }
}

/**
 * Recall alerts on or off. On needs email set up and a confirmed address, and
 * starts watching the garage afresh: only recalls listed from now are sent.
 */
export async function putMyAlerts(req: Request, res: Response) {
  try {
    if (storageUnavailable(res)) return;
    const auth = req.authUser!;
    const enabled = req.body?.recallAlerts;
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ success: false, error: 'recallAlerts must be true or false' });
      return;
    }
    if (enabled && !isEmailConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Email is not set up on this site, so alerts cannot be sent.',
        code: 'EMAIL_UNAVAILABLE',
      });
      return;
    }
    if (enabled && !auth.emailVerified) {
      res.status(409).json({
        success: false,
        error: 'Confirm your email address first: alerts go only to a confirmed one.',
        code: 'EMAIL_UNVERIFIED',
      });
      return;
    }
    const user = await ensureUser(auth.userId, auth.email);
    await setRecallAlerts(user.id, enabled);
    if (enabled) await startWatching(user.id, await getGarageIds(user.id), { reset: true });
    res.json({ success: true, data: { recallAlerts: enabled } });
  } catch (error) {
    console.error('[me] putMyAlerts failed:', error);
    res.status(500).json({ success: false, error: 'Failed to change recall alerts' });
  }
}

/**
 * Everything CarInfo keeps about the signed-in user, as a JSON download: the
 * right of access and, in Quebec, of portability (Law 25).
 */
export async function getMyExport(req: Request, res: Response) {
  try {
    if (storageUnavailable(res)) return;
    const auth = req.authUser!;
    const user = await ensureUser(auth.userId, auth.email);
    const [signIn, garage, watches, notices] = await Promise.all([
      exportSignInData(user.id),
      listGarageItems(user.id),
      listRecallWatches(user.id),
      listRecallNotices(user.id),
    ]);
    const name = (carId: string) => {
      const car = carService.getCarById(carId);
      return car ? `${car.year} ${car.make} ${car.model}` : null;
    };
    res.setHeader('Content-Disposition', 'attachment; filename="carinfo-account-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
        stripeCustomer: user.stripeCustomerId,
      },
      signIn,
      garage: garage.map((item) => ({ ...item, vehicle: name(item.carId) })),
      recallAlerts: {
        enabled: user.recallAlerts,
        watching: watches.map((watch) => ({ ...watch, vehicle: name(watch.carId) })),
        recalls: notices.map((notice) => ({
          carId: notice.carId,
          recallNumber: notice.recallNumber,
          sentAt: notice.sentAt,
          notedAt: notice.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('[me] getMyExport failed:', error);
    res.status(500).json({ success: false, error: 'Failed to export account data' });
  }
}
