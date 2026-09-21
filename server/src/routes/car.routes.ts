import { Router } from 'express';
import * as carController from '../controllers/car.controller.js';
import { CACHE_IMMUTABLE_DATA, CACHE_SHORT, dataCache } from '../middleware/cache.js';
import { searchLimiter } from '../middleware/security.js';

const router = Router();

// The vehicle corpus only changes on deploy, so every GET below is served with
// a dataset-fingerprint ETag and long CDN TTLs. Repeat traffic becomes 304s and
// edge hits, which is what keeps a 28k-row dataset cheap to serve.
const cacheData = dataCache(CACHE_IMMUTABLE_DATA);

// Get all makes
router.get('/makes', cacheData, carController.getMakes);

// Get models by make
router.get('/makes/:make/models', cacheData, carController.getModelsByMake);

// Search cars with filters
router.post('/search', searchLimiter(), carController.searchCars);
// GET mirror of /search so result pages are CDN-cacheable and linkable.
router.get('/search', searchLimiter(), cacheData, carController.searchCarsViaQuery);
router.get('/search/suggestions', dataCache(CACHE_SHORT), carController.getSearchSuggestions);

// Get comparison data
router.post('/compare', searchLimiter(), carController.compareCars);

// Get statistics (before /:id to avoid param capture)
router.get('/stats/overview', cacheData, carController.getStatistics);
router.get('/stats/chart-density', cacheData, carController.getChartDensity);
router.get('/stats/chart-points', cacheData, carController.getChartPoints);

// Get car dashboard
router.get('/:id/dashboard', cacheData, carController.getCarDashboard);

// Get similar / cross-shopped vehicles
router.get('/:id/similar', cacheData, carController.getSimilarCars);

// Same make/model/year EPA configurations
router.get('/:id/siblings', cacheData, carController.getSiblingConfigs);

// Debug pipeline dump (before /:id). Development only — it exposes the raw
// upstream record and every intermediate enrichment stage.
if (process.env.NODE_ENV !== 'production') {
  router.get('/:id/raw', carController.getCarRawDebug);
}

// Get car details
router.get('/:id', cacheData, carController.getCarById);

export default router;
