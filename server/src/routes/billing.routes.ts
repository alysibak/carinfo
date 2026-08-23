import { Router } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/checkout', requireAuth, billingController.createCheckoutSession);
router.post('/portal', requireAuth, billingController.createPortalSession);

export default router;
