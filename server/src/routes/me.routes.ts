import { Router } from 'express';
import * as meController from '../controllers/me.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/status', meController.getAccountStatus);

router.get('/', requireAuth, meController.getMe);
router.get('/garage', requireAuth, meController.getMyGarage);
router.put('/garage', requireAuth, meController.putMyGarage);
router.post('/garage/items', requireAuth, meController.addMyGarageItem);
router.delete('/garage/items/:carId', requireAuth, meController.removeMyGarageItem);

export default router;
