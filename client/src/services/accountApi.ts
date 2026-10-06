import type { CarSpecs } from '../types/car.types';
import { API_BASE_URL, API_TIMEOUT_MS, createApiClient, isHttpError, type HttpError } from './http';

/**
 * Account calls. The sign-in rides along as the session cookie, which the
 * browser sends to the site's own /api by itself.
 */
const accountApi = createApiClient({ baseUrl: API_BASE_URL, timeoutMs: API_TIMEOUT_MS });

export interface AccountCapabilities {
  /** Accounts are set up, so the tools need one. */
  authConfigured: boolean;
  storageConfigured: boolean;
  /** Pro can be bought. */
  billingConfigured: boolean;
  googleSignIn: boolean;
  /** Password reset and address confirmation, both of which need email. */
  emailConfigured: boolean;
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
