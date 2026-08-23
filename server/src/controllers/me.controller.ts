import type { Request, Response } from 'express';
import * as carService from '../services/car.service.js';
import {
  GarageLimitError,
  addGarageId,
  ensureUser,
  getGarageIds,
  getUser,
  isAccountsStorageReady,
  removeGarageId,
  setGarageIds,
} from '../db/user-store.js';
import { FREE_GARAGE_LIMIT } from '../types/account.types.js';
import { isClerkConfigured } from '../middleware/auth.js';

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

/** Public capability probe for the client. */
export function getAccountStatus(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      authConfigured: isClerkConfigured(),
      storageConfigured: isAccountsStorageReady(),
      billingConfigured: Boolean(
        process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ID?.trim(),
      ),
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
    const carIds = Array.isArray(req.body?.carIds)
      ? (req.body.carIds as unknown[]).map(String)
      : null;
    if (!carIds) {
      res.status(400).json({ success: false, error: 'carIds array required' });
      return;
    }

    try {
      const ids = await setGarageIds(user.id, carIds, user.plan);
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
          error: err.message,
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
          error: err.message,
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
