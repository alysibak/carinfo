import { Router } from 'express';
import * as carController from '../controllers/car.controller.js';

const router = Router();

// Get all makes
router.get('/makes', carController.getMakes);

// Get models by make
router.get('/makes/:make/models', carController.getModelsByMake);

// Search cars with filters
router.post('/search', carController.searchCars);

// Get car details
router.get('/:id', carController.getCarById);

// Get comparison data
router.post('/compare', carController.compareCars);

// Get statistics
router.get('/stats/overview', carController.getStatistics);

export default router;
