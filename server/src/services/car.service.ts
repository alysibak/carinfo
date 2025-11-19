import type { CarSpecs, SearchQuery, CarFilter } from '../types/car.types.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../data/cars.json');

interface CarDatabase {
  cars: (CarSpecs & { id: string })[];
  lastUpdated: string;
}

/**
 * Load car database from JSON file
 */
function loadDatabase(): CarDatabase {
  if (!existsSync(DB_PATH)) {
    return { cars: [], lastUpdated: new Date().toISOString() };
  }
  const data = readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

/**
 * Save car database to JSON file
 */
function saveDatabase(db: CarDatabase): void {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/**
 * Get all unique makes
 */
export function getAllMakes(): string[] {
  const db = loadDatabase();
  const makes = new Set(db.cars.map(car => car.make));
  return Array.from(makes).sort();
}

/**
 * Get models for a specific make
 */
export function getModelsByMake(make: string): string[] {
  const db = loadDatabase();
  const models = new Set(
    db.cars
      .filter(car => car.make.toLowerCase() === make.toLowerCase())
      .map(car => car.model)
  );
  return Array.from(models).sort();
}

/**
 * Get a car by ID
 */
export function getCarById(id: string): (CarSpecs & { id: string }) | null {
  const db = loadDatabase();
  return db.cars.find(car => car.id === id) || null;
}

/**
 * Search cars with filters and sorting
 */
export function searchCars(query: SearchQuery): {
  results: (CarSpecs & { id: string })[];
  total: number;
  hasMore: boolean;
} {
  const db = loadDatabase();
  let results = [...db.cars];

  // Apply text search
  if (query.query) {
    const searchTerm = query.query.toLowerCase();
    results = results.filter(car =>
      car.make.toLowerCase().includes(searchTerm) ||
      car.model.toLowerCase().includes(searchTerm) ||
      car.year.toString().includes(searchTerm) ||
      car.trim?.toLowerCase().includes(searchTerm)
    );
  }

  // Apply filters
  if (query.filters) {
    results = applyFilters(results, query.filters);
  }

  // Apply sorting
  if (query.sort) {
    results = sortResults(results, query.sort.field, query.sort.order);
  }

  const total = results.length;
  const limit = query.limit || 50;
  const offset = query.offset || 0;

  return {
    results: results.slice(offset, offset + limit),
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Apply filters to car results
 */
function applyFilters(
  cars: (CarSpecs & { id: string })[],
  filters: CarFilter
): (CarSpecs & { id: string })[] {
  let filtered = [...cars];

  if (filters.make?.length) {
    filtered = filtered.filter(car =>
      filters.make!.some(m => m.toLowerCase() === car.make.toLowerCase())
    );
  }

  if (filters.model?.length) {
    filtered = filtered.filter(car =>
      filters.model!.some(m => m.toLowerCase() === car.model.toLowerCase())
    );
  }

  if (filters.year) {
    if (filters.year.min) {
      filtered = filtered.filter(car => car.year >= filters.year!.min!);
    }
    if (filters.year.max) {
      filtered = filtered.filter(car => car.year <= filters.year!.max!);
    }
  }

  if (filters.countryOfOrigin?.length) {
    filtered = filtered.filter(car =>
      filters.countryOfOrigin!.includes(car.countryOfOrigin)
    );
  }

  if (filters.bodyStyle?.length) {
    filtered = filtered.filter(car =>
      filters.bodyStyle!.includes(car.bodyStyle)
    );
  }

  if (filters.fuelType?.length) {
    filtered = filtered.filter(car =>
      filters.fuelType!.includes(car.engine.fuelType)
    );
  }

  if (filters.transmission?.length) {
    filtered = filtered.filter(car =>
      filters.transmission!.includes(car.transmission.type)
    );
  }

  if (filters.driveType?.length) {
    filtered = filtered.filter(car =>
      filters.driveType!.includes(car.driveType)
    );
  }

  if (filters.horsepower) {
    if (filters.horsepower.min) {
      filtered = filtered.filter(car => car.engine.horsepower >= filters.horsepower!.min!);
    }
    if (filters.horsepower.max) {
      filtered = filtered.filter(car => car.engine.horsepower <= filters.horsepower!.max!);
    }
  }

  if (filters.fuelEconomy) {
    if (filters.fuelEconomy.min) {
      filtered = filtered.filter(car =>
        (car.fuelEconomy.combined || 0) >= filters.fuelEconomy!.min!
      );
    }
    if (filters.fuelEconomy.max) {
      filtered = filtered.filter(car =>
        (car.fuelEconomy.combined || 0) <= filters.fuelEconomy!.max!
      );
    }
  }

  if (filters.price) {
    if (filters.price.min) {
      filtered = filtered.filter(car =>
        (car.price?.msrp || 0) >= filters.price!.min!
      );
    }
    if (filters.price.max) {
      filtered = filtered.filter(car =>
        (car.price?.msrp || 0) <= filters.price!.max!
      );
    }
  }

  return filtered;
}

/**
 * Sort results by field and order
 */
function sortResults(
  cars: (CarSpecs & { id: string })[],
  field: string,
  order: 'asc' | 'desc'
): (CarSpecs & { id: string })[] {
  return cars.sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (field) {
      case 'make':
        aVal = a.make;
        bVal = b.make;
        break;
      case 'model':
        aVal = a.model;
        bVal = b.model;
        break;
      case 'year':
        aVal = a.year;
        bVal = b.year;
        break;
      case 'horsepower':
        aVal = a.engine.horsepower;
        bVal = b.engine.horsepower;
        break;
      case 'price':
        aVal = a.price?.msrp || 0;
        bVal = b.price?.msrp || 0;
        break;
      case 'fuelEconomy':
        aVal = a.fuelEconomy.combined || 0;
        bVal = b.fuelEconomy.combined || 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Get multiple cars by IDs for comparison
 */
export function getCarsByIds(ids: string[]): (CarSpecs & { id: string })[] {
  const db = loadDatabase();
  return ids
    .map(id => db.cars.find(car => car.id === id))
    .filter(car => car !== undefined) as (CarSpecs & { id: string })[];
}

/**
 * Get statistics about the database
 */
export function getStatistics() {
  const db = loadDatabase();

  const totalCars = db.cars.length;
  const makes = new Set(db.cars.map(car => car.make));
  const countries = new Set(db.cars.map(car => car.countryOfOrigin));

  const yearRange = {
    min: Math.min(...db.cars.map(car => car.year)),
    max: Math.max(...db.cars.map(car => car.year)),
  };

  const bodyStyles = db.cars.reduce((acc, car) => {
    acc[car.bodyStyle] = (acc[car.bodyStyle] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const fuelTypes = db.cars.reduce((acc, car) => {
    acc[car.engine.fuelType] = (acc[car.engine.fuelType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalCars,
    totalMakes: makes.size,
    totalCountries: countries.size,
    yearRange,
    bodyStyles,
    fuelTypes,
    lastUpdated: db.lastUpdated,
  };
}
