import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../middleware/error-handler.js';
import * as carService from '../services/car.service.js';
import * as dashboardService from '../services/dashboard.service.js';
import { parseRegionId } from '../config/regional-assumptions.js';
import { normalizeSearchQuery, parseSearchQueryString } from '../utils/search-validation.js';

/** Compare is bounded because each id costs a full dashboard computation. */
const MAX_COMPARE_IDS = 5;

/**
 * Get all makes
 */
export function getMakes(_req: Request, res: Response, next: NextFunction) {
  try {
    const makes = carService.getAllMakes();
    res.json({ success: true, data: makes });
  } catch (error) {
    next(error);
  }
}

/**
 * Get models by make
 */
export function getModelsByMake(req: Request, res: Response, next: NextFunction) {
  try {
    const { make } = req.params;
    const models = carService.getModelsByMake(make);
    res.json({ success: true, data: models });
  } catch (error) {
    next(error);
  }
}

/**
 * Search cars with filters
 */
export function searchCars(req: Request, res: Response, next: NextFunction) {
  try {
    const query = normalizeSearchQuery(req.body);
    const results = carService.searchCars(query);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}

/**
 * GET mirror of searchCars. Same engine, filters read from the query string,
 * so the response is CDN-cacheable and the search is a shareable URL.
 */
export function searchCarsViaQuery(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parseSearchQueryString(req.query as Record<string, unknown>);
    const results = carService.searchCars(query);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}

/**
 * Autocomplete suggestions for the search bar
 */
export function getSearchSuggestions(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limitRaw = req.query.limit != null ? Number(req.query.limit) : 8;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 8;
    const suggestions = carService.getSearchSuggestions(q, limit);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    next(error);
  }
}

/**
 * Debug pipeline dump: raw cars.json, after enrichment, after normalization.
 */
export function getCarRawDebug(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const pipeline = carService.getCarPipelineDebug(id);
    if (!pipeline) throw new HttpError(404, 'Car not found');
    res.json({ success: true, data: pipeline });
  } catch (error) {
    next(error);
  }
}

/**
 * Get car by ID
 */
export function getCarById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const car = carService.getCarById(id);

    if (!car) throw new HttpError(404, 'Car not found');

    res.json({ success: true, data: car });
  } catch (error) {
    next(error);
  }
}

/**
 * Compare multiple cars
 */
export function compareCars(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new HttpError(400, 'Invalid car IDs');
    }
    if (ids.length > MAX_COMPARE_IDS) {
      throw new HttpError(400, `Maximum ${MAX_COMPARE_IDS} cars can be compared`);
    }

    const { cars, notFound } = carService.getCarsByIds(ids);
    res.json({ success: true, data: cars, notFound });
  } catch (error) {
    next(error);
  }
}

/**
 * Get car dashboard with analytics and provenance
 */
export function getCarDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const region = parseRegionId(req.query.region);
    const dashboard = dashboardService.getCarDashboard(id, region);

    if (!dashboard) throw new HttpError(404, 'Car not found');

    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
}

/**
 * Get similar / cross-shopped vehicles for a car
 */
export function getSimilarCars(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const limitRaw = req.query.limit != null ? Number(req.query.limit) : 6;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 12) : 6;
    const cars = dashboardService.getSimilarCars(id, limit);
    res.json({ success: true, data: cars });
  } catch (error) {
    next(error);
  }
}

/**
 * Same make/model/year EPA configurations (trims, transmissions).
 */
export function getSiblingConfigs(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const limitRaw = req.query.limit != null ? Number(req.query.limit) : 24;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 48) : 24;
    const cars = dashboardService.getSiblingConfigs(id, limit);
    res.json({ success: true, data: cars });
  } catch (error) {
    next(error);
  }
}

/**
 * Get database statistics
 */
export function getStatistics(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = carService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

/**
 * 2D density grid for value matrix (full fleet, not sampled).
 */
export function getChartDensity(req: Request, res: Response, next: NextFunction) {
  try {
    const priceMin = req.query.priceMin != null ? Number(req.query.priceMin) : undefined;
    const priceMax = req.query.priceMax != null ? Number(req.query.priceMax) : undefined;
    const bodyStyles =
      typeof req.query.bodyStyles === 'string' && req.query.bodyStyles
        ? req.query.bodyStyles
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    const yearMin = req.query.yearMin != null ? Number(req.query.yearMin) : undefined;
    const yearMax = req.query.yearMax != null ? Number(req.query.yearMax) : undefined;
    const metric =
      req.query.metric === 'displacement' || req.query.metric === 'co2' ? req.query.metric : 'mpg';

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
    next(error);
  }
}

/**
 * Chart points for value matrix (server-side sampling).
 */
export function getChartPoints(req: Request, res: Response, next: NextFunction) {
  try {
    const priceMin = req.query.priceMin != null ? Number(req.query.priceMin) : undefined;
    const priceMax = req.query.priceMax != null ? Number(req.query.priceMax) : undefined;
    const bodyStyles =
      typeof req.query.bodyStyles === 'string' && req.query.bodyStyles
        ? req.query.bodyStyles
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
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
    next(error);
  }
}
