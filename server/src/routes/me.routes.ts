import { Router } from 'express';
import * as meController from '../controllers/me.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { noStore } from '../middleware/cache.js';
import { writeLimiter } from '../middleware/security.js';

const router = Router();

// Everything under /me is per-user. Nothing here may be stored by a shared
// cache, so the whole router is marked no-store rather than relying on each
// handler to remember.
router.use(noStore);

router.get('/status', meController.getAccountStatus);

router.get('/', requireAuth, meController.getMe);
router.get('/garage', requireAuth, meController.getMyGarage);
router.put('/garage', writeLimiter(), requireAuth, meController.putMyGarage);
router.post('/garage/items', writeLimiter(), requireAuth, meController.addMyGarageItem);
router.delete('/garage/items/:carId', writeLimiter(), requireAuth, meController.removeMyGarageItem);

export default router;
