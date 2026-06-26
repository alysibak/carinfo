import { Router } from 'express';
import * as carController from '../controllers/car.controller.js';

const router = Router();

// Get all makes
router.get('/makes', carController.getMakes);

// Get models by make
router.get('/makes/:make/models', carController.getModelsByMake);

// Search cars with filters
router.post('/search', carController.searchCars);
router.get('/search/suggestions', carController.getSearchSuggestions);

// Get comparison data
router.post('/compare', carController.compareCars);

// Get statistics (before /:id to avoid param capture)
router.get('/stats/overview', carController.getStatistics);
router.get('/stats/chart-points', carController.getChartPoints);

// Get car dashboard
router.get('/:id/dashboard', carController.getCarDashboard);

// Get similar / cross-shopped vehicles
router.get('/:id/similar', carController.getSimilarCars);

// Debug pipeline dump (before /:id)
router.get('/:id/raw', carController.getCarRawDebug);

// Get car details
router.get('/:id', carController.getCarById);

export default router;
