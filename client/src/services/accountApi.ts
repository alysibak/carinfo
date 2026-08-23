import type { CarSpecs } from '../types/car.types';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Separate axios instance so we can attach Clerk tokens without affecting public car APIs. */
const accountApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 60_000,
  headers: { 'Content-Type': 'application/json' },
});

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setAccountAuthTokenGetter(getter: (() => Promise<string | null>) | null) {
  tokenGetter = getter;
}

accountApi.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
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
  const response = await accountApi.get('/me/status');
  return response.data.data;
}

export async function getMe(): Promise<MeResponse> {
  const response = await accountApi.get('/me');
  return response.data.data;
}

export async function getMyGarage(): Promise<GarageResponse> {
  const response = await accountApi.get('/me/garage');
  return response.data.data;
}

export async function putMyGarage(carIds: string[]): Promise<GarageResponse> {
  const response = await accountApi.put('/me/garage', { carIds });
  return response.data.data;
}

export async function addMyGarageItem(carId: string): Promise<GarageResponse> {
  const response = await accountApi.post('/me/garage/items', { carId });
  return response.data.data;
}

export async function removeMyGarageItem(carId: string): Promise<GarageResponse> {
  const response = await accountApi.delete(`/me/garage/items/${encodeURIComponent(carId)}`);
  return response.data.data;
}

export async function createCheckoutSession(): Promise<{ url: string }> {
  const response = await accountApi.post('/billing/checkout');
  return response.data.data;
}

export async function createPortalSession(): Promise<{ url: string }> {
  const response = await accountApi.post('/billing/portal');
  return response.data.data;
}

export function isGarageLimitError(error: unknown): error is {
  response: { status: number; data: { code?: string; error?: string; limit?: number } };
} {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 403 &&
    error.response.data?.code === 'GARAGE_LIMIT'
  );
}
