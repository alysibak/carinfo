import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

export type Car = {
  id: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  countryOfOrigin: string;
  bodyStyle: string;
  engine: { displacement: number; horsepower: number; torque: number; fuelType: string; cylinders?: number; configuration?: string };
  performance: { zeroToSixty?: number; topSpeed?: number; quarterMile?: number };
  dimensions: { length: number; width: number; height: number; wheelbase: number; curbWeight: number };
  fuelEconomy: { city?: number; highway?: number; combined?: number };
  transmission: { type: string; speeds?: number };
  driveType: string;
  safetyRating?: { overall?: number; frontal?: number; side?: number; rollover?: number };
  price?: { msrp?: number; min?: number; max?: number };
};

export type SearchQuery = {
  query?: string;
  filters?: {
    year?: { min?: number; max?: number };
    make?: string[];
    model?: string[];
    bodyStyle?: string[];
    fuelType?: string[];
    transmission?: string[];
    driveType?: string[];
    countryOfOrigin?: string[];
    horsepower?: { min?: number; max?: number };
    fuelEconomy?: { min?: number; max?: number };
    price?: { min?: number; max?: number };
  };
  sort?: { field: string; order: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
};

type CarDatabase = { cars: Car[]; lastUpdated?: string };

let cached: { cars: Car[]; lastUpdated: string } | null = null;
let indexes:
  | null
  | {
      id: Map<string, Car>;
      make: Map<string, Car[]>;
      model: Map<string, Car[]>;
      bodyStyle: Map<string, Car[]>;
      fuelType: Map<string, Car[]>;
      transmission: Map<string, Car[]>;
      driveType: Map<string, Car[]>;
      countryOfOrigin: Map<string, Car[]>;
      makesSorted: string[];
      stats: any | null;
    } = null;

function getDbPathCandidates(): string[] {
  return [
    resolve(process.cwd(), 'server', 'data', 'cars.json'),
    resolve(process.cwd(), 'data', 'cars.json'),
    // When bundled, the working directory can be inside the function root.
    // Try walking up one level as a last resort.
    resolve(process.cwd(), '..', 'server', 'data', 'cars.json'),
    join(process.cwd(), 'server', 'data', 'cars.json'),
  ];
}

function resolveDbPath(): string | null {
  for (const p of getDbPathCandidates()) {
    if (existsSync(p)) return p;
  }
  return null;
}

function loadDb(): { cars: Car[]; lastUpdated: string } {
  if (cached) return cached;

  const dbPath = resolveDbPath();
  if (!dbPath) {
    cached = { cars: [], lastUpdated: new Date().toISOString() };
    return cached;
  }

  const raw = readFileSync(dbPath, 'utf8');
  const db: CarDatabase = JSON.parse(raw);
  cached = { cars: db.cars || [], lastUpdated: db.lastUpdated || new Date().toISOString() };
  return cached;
}

function addToIndex(map: Map<string, Car[]>, key: string, car: Car): void {
  const existing = map.get(key);
  if (existing) existing.push(car);
  else map.set(key, [car]);
}

function ensureIndexes(): NonNullable<typeof indexes> {
  if (indexes) return indexes;

  const { cars, lastUpdated } = loadDb();
  const id = new Map<string, Car>();
  const make = new Map<string, Car[]>();
  const model = new Map<string, Car[]>();
  const bodyStyle = new Map<string, Car[]>();
  const fuelType = new Map<string, Car[]>();
  const transmission = new Map<string, Car[]>();
  const driveType = new Map<string, Car[]>();
  const countryOfOrigin = new Map<string, Car[]>();

  for (const car of cars) {
    id.set(car.id, car);
    addToIndex(make, car.make.toLowerCase(), car);
    addToIndex(model, car.model.toLowerCase(), car);
    addToIndex(bodyStyle, (car.bodyStyle || '').toLowerCase(), car);
    addToIndex(fuelType, (car.engine?.fuelType || '').toLowerCase(), car);
    addToIndex(transmission, (car.transmission?.type || '').toLowerCase(), car);
    addToIndex(driveType, (car.driveType || '').toLowerCase(), car);
    addToIndex(countryOfOrigin, (car.countryOfOrigin || '').toLowerCase(), car);
  }

  const makesSorted = Array.from(make.keys())
    .map(k => make.get(k)![0].make)
    .sort();

  indexes = {
    id,
    make,
    model,
    bodyStyle,
    fuelType,
    transmission,
    driveType,
    countryOfOrigin,
    makesSorted,
    stats: null,
  };

  // Keep lastUpdated reachable via stats output
  (indexes as any).lastUpdated = lastUpdated;
  return indexes;
}

export function getAllMakes(): string[] {
  return ensureIndexes().makesSorted;
}

export function getModelsByMake(make: string): string[] {
  const cars = ensureIndexes().make.get(make.toLowerCase());
  if (!cars) return [];
  return Array.from(new Set(cars.map(c => c.model))).sort();
}

export function getCarById(id: string): Car | null {
  return ensureIndexes().id.get(id) ?? null;
}

export function getCarsByIds(ids: string[]): Car[] {
  const idx = ensureIndexes().id;
  const out: Car[] = [];
  for (const id of ids) {
    const car = idx.get(id);
    if (car) out.push(car);
  }
  return out;
}

export function searchCars(query: SearchQuery): { results: Car[]; total: number; hasMore: boolean } {
  const { cars } = loadDb();
  const idx = ensureIndexes();

  const q = query || {};
  const filters = q.filters || {};
  const searchTerm = (q.query || '').toLowerCase().trim();

  let candidates: Car[] = cars;

  const indexFilters: Array<{ map: Map<string, Car[]>; keys: string[] }> = [];

  if (filters.make?.length) indexFilters.push({ map: idx.make, keys: filters.make.map(m => m.toLowerCase()) });
  if (filters.bodyStyle?.length) indexFilters.push({ map: idx.bodyStyle, keys: filters.bodyStyle.map(s => s.toLowerCase()) });
  if (filters.fuelType?.length) indexFilters.push({ map: idx.fuelType, keys: filters.fuelType.map(s => s.toLowerCase()) });
  if (filters.transmission?.length) indexFilters.push({ map: idx.transmission, keys: filters.transmission.map(s => s.toLowerCase()) });
  if (filters.driveType?.length) indexFilters.push({ map: idx.driveType, keys: filters.driveType.map(s => s.toLowerCase()) });
  if (filters.countryOfOrigin?.length) indexFilters.push({ map: idx.countryOfOrigin, keys: filters.countryOfOrigin.map(s => s.toLowerCase()) });

  if (indexFilters.length) {
    indexFilters.sort((a, b) => {
      const sizeA = a.keys.reduce((sum, k) => sum + (a.map.get(k)?.length || 0), 0);
      const sizeB = b.keys.reduce((sum, k) => sum + (b.map.get(k)?.length || 0), 0);
      return sizeA - sizeB;
    });

    const first = indexFilters[0];
    let set = new Set<Car>();
    for (const k of first.keys) {
      for (const car of first.map.get(k) || []) set.add(car);
    }

    for (let i = 1; i < indexFilters.length; i++) {
      const f = indexFilters[i];
      const allowed = new Set<Car>();
      for (const k of f.keys) {
        for (const car of f.map.get(k) || []) allowed.add(car);
      }
      for (const car of set) {
        if (!allowed.has(car)) set.delete(car);
      }
    }

    candidates = Array.from(set);
  }

  // Remaining filters + text query in single pass
  const modelSet = filters.model?.length ? new Set(filters.model.map(m => m.toLowerCase())) : null;
  const yearMin = filters.year?.min;
  const yearMax = filters.year?.max;
  const hpMin = filters.horsepower?.min;
  const hpMax = filters.horsepower?.max;
  const feMin = filters.fuelEconomy?.min;
  const feMax = filters.fuelEconomy?.max;
  const priceMin = filters.price?.min;
  const priceMax = filters.price?.max;

  const filtered: Car[] = [];
  for (const car of candidates) {
    if (searchTerm) {
      const t = searchTerm;
      const matches =
        car.make.toLowerCase().includes(t) ||
        car.model.toLowerCase().includes(t) ||
        car.year.toString().includes(t) ||
        (car.trim?.toLowerCase().includes(t) ?? false);
      if (!matches) continue;
    }

    if (modelSet && !modelSet.has(car.model.toLowerCase())) continue;
    if (yearMin != null && car.year < yearMin) continue;
    if (yearMax != null && car.year > yearMax) continue;
    if (hpMin != null && (car.engine?.horsepower ?? 0) < hpMin) continue;
    if (hpMax != null && (car.engine?.horsepower ?? 0) > hpMax) continue;
    if (feMin != null && (car.fuelEconomy?.combined ?? 0) < feMin) continue;
    if (feMax != null && (car.fuelEconomy?.combined ?? 0) > feMax) continue;
    if (priceMin != null && (car.price?.msrp ?? 0) < priceMin) continue;
    if (priceMax != null && (car.price?.msrp ?? 0) > priceMax) continue;

    filtered.push(car);
  }

  if (q.sort) {
    const dir = q.sort.order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const av = getSortValue(a, q.sort!.field);
      const bv = getSortValue(b, q.sort!.field);
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }

  const total = filtered.length;
  const limit = q.limit || 50;
  const offset = q.offset || 0;

  return {
    results: filtered.slice(offset, offset + limit),
    total,
    hasMore: offset + limit < total,
  };
}

function getSortValue(car: Car, field: string): string | number {
  switch (field) {
    case 'make': return car.make;
    case 'model': return car.model;
    case 'year': return car.year;
    case 'horsepower': return car.engine?.horsepower ?? 0;
    case 'price': return car.price?.msrp ?? 0;
    case 'fuelEconomy': return car.fuelEconomy?.combined ?? 0;
    default: return 0;
  }
}

export function getStatistics() {
  const idx = ensureIndexes();
  if (idx.stats) return idx.stats;

  const { cars } = loadDb();
  const totalCars = cars.length;
  const yearRange = { min: Infinity, max: -Infinity };
  const bodyStyles: Record<string, number> = {};
  const fuelTypes: Record<string, number> = {};

  for (const car of cars) {
    if (car.year < yearRange.min) yearRange.min = car.year;
    if (car.year > yearRange.max) yearRange.max = car.year;
    const bs = (car.bodyStyle || '').toLowerCase();
    const ft = (car.engine?.fuelType || '').toLowerCase();
    if (bs) bodyStyles[bs] = (bodyStyles[bs] || 0) + 1;
    if (ft) fuelTypes[ft] = (fuelTypes[ft] || 0) + 1;
  }

  idx.stats = {
    totalCars,
    totalMakes: idx.make.size,
    totalCountries: idx.countryOfOrigin.size,
    yearRange: totalCars > 0 ? yearRange : { min: 0, max: 0 },
    bodyStyles,
    fuelTypes,
    lastUpdated: (idx as any).lastUpdated,
  };
  return idx.stats;
}

