import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import type * as AuthClient from '../services/authClient';
import { resetFakeAuth } from './fakeAuthClient';

// No test talks to a sign-in server: see fakeAuthClient.ts.
vi.mock('../services/authClient', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthClient>();
  const { fakeAuthClient } = await import('./fakeAuthClient');
  return { ...actual, authClient: fakeAuthClient };
});

afterEach(() => {
  cleanup();
  resetFakeAuth();
});
