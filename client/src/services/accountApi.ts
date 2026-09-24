import type { CarSpecs } from '../types/car.types';
import { API_BASE_URL, API_TIMEOUT_MS, createApiClient, isHttpError, type HttpError } from './http';

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setAccountAuthTokenGetter(getter: (() => Promise<string | null>) | null) {
  tokenGetter = getter;
}

/** Its own client so Clerk tokens ride only on account calls, never public car APIs. */
const accountApi = createApiClient({
  baseUrl: API_BASE_URL,
  timeoutMs: API_TIMEOUT_MS,
  headers: async (): Promise<Record<string, string>> => {
    const token = tokenGetter ? await tokenGetter() : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export interface AccountCapabilities {
  authConfigured: boolean;
  storageConfigured: boolean;
  billingConfigured: boolean;
  freeGarageLimit: number;
}

export interface AccountUser {
  id: string;
  email: string | null;
  plan: 'free' | 'pro';
  stripeCustomerId: string | null;
  createdAt: string;
}

export interface MeResponse {
  user: AccountUser;
  garageIds: string[];
  freeGarageLimit: number;
  garageLimit: number | null;
}

export interface GarageResponse {
  ids: string[];
  cars?: CarSpecs[];
  plan: 'free' | 'pro';
  freeGarageLimit: number;
  garageLimit: number | null;
}

export async function getAccountStatus(): Promise<AccountCapabilities> {
  return accountApi.get('/me/status');
}

export async function getMe(): Promise<MeResponse> {
  return accountApi.get('/me');
}

export async function getMyGarage(): Promise<GarageResponse> {
  return accountApi.get('/me/garage');
}

export async function putMyGarage(carIds: string[]): Promise<GarageResponse> {
  return accountApi.put('/me/garage', { carIds });
}

export async function addMyGarageItem(carId: string): Promise<GarageResponse> {
  return accountApi.post('/me/garage/items', { carId });
}

export async function removeMyGarageItem(carId: string): Promise<GarageResponse> {
  return accountApi.delete(`/me/garage/items/${encodeURIComponent(carId)}`);
}

export async function createCheckoutSession(): Promise<{ url: string }> {
  return accountApi.post('/billing/checkout');
}

export async function createPortalSession(): Promise<{ url: string }> {
  return accountApi.post('/billing/portal');
}

export interface GarageLimitBody {
  code: 'GARAGE_LIMIT';
  error?: string;
  limit?: number;
}

export function isGarageLimitError(error: unknown): error is HttpError & { body: GarageLimitBody } {
  return (
    isHttpError(error) &&
    error.status === 403 &&
    (error.body as { code?: unknown } | null)?.code === 'GARAGE_LIMIT'
  );
}
