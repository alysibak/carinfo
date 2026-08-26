import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Read VITE_* env vars from the repo root so one .env serves both workspaces.
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@carinfo/config': path.resolve(__dirname, '../server/src/config'),
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
})
