import { Request, Response } from 'express';
import * as carService from '../services/car.service.js';
import * as dashboardService from '../services/dashboard.service.js';
import { normalizeSearchQuery } from '../utils/search-validation.js';

/**
 * Get all makes
 */
export function getMakes(req: Request, res: Response) {
  try {
    const makes = carService.getAllMakes();
    res.json({ success: true, data: makes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch makes' });
  }
}

/**
 * Get models by make
 */
export function getModelsByMake(req: Request, res: Response) {
  try {
    const { make } = req.params;
    const models = carService.getModelsByMake(make);
    res.json({ success: true, data: models });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch models' });
  }
}

/**
 * Search cars with filters
 */
export function searchCars(req: Request, res: Response) {
  try {
    const query = normalizeSearchQuery(req.body);
    const results = carService.searchCars(query);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search cars' });
  }
}

/**
 * Autocomplete suggestions for the search bar
 */
export function getSearchSuggestions(req: Request, res: Response) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limitRaw = req.query.limit != null ? Number(req.query.limit) : 8;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 8;
    const suggestions = carService.getSearchSuggestions(q, limit);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch suggestions' });
  }
}

/**
 * Debug pipeline dump: raw cars.json, after enrichment, after normalization.
 */
export function getCarRawDebug(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const pipeline = carService.getCarPipelineDebug(id);
    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Car not found' });
    }
    res.json({ success: true, data: pipeline });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch raw car debug' });
  }
}

/**
 * Get car by ID
 */
export function getCarById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const car = carService.getCarById(id);

    if (!car) {
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    res.json({ success: true, data: car });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch car' });
  }
}

/**
 * Compare multiple cars
 */
export function compareCars(req: Request, res: Response) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid car IDs' });
    }

    if (ids.length > 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 cars can be compared' });
    }

    const { cars, notFound } = carService.getCarsByIds(ids);
    res.json({ success: true, data: cars, notFound });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to compare cars' });
  }
}

/**
 * Get car dashboard with analytics and provenance
 */
export function getCarDashboard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const dashboard = dashboardService.getCarDashboard(id);

    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch car dashboard' });
  }
}

/**
 * Get similar / cross-shopped vehicles for a car
 */
export function getSimilarCars(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const limitRaw = req.query.limit != null ? Number(req.query.limit) : 6;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 12) : 6;
    const cars = dashboardService.getSimilarCars(id, limit);
    res.json({ success: true, data: cars });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch similar cars' });
  }
}

/**
 * Get database statistics
 */
export function getStatistics(req: Request, res: Response) {
  try {
    const stats = carService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
}

/**
 * 2D density grid for value matrix (full fleet, not sampled).
 */
export function getChartDensity(req: Request, res: Response) {
  try {
    const priceMin = req.query.priceMin != null ? Number(req.query.priceMin) : undefined;
    const priceMax = req.query.priceMax != null ? Number(req.query.priceMax) : undefined;
    const bodyStyles = typeof req.query.bodyStyles === 'string' && req.query.bodyStyles
      ? req.query.bodyStyles.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const yearMin = req.query.yearMin != null ? Number(req.query.yearMin) : undefined;
    const yearMax = req.query.yearMax != null ? Number(req.query.yearMax) : undefined;
    const metric = req.query.metric === 'displacement' || req.query.metric === 'co2'
      ? req.query.metric
      : 'mpg';

    const density = carService.getChartDensity({
      priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
      priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
      bodyStyles,
      yearMin: Number.isFinite(yearMin) ? yearMin : undefined,
      yearMax: Number.isFinite(yearMax) ? yearMax : undefined,
      metric,
    });

    res.json({ success: true, data: density });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch chart density' });
  }
}

/**
 * Chart points for value matrix (server-side sampling).
 */
export function getChartPoints(req: Request, res: Response) {
  try {
    const priceMin = req.query.priceMin != null ? Number(req.query.priceMin) : undefined;
    const priceMax = req.query.priceMax != null ? Number(req.query.priceMax) : undefined;
    const bodyStyles = typeof req.query.bodyStyles === 'string' && req.query.bodyStyles
      ? req.query.bodyStyles.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const yearMin = req.query.yearMin != null ? Number(req.query.yearMin) : undefined;
    const yearMax = req.query.yearMax != null ? Number(req.query.yearMax) : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;

    const result = carService.getChartPoints({
      priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
      priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
      bodyStyles,
      yearMin: Number.isFinite(yearMin) ? yearMin : undefined,
      yearMax: Number.isFinite(yearMax) ? yearMax : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch chart points' });
  }
}
