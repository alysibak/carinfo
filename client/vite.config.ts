import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Read VITE_* env vars from the repo root so one .env serves both workspaces.
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    // Code shared with the server. Each alias points at a directory whose
    // modules must stay pure (no Node APIs, no I/O) — see server/src/shared.
    alias: {
      '@carinfo/config': path.resolve(__dirname, '../server/src/config'),
      '@carinfo/shared': path.resolve(__dirname, '../server/src/shared'),
      '@carinfo/types': path.resolve(__dirname, '../server/src/types'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
