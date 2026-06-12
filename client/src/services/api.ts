import axios from 'axios';
import type { CarSpecs, SearchQuery, SearchResults } from '../types/car.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get all makes
 */
export async function getMakes(): Promise<string[]> {
  const response = await api.get('/cars/makes');
  return response.data.data;
}

/**
 * Get models by make
 */
export async function getModelsByMake(make: string): Promise<string[]> {
  const response = await api.get(`/cars/makes/${encodeURIComponent(make)}/models`);
  return response.data.data;
}

/**
 * Search cars with filters
 */
export async function searchCars(query: SearchQuery): Promise<SearchResults> {
  const response = await api.post('/cars/search', query);
  return response.data.data;
}

/**
 * Get car by ID
 */
export async function getCarById(id: string): Promise<CarSpecs> {
  const response = await api.get(`/cars/${id}`);
  return response.data.data;
}

/**
 * Compare multiple cars
 */
export async function compareCars(ids: string[]): Promise<CarSpecs[]> {
  const response = await api.post('/cars/compare', { ids });
  return response.data.data;
}

/**
 * Get database statistics
 */
export async function getStatistics(): Promise<any> {
  const response = await api.get('/cars/stats/overview');
  return response.data.data;
}

let allCarsCache: CarSpecs[] | null = null;
let allCarsPromise: Promise<CarSpecs[]> | null = null;

export function invalidateAllCarsCache(): void {
  allCarsCache = null;
  allCarsPromise = null;
}

/**
 * Fetch the full vehicle dataset once per session (in-memory cache only).
 */
export async function fetchAllCars(): Promise<CarSpecs[]> {
  if (allCarsCache) {
    return allCarsCache;
  }
  if (allCarsPromise) {
    return allCarsPromise;
  }

  allCarsPromise = searchCars({ limit: 15000 })
    .then((results) => {
      allCarsCache = results.results;
      return allCarsCache;
    })
    .finally(() => {
      allCarsPromise = null;
    });

  return allCarsPromise;
}
