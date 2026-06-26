import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const configDir = path.resolve(__dirname, 'server/src/config');

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          root: './server',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          testTimeout: 120_000,
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
