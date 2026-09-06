import axios from 'axios';
import type { CarDashboard, CarSpecs, SearchQuery, SearchResults } from '../types/car.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 60_000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
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

export interface SearchSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  query: string;
}

export async function getSearchSuggestions(q = '', limit = 8): Promise<SearchSuggestion[]> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('limit', String(limit));
  const response = await api.get(`/cars/search/suggestions?${params.toString()}`);
  return response.data.data;
}

export async function getSiteVisitCount(): Promise<number> {
  const response = await api.get('/stats/site');
  return Number(response.data?.data?.visits) || 0;
}

/** Record one visit for this browser session; returns updated total. */
export async function recordSiteVisit(): Promise<number> {
  const response = await api.post('/stats/visit');
  return Number(response.data?.data?.visits) || 0;
}

/**
 * Fetch every match for a query by paginating past the server's per-request
 * limit (500). Capped at maxRecords to avoid hammering the API.
 */
export async function searchAllCars(query: SearchQuery, maxRecords = 3000): Promise<SearchResults> {
  const PAGE = 500;
  const first = await searchCars({ ...query, limit: PAGE, offset: 0 });
  const all = [...first.results];
  const target = Math.min(first.total, maxRecords);
  while (all.length < target) {
    const page = await searchCars({ ...query, limit: PAGE, offset: all.length });
    if (page.results.length === 0) break;
    all.push(...page.results);
  }
  return { results: all, total: first.total, hasMore: all.length < first.total };
}

/**
 * Get car by ID
 */
export async function getCarById(id: string): Promise<CarSpecs> {
  const response = await api.get(`/cars/${id}`);
  return response.data.data;
}

export async function getCarDashboard(id: string, region?: string): Promise<CarDashboard> {
  const params = region ? `?region=${encodeURIComponent(region)}` : '';
  const response = await api.get(`/cars/${id}/dashboard${params}`);
  return response.data.data;
}

/**
 * Get similar / cross-shopped vehicles for a car
 */
export async function getSimilarCars(id: string, limit = 6): Promise<CarSpecs[]> {
  const response = await api.get(`/cars/${id}/similar?limit=${limit}`);
  return response.data.data;
}

/** Same year/make/model EPA configs (other trims/transmissions). */
export async function getSiblingConfigs(id: string, limit = 24): Promise<CarSpecs[]> {
  const response = await api.get(`/cars/${id}/siblings?limit=${limit}`);
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

export interface ChartPoint {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mpg: number;
  displacement: number;
  co2: number;
  bodyStyle: string;
  /** Plotted efficiency/emissions/engine fields come from EPA pipeline */
  ySource: 'epa' | 'estimated';
  /** X-axis price is always Ontario/CAD model estimate */
  priceIsEstimated: boolean;
}

export interface VinDecodeResult {
  vin: string;
  decodedClean: boolean;
  errorText?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  series?: string;
  bodyClass?: string;
  vehicleType?: string;
  driveType?: string;
  doors?: number;
  engine: {
    hp?: number;
    hpFromKw?: boolean;
    kw?: number;
    cylinders?: number;
    displacementL?: number;
    configuration?: string;
    turbo?: boolean;
    fuelPrimary?: string;
    fuelSecondary?: string;
    electrification?: string;
    model?: string;
  };
  transmission?: string;
  transmissionSpeeds?: string;
  plantCountry?: string;
  plantCity?: string;
  manufacturer?: string;
}

/** Decode a VIN against NHTSA's free vPIC database. */
export async function decodeVin(vin: string, year?: number): Promise<VinDecodeResult> {
  const q = year ? `?year=${year}` : '';
  const response = await api.get(`/vin/${encodeURIComponent(vin.trim())}${q}`);
  return response.data.data;
}

export async function getChartPoints(params: {
  priceMin?: number;
  priceMax?: number;
  bodyStyles?: string[];
  yearMin?: number;
  yearMax?: number;
  limit?: number;
}): Promise<{ points: ChartPoint[]; total: number; returned: number }> {
  const query = new URLSearchParams();
  if (params.priceMin != null) query.set('priceMin', String(params.priceMin));
  if (params.priceMax != null) query.set('priceMax', String(params.priceMax));
  if (params.bodyStyles?.length) query.set('bodyStyles', params.bodyStyles.join(','));
  if (params.yearMin != null) query.set('yearMin', String(params.yearMin));
  if (params.yearMax != null) query.set('yearMax', String(params.yearMax));
  if (params.limit != null) query.set('limit', String(params.limit));
  const response = await api.get(`/cars/stats/chart-points?${query.toString()}`);
  return response.data.data;
}

export interface ChartDensityCell {
  priceMin: number;
  priceMax: number;
  yMin: number;
  yMax: number;
  count: number;
  dominantBodyStyle: string;
}

export interface ChartDensityResult {
  total: number;
  metric: 'mpg' | 'displacement' | 'co2';
  priceMin: number;
  priceMax: number;
  yMin: number;
  yMax: number;
  priceBins: number;
  yBins: number;
  cells: ChartDensityCell[];
}

export async function getChartDensity(params: {
  priceMin?: number;
  priceMax?: number;
  bodyStyles?: string[];
  yearMin?: number;
  yearMax?: number;
  metric?: 'mpg' | 'displacement' | 'co2';
}): Promise<ChartDensityResult> {
  const query = new URLSearchParams();
  if (params.priceMin != null) query.set('priceMin', String(params.priceMin));
  if (params.priceMax != null) query.set('priceMax', String(params.priceMax));
  if (params.bodyStyles?.length) query.set('bodyStyles', params.bodyStyles.join(','));
  if (params.yearMin != null) query.set('yearMin', String(params.yearMin));
  if (params.yearMax != null) query.set('yearMax', String(params.yearMax));
  if (params.metric) query.set('metric', params.metric);
  const response = await api.get(`/cars/stats/chart-density?${query.toString()}`);
  return response.data.data;
}

