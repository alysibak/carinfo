import axios from 'axios';
import type { CarSpecs, SearchQuery, SearchResults } from '../types/car.types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
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
