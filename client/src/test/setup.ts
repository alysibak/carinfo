import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Keep Clerk gated off in unit tests even when a local .env has real keys.
vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', '');

afterEach(() => {
  cleanup();
});
