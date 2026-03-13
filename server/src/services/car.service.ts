import type { CarSpecs, SearchQuery, CarFilter } from '../types/car.types';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

function getDbPathCandidates(): string[] {
  // In serverless (Vercel), `__dirname` can be inside the function bundle and
  // relative paths to `server/data` may not work unless explicitly included.
  // We try a few common roots in priority order.
  return [
    // Most robust when deploying the repo layout
    resolve(process.cwd(), 'server', 'data', 'cars.json'),
    // If only /data is bundled at repo root
    resolve(process.cwd(), 'data', 'cars.json'),
    // Local dev / compiled server layout
    join(__dirname, '../../data/cars.json'),
  ];
}

function resolveDbPath(): string | null {
  for (const p of getDbPathCandidates()) {
    if (existsSync(p)) return p;
  }
  return null;
}

type Car = CarSpecs & { id: string };

interface CarDatabase {
  cars: Car[];
  lastUpdated: string;
}

// ─── In-memory cache & indexes ────────────────────────────────────────────────
// The database is loaded once at startup and kept in memory.  All lookups use
// pre-built indexes so searches are O(matching-cars) instead of O(all-cars).

let cachedCars: Car[] = [];
let lastUpdated = '';

// Primary lookup
let idIndex: Map<string, Car> = new Map();

// Category indexes – map a lowercase key to the list of cars in that bucket.
let makeIndex: Map<string, Car[]> = new Map();
let modelIndex: Map<string, Car[]> = new Map();
let bodyStyleIndex: Map<string, Car[]> = new Map();
let fuelTypeIndex: Map<string, Car[]> = new Map();
let transmissionIndex: Map<string, Car[]> = new Map();
let driveTypeIndex: Map<string, Car[]> = new Map();
let countryIndex: Map<string, Car[]> = new Map();

// Pre-computed derived data
let cachedMakes: string[] = [];
let cachedStats: ReturnType<typeof computeStatistics> | null = null;

// Minimal built-in dataset so deployments still work even if `cars.json` is missing.
// This is primarily useful for serverless platforms (e.g. Vercel) where bundling a
// large JSON file may be deferred to a later optimization.
const FALLBACK_CARS: Car[] = [
  {
    id: 'car-001',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    trim: 'XSE',
    countryOfOrigin: 'Japan',
    engine: {
      displacement: 3.5,
      horsepower: 301,
      torque: 267,
      fuelType: 'gasoline',
      cylinders: 6,
      configuration: 'V6',
    },
    performance: { zeroToSixty: 5.8, topSpeed: 135 },
    dimensions: { length: 192.1, width: 72.4, height: 56.9, wheelbase: 111.2, curbWeight: 3572 },
    fuelEconomy: { city: 22, highway: 32, combined: 26 },
    transmission: { type: 'automatic', speeds: 8 },
    driveType: 'FWD',
    bodyStyle: 'sedan',
    safetyRating: { overall: 5 },
    price: { msrp: 34400 },
  },
  {
    id: 'car-002',
    make: 'Ford',
    model: 'Mustang',
    year: 2021,
    trim: 'GT',
    countryOfOrigin: 'USA',
    engine: {
      displacement: 5.0,
      horsepower: 450,
      torque: 410,
      fuelType: 'gasoline',
      cylinders: 8,
      configuration: 'V8',
    },
    performance: { zeroToSixty: 4.2, topSpeed: 155 },
    dimensions: { length: 188.5, width: 75.4, height: 54.3, wheelbase: 107.1, curbWeight: 3705 },
    fuelEconomy: { city: 15, highway: 24, combined: 18 },
    transmission: { type: 'manual', speeds: 6 },
    driveType: 'RWD',
    bodyStyle: 'coupe',
    safetyRating: { overall: 5 },
    price: { msrp: 36800 },
  },
];

/**
 * Load the database once into memory and build all indexes.
 */
function initDatabase(): void {
  if (cachedCars.length > 0) return; // already loaded

  try {
    const dbPath = resolveDbPath();
    if (!dbPath) {
      console.warn(
        `[car.service] Missing database file. Tried: ${getDbPathCandidates().join(', ')}. Using fallback dataset.`,
      );
      cachedCars = FALLBACK_CARS;
      lastUpdated = new Date().toISOString();
      buildIndexes();
      return;
    }

    const raw = readFileSync(dbPath, 'utf-8');
    const db: CarDatabase = JSON.parse(raw);
    cachedCars = db.cars;
    lastUpdated = db.lastUpdated;

    buildIndexes();
  } catch (error) {
    console.error(
      '[car.service] Failed to initialize database from cars.json, falling back to built-in dataset:',
      error,
    );
    cachedCars = FALLBACK_CARS;
    lastUpdated = new Date().toISOString();
    buildIndexes();
  }
}

function addToMapIndex(map: Map<string, Car[]>, key: string, car: Car): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(car);
  } else {
    map.set(key, [car]);
  }
}

function buildIndexes(): void {
  idIndex = new Map();
  makeIndex = new Map();
  modelIndex = new Map();
  bodyStyleIndex = new Map();
  fuelTypeIndex = new Map();
  transmissionIndex = new Map();
  driveTypeIndex = new Map();
  countryIndex = new Map();

  for (const car of cachedCars) {
    idIndex.set(car.id, car);

    const makeLower = car.make.toLowerCase();
    addToMapIndex(makeIndex, makeLower, car);
    addToMapIndex(modelIndex, car.model.toLowerCase(), car);
    addToMapIndex(bodyStyleIndex, car.bodyStyle, car);
    addToMapIndex(fuelTypeIndex, car.engine.fuelType, car);
    addToMapIndex(transmissionIndex, car.transmission.type, car);
    addToMapIndex(driveTypeIndex, car.driveType, car);
    addToMapIndex(countryIndex, car.countryOfOrigin, car);
  }

  // Pre-compute sorted makes list
  cachedMakes = Array.from(makeIndex.keys())
    .map(k => {
      // Return the original-case version from the first car in the bucket
      const cars = makeIndex.get(k)!;
      return cars[0].make;
    })
    .sort();

  cachedStats = null; // will be lazily computed
}

// Eagerly initialize on module load so the first request is fast.
initDatabase();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get all unique makes (cached).
 */
export function getAllMakes(): string[] {
  return cachedMakes;
}

/**
 * Get models for a specific make using the make index.
 */
export function getModelsByMake(make: string): string[] {
  const cars = makeIndex.get(make.toLowerCase());
  if (!cars) return [];

  const models = new Set(cars.map(car => car.model));
  return Array.from(models).sort();
}

/**
 * Get a car by ID – O(1) via Map.
 */
export function getCarById(id: string): Car | null {
  return idIndex.get(id) ?? null;
}

/**
 * Search cars with filters and sorting.
 *
 * Strategy:
 * 1. Pick the smallest candidate set using indexes (make / bodyStyle / etc.)
 * 2. Run a single-pass filter over the candidates for remaining criteria
 * 3. Sort only the matching results
 * 4. Paginate
 */
export function searchCars(query: SearchQuery): {
  results: Car[];
  total: number;
  hasMore: boolean;
} {
  let candidates = getCandidateSet(query);

  // Single-pass filtering for criteria not already handled by index selection
  candidates = singlePassFilter(candidates, query);

  // Sort
  if (query.sort) {
    sortResultsInPlace(candidates, query.sort.field, query.sort.order);
  }

  const total = candidates.length;
  const limit = query.limit || 50;
  const offset = query.offset || 0;

  return {
    results: candidates.slice(offset, offset + limit),
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Choose the narrowest starting set by leveraging indexes.
 * This avoids scanning the entire database when a selective filter is provided.
 */
function getCandidateSet(query: SearchQuery): Car[] {
  const filters = query.filters;

  // If no filters and no text query, start with the full set
  if (!filters && !query.query) {
    return cachedCars;
  }

  // Try to pick the most selective index to minimize work.
  // We intersect results when multiple indexed filters are active.
  type IndexFilter = { index: Map<string, Car[]>; keys: string[] };
  const indexFilters: IndexFilter[] = [];

  if (filters) {
    if (filters.make?.length) {
      indexFilters.push({
        index: makeIndex,
        keys: filters.make.map(m => m.toLowerCase()),
      });
    }
    if (filters.bodyStyle?.length) {
      indexFilters.push({
        index: bodyStyleIndex,
        keys: filters.bodyStyle,
      });
    }
    if (filters.fuelType?.length) {
      indexFilters.push({
        index: fuelTypeIndex,
        keys: filters.fuelType,
      });
    }
    if (filters.transmission?.length) {
      indexFilters.push({
        index: transmissionIndex,
        keys: filters.transmission,
      });
    }
    if (filters.driveType?.length) {
      indexFilters.push({
        index: driveTypeIndex,
        keys: filters.driveType,
      });
    }
    if (filters.countryOfOrigin?.length) {
      indexFilters.push({
        index: countryIndex,
        keys: filters.countryOfOrigin,
      });
    }
  }

  if (indexFilters.length === 0) {
    return cachedCars;
  }

  // Use the smallest bucket set as the starting point, then intersect
  // Sort by estimated result size (number of keys * avg bucket size) ascending
  indexFilters.sort((a, b) => {
    const sizeA = a.keys.reduce((sum, k) => sum + (a.index.get(k)?.length || 0), 0);
    const sizeB = b.keys.reduce((sum, k) => sum + (b.index.get(k)?.length || 0), 0);
    return sizeA - sizeB;
  });

  // Start with the smallest index filter
  const first = indexFilters[0];
  let resultSet: Set<Car> = new Set();
  for (const key of first.keys) {
    const bucket = first.index.get(key);
    if (bucket) {
      for (const car of bucket) {
        resultSet.add(car);
      }
    }
  }

  // Intersect with remaining index filters
  for (let i = 1; i < indexFilters.length; i++) {
    const filter = indexFilters[i];
    const allowedSet = new Set<Car>();
    for (const key of filter.keys) {
      const bucket = filter.index.get(key);
      if (bucket) {
        for (const car of bucket) {
          allowedSet.add(car);
        }
      }
    }
    // Keep only cars that appear in both sets
    for (const car of resultSet) {
      if (!allowedSet.has(car)) {
        resultSet.delete(car);
      }
    }
  }

  return Array.from(resultSet);
}

/**
 * Single-pass filter: evaluate ALL remaining conditions per car in one loop.
 * Indexed fields (make, bodyStyle, fuelType, transmission, driveType, country)
 * are skipped here since getCandidateSet already handled them.
 */
function singlePassFilter(cars: Car[], query: SearchQuery): Car[] {
  const filters = query.filters;
  const searchTerm = query.query?.toLowerCase();

  // If nothing to filter, return as-is
  const hasTextSearch = !!searchTerm;
  const hasModel = !!filters?.model?.length;
  const hasYearMin = filters?.year?.min != null;
  const hasYearMax = filters?.year?.max != null;
  const hasHpMin = filters?.horsepower?.min != null;
  const hasHpMax = filters?.horsepower?.max != null;
  const hasFuelEcoMin = filters?.fuelEconomy?.min != null;
  const hasFuelEcoMax = filters?.fuelEconomy?.max != null;
  const hasPriceMin = filters?.price?.min != null;
  const hasPriceMax = filters?.price?.max != null;

  const needsFiltering = hasTextSearch || hasModel || hasYearMin || hasYearMax ||
    hasHpMin || hasHpMax || hasFuelEcoMin || hasFuelEcoMax || hasPriceMin || hasPriceMax;

  if (!needsFiltering) {
    return cars;
  }

  // Pre-compute lowercase model set for fast lookup
  const modelSet = hasModel
    ? new Set(filters!.model!.map(m => m.toLowerCase()))
    : null;

  const yearMin = filters?.year?.min;
  const yearMax = filters?.year?.max;
  const hpMin = filters?.horsepower?.min;
  const hpMax = filters?.horsepower?.max;
  const fuelEcoMin = filters?.fuelEconomy?.min;
  const fuelEcoMax = filters?.fuelEconomy?.max;
  const priceMin = filters?.price?.min;
  const priceMax = filters?.price?.max;

  const result: Car[] = [];

  for (const car of cars) {
    // Text search
    if (hasTextSearch) {
      const matchesMake = car.make.toLowerCase().includes(searchTerm!);
      const matchesModel = car.model.toLowerCase().includes(searchTerm!);
      const matchesYear = car.year.toString().includes(searchTerm!);
      const matchesTrim = car.trim?.toLowerCase().includes(searchTerm!) ?? false;
      if (!matchesMake && !matchesModel && !matchesYear && !matchesTrim) {
        continue;
      }
    }

    // Model filter
    if (modelSet && !modelSet.has(car.model.toLowerCase())) {
      continue;
    }

    // Year range
    if (hasYearMin && car.year < yearMin!) continue;
    if (hasYearMax && car.year > yearMax!) continue;

    // Horsepower range
    if (hasHpMin && car.engine.horsepower < hpMin!) continue;
    if (hasHpMax && car.engine.horsepower > hpMax!) continue;

    // Fuel economy range
    if (hasFuelEcoMin && (car.fuelEconomy.combined || 0) < fuelEcoMin!) continue;
    if (hasFuelEcoMax && (car.fuelEconomy.combined || 0) > fuelEcoMax!) continue;

    // Price range
    if (hasPriceMin && (car.price?.msrp || 0) < priceMin!) continue;
    if (hasPriceMax && (car.price?.msrp || 0) > priceMax!) continue;

    result.push(car);
  }

  return result;
}

/**
 * Sort results in-place (avoids creating a new array).
 */
function sortResultsInPlace(cars: Car[], field: string, order: 'asc' | 'desc'): void {
  const dir = order === 'asc' ? 1 : -1;

  const accessor = getAccessor(field);
  if (!accessor) return;

  cars.sort((a, b) => {
    const aVal = accessor(a);
    const bVal = accessor(b);
    if (aVal < bVal) return -dir;
    if (aVal > bVal) return dir;
    return 0;
  });
}

function getAccessor(field: string): ((car: Car) => string | number) | null {
  switch (field) {
    case 'make': return c => c.make;
    case 'model': return c => c.model;
    case 'year': return c => c.year;
    case 'horsepower': return c => c.engine.horsepower;
    case 'price': return c => c.price?.msrp || 0;
    case 'fuelEconomy': return c => c.fuelEconomy.combined || 0;
    default: return null;
  }
}

/**
 * Get multiple cars by IDs – O(n) via Map instead of O(n*m).
 */
export function getCarsByIds(ids: string[]): Car[] {
  const result: Car[] = [];
  for (const id of ids) {
    const car = idIndex.get(id);
    if (car) result.push(car);
  }
  return result;
}

/**
 * Get statistics about the database (cached after first computation).
 */
export function getStatistics() {
  if (cachedStats) return cachedStats;
  cachedStats = computeStatistics();
  return cachedStats;
}

function computeStatistics() {
  const totalCars = cachedCars.length;

  const yearRange = { min: Infinity, max: -Infinity };
  const bodyStyles: Record<string, number> = {};
  const fuelTypes: Record<string, number> = {};

  for (const car of cachedCars) {
    if (car.year < yearRange.min) yearRange.min = car.year;
    if (car.year > yearRange.max) yearRange.max = car.year;
    bodyStyles[car.bodyStyle] = (bodyStyles[car.bodyStyle] || 0) + 1;
    fuelTypes[car.engine.fuelType] = (fuelTypes[car.engine.fuelType] || 0) + 1;
  }

  return {
    totalCars,
    totalMakes: makeIndex.size,
    totalCountries: countryIndex.size,
    yearRange: totalCars > 0 ? yearRange : { min: 0, max: 0 },
    bodyStyles,
    fuelTypes,
    lastUpdated,
  };
}
