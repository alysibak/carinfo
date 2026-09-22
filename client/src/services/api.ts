import axios, { isAxiosError } from 'axios';
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

export interface SiteVisitStats {
  visits: number;
  /** False when the server cannot persist the count across restarts. */
  durable: boolean;
}

function toVisitStats(payload: unknown): SiteVisitStats {
  const data = (payload ?? {}) as { visits?: unknown; durable?: unknown };
  return {
    visits: Number(data.visits) || 0,
    // Absent `durable` means an older server; assume not durable rather than
    // presenting a number we cannot stand behind.
    durable: data.durable === true,
  };
}

export async function getSiteVisitCount(): Promise<SiteVisitStats> {
  const response = await api.get('/stats/site');
  return toVisitStats(response.data?.data);
}

/** Record one visit for this browser session; returns updated total. */
export async function recordSiteVisit(): Promise<SiteVisitStats> {
  const response = await api.post('/stats/visit');
  return toVisitStats(response.data?.data);
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
 * The server's own message for a failed request, when it sent one.
 *
 * Every API error body has the shape `{ success: false, error: string }`, so a
 * 4xx carries something the user can act on ("That doesn't look like a valid
 * VIN"). Network failures and 5xx bodies without a message return null, and the
 * caller falls back to its own copy.
 */
export function apiErrorMessage(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const body = error.response?.data as { error?: unknown } | undefined;
  return typeof body?.error === 'string' && body.error.trim() ? body.error : null;
}

/** Shape of GET /cars/stats/overview (see computeStatistics on the server). */
export interface DatabaseStatistics {
  totalCars: number;
  totalMakes: number;
  totalCountries: number;
  countries: string[];
  yearRange: { min: number; max: number };
  bodyStyles: Record<string, number>;
  fuelTypes: Record<string, number>;
  lastUpdated: string;
  dataSources: string[];
  provenanceCounts: { epa: number; nhtsa: number; estimated: number; curated: number };
  coverage: { fuelEconomy: number; nhtsaSafety: number; estimatedPrice: number };
}

/**
 * Get database statistics
 */
export async function getStatistics(): Promise<DatabaseStatistics> {
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

