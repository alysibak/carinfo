import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 120_000,
    env: { DISABLE_RATE_LIMIT: 'true' },
  },
});
