import { Router } from 'express';
import { decodeVinHandler } from '../controllers/vin.controller.js';
import { vinDecodeLimiter } from '../middleware/security.js';
import { CACHE_IMMUTABLE_DATA, dataCache } from '../middleware/cache.js';

const router = Router();

// Decode a VIN against NHTSA vPIC: GET /api/vin/:vin?year=YYYY
//
// This endpoint proxies a free public API on NHTSA's infrastructure. It is the
// tightest limiter in the app: unthrottled it is an open relay that can get our
// egress IP blocked upstream. A decoded VIN never changes, so successful
// responses cache hard.
router.get('/:vin', vinDecodeLimiter(), dataCache(CACHE_IMMUTABLE_DATA), decodeVinHandler);

export default router;
