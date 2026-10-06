import { Router, type NextFunction, type Request, type Response } from 'express';
import { isAuthConfigured } from '../auth/auth.js';
import { decodeVinHandler } from '../controllers/vin.controller.js';
import { requireAuthWhenConfigured } from '../middleware/auth.js';
import { vinDecodeLimiter } from '../middleware/security.js';
import { CACHE_IMMUTABLE_DATA, dataCache } from '../middleware/cache.js';

const router = Router();

// Decode a VIN against NHTSA vPIC: GET /api/vin/:vin?year=YYYY
//
// This endpoint proxies a free public API on NHTSA's infrastructure. It is the
// tightest limiter in the app: unthrottled it is an open relay that can get our
// egress IP blocked upstream. A decoded VIN never changes, so successful
// responses cache hard: at the CDN while the decoder is open to everyone, and
// only in the member's own browser once it needs an account, so the CDN never
// hands a decode to someone who is not signed in.
const sharedCache = dataCache(CACHE_IMMUTABLE_DATA);

function vinCache(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthConfigured()) return sharedCache(req, res, next);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  next();
}

router.get('/:vin', vinDecodeLimiter(), requireAuthWhenConfigured, vinCache, decodeVinHandler);

export default router;
