import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    // The import scripts' tests (EPA and NHTSA mapping) never ran.
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    testTimeout: 120_000,
    // beforeAll hooks that read cars load the whole corpus (see ../vitest.config.ts).
    hookTimeout: 120_000,
    env: { DISABLE_RATE_LIMIT: 'true' },
  },
});
