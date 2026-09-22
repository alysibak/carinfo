import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { Car } from '../../types/car.types.js';
import { enrichCar } from '../../services/content-enrichment.js';

let cached: Car[] | null = null;
let cachedEnriched: Car[] | null = null;

function resolveCarsJsonPath(): string {
  const candidates = [
    resolve(process.cwd(), 'data/cars.json'),
    resolve(process.cwd(), 'server/data/cars.json'),
    resolve(import.meta.dirname, '../../../data/cars.json'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error('cars.json not found (tried data/ and server/data/)');
}

/** Load raw records from committed cars.json (pre-enrichment, pre-normalize). */
export function loadRawCars(): Car[] {
  if (!cached) {
    const raw = JSON.parse(readFileSync(resolveCarsJsonPath(), 'utf-8')) as { cars: Car[] };
    cached = raw.cars;
  }
  return cached;
}

export function findCar(predicate: (car: Car) => boolean): Car | undefined {
  return loadRawCars().find(predicate);
}

/**
 * Records after load-time enrichment — the stage fuel-type inference actually
 * runs on in production. Enrichment populates `epa.rangeMiles`, which the
 * inference rules depend on, so tests against raw records measure a code path
 * that never ships.
 */
export function loadEnrichedCars(): Car[] {
  if (!cachedEnriched) cachedEnriched = loadRawCars().map(enrichCar);
  return cachedEnriched;
}

export function findEnrichedCar(predicate: (car: Car) => boolean): Car | undefined {
  return loadEnrichedCars().find(predicate);
}
