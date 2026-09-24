import type { CarDashboard, CarSpecs, SearchQuery, SearchResults } from '../types/car.types';
import {
  API_BASE_URL,
  API_TIMEOUT_MS,
  createApiClient,
  isHttpError,
  type RequestOptions,
} from './http';

const api = createApiClient({ baseUrl: API_BASE_URL, timeoutMs: API_TIMEOUT_MS });

/** Car IDs are slugs today; encode anyway so an odd one cannot reshape the path. */
const carPath = (id: string) => `/cars/${encodeURIComponent(id)}`;

/**
 * Get all makes
 */
export async function getMakes(): Promise<string[]> {
  return api.get('/cars/makes');
}

/**
 * Get models by make
 */
export async function getModelsByMake(make: string): Promise<string[]> {
  return api.get(`/cars/makes/${encodeURIComponent(make)}/models`);
}

/**
 * Search cars with filters
 */
export async function searchCars(
  query: SearchQuery,
  options?: RequestOptions,
): Promise<SearchResults> {
  return api.post('/cars/search', query, options);
}

export interface SearchSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  query: string;
}

export async function getSearchSuggestions(
  q = '',
  limit = 8,
  options?: RequestOptions,
): Promise<SearchSuggestion[]> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('limit', String(limit));
  return api.get(`/cars/search/suggestions?${params.toString()}`, options);
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
  return toVisitStats(await api.get('/stats/site'));
}

/** Record one visit for this browser session; returns updated total. */
export async function recordSiteVisit(): Promise<SiteVisitStats> {
  return toVisitStats(await api.post('/stats/visit'));
}

/**
 * Get car by ID
 */
export async function getCarById(id: string): Promise<CarSpecs> {
  return api.get(carPath(id));
}

export async function getCarDashboard(id: string, region?: string): Promise<CarDashboard> {
  const params = region ? `?region=${encodeURIComponent(region)}` : '';
  return api.get(`${carPath(id)}/dashboard${params}`);
}

/**
 * Get similar / cross-shopped vehicles for a car
 */
export async function getSimilarCars(id: string, limit = 6): Promise<CarSpecs[]> {
  return api.get(`${carPath(id)}/similar?limit=${limit}`);
}

/** Same year/make/model EPA configs (other trims/transmissions). */
export async function getSiblingConfigs(id: string, limit = 24): Promise<CarSpecs[]> {
  return api.get(`${carPath(id)}/siblings?limit=${limit}`);
}

/**
 * Compare multiple cars
 */
export async function compareCars(ids: string[]): Promise<CarSpecs[]> {
  return api.post('/cars/compare', { ids });
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
  if (!isHttpError(error)) return null;
  const body = error.body as { error?: unknown } | null;
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
  return api.get('/cars/stats/overview');
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
  return api.get(`/vin/${encodeURIComponent(vin.trim())}${q}`);
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
  return api.get(`/cars/stats/chart-points?${query.toString()}`);
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
  return api.get(`/cars/stats/chart-density?${query.toString()}`);
}
