import { Router } from 'express';
import { decodeVinHandler } from '../controllers/vin.controller.js';

const router = Router();

// Decode a VIN against NHTSA vPIC: GET /api/vin/:vin?year=YYYY
router.get('/:vin', decodeVinHandler);

export default router;
