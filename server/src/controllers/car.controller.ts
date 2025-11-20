import { Request, Response } from 'express';
import * as carService from '../services/car.service.js';
import type { SearchQuery } from '../types/car.types.js';

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
    const query: SearchQuery = req.body;
    const results = carService.searchCars(query);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search cars' });
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

    const cars = carService.getCarsByIds(ids);
    res.json({ success: true, data: cars });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to compare cars' });
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
