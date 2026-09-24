import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const serverSrc = path.resolve(__dirname, 'server/src');
const configDir = path.join(serverSrc, 'config');

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['server/src/**/*.ts', 'client/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/__tests__/**', '**/test/**', '**/*.d.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          root: './server',
          environment: 'node',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
          testTimeout: 120_000,
          // Suites fire many requests from one IP; limits are exercised
          // explicitly in app.production.test.ts instead.
          env: { DISABLE_RATE_LIMIT: 'true' },
        },
      },
      {
        extends: true,
        root: './client',
        plugins: [react()],
        resolve: {
          alias: {
            '@carinfo/config/regional-assumptions': path.join(configDir, 'regional-assumptions.ts'),
            '@carinfo/config': configDir,
            '@carinfo/shared': path.join(serverSrc, 'shared'),
            '@carinfo/types': path.join(serverSrc, 'types'),
          },
        },
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
