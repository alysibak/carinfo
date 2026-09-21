import { Router } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { noStore } from '../middleware/cache.js';
import { writeLimiter } from '../middleware/security.js';

const router = Router();

router.use(noStore);

router.post('/checkout', writeLimiter(), requireAuth, billingController.createCheckoutSession);
router.post('/portal', writeLimiter(), requireAuth, billingController.createPortalSession);

export default router;
