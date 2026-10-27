import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const coreDir = path.dirname(require.resolve('tesseract.js-core/package.json'));

/**
 * The text reader the VIN scanner runs (Tesseract), served from the site
 * itself: its worker, its engine in the three builds a browser may pick
 * (relaxed SIMD, SIMD, plain), and English letters and digits. About 7 MB a
 * visitor fetches only on opening the camera. Copied from node_modules at
 * build, served from there in development, never committed.
 */
const OCR_FILES: Record<string, string> = {
  'worker.min.js': require.resolve('tesseract.js/dist/worker.min.js'),
  'tesseract-core-relaxedsimd-lstm.wasm.js': path.join(
    coreDir,
    'tesseract-core-relaxedsimd-lstm.wasm.js',
  ),
  'tesseract-core-simd-lstm.wasm.js': path.join(coreDir, 'tesseract-core-simd-lstm.wasm.js'),
  'tesseract-core-lstm.wasm.js': path.join(coreDir, 'tesseract-core-lstm.wasm.js'),
  'eng.traineddata.gz': require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),
};

function ocrAssets(): Plugin {
  return {
    name: 'carinfo-ocr-assets',
    configureServer(server) {
      server.middlewares.use('/ocr', (req, res, next) => {
        const file = OCR_FILES[(req.url ?? '').slice(1).split('?')[0]];
        if (!file) return next();
        res.setHeader(
          'Content-Type',
          file.endsWith('.gz') ? 'application/octet-stream' : 'text/javascript',
        );
        fs.createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      for (const [name, file] of Object.entries(OCR_FILES)) {
        this.emitFile({ type: 'asset', fileName: `ocr/${name}`, source: fs.readFileSync(file) });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ocrAssets()],
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
      // The browser's Host (localhost:3000) goes through, so sign-in builds
      // its links and Google's callback on the site's origin, not the API's.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: false,
      },
    },
  },
});
