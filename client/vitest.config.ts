import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const serverSrc = path.resolve(__dirname, '../server/src');
const configDir = path.join(serverSrc, 'config');

export default defineConfig({
  root: __dirname,
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
    // Local .env may have real Clerk keys; keep auth UI out of unit tests
    // so SiteHeader etc. don't require a ClerkProvider.
    env: {
      VITE_CLERK_PUBLISHABLE_KEY: '',
    },
  },
});
