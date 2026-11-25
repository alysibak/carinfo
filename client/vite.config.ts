import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
import { shellFiles, type BundleFile } from './src/offline/shellFiles';

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

/**
 * The reader's files sit under a folder named for their content, so each
 * version has addresses of its own: served as never changing (vercel.json),
 * kept by the browser and the service worker, and never mixed with another
 * version's files after an update.
 */
const OCR_BASE = `/ocr/${createHash('sha256')
  .update(
    Object.entries(OCR_FILES)
      .map(
        ([name, file]) => name + createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
      )
      .join('\n'),
  )
  .digest('hex')
  .slice(0, 10)}`;

function ocrAssets(): Plugin {
  return {
    name: 'carinfo-ocr-assets',
    configureServer(server) {
      server.middlewares.use('/ocr', (req, res, next) => {
        const file = OCR_FILES[path.basename((req.url ?? '').split('?')[0])];
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
        this.emitFile({
          type: 'asset',
          fileName: `${OCR_BASE.slice(1)}/${name}`,
          source: fs.readFileSync(file),
        });
      }
    },
  };
}

/** The app's own files in public/ the shell needs: the theme before paint, the icon, the manifest. */
const PUBLIC_SHELL = [
  '/theme-init.js',
  '/site.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/apple-touch-icon.png',
];

/**
 * Writes /sw.js from service-worker.js with this build's files (see
 * src/offline/shellFiles.ts). Its version follows their content, so a build
 * that changes nothing a visitor loads does not make every phone fetch again.
 */
function serviceWorker(): Plugin {
  return {
    name: 'carinfo-service-worker',
    apply: 'build',
    enforce: 'post',
    writeBundle(options, bundle) {
      const outDir = options.dir ?? path.resolve(__dirname, 'dist');
      const files = shellFiles(bundle as unknown as Record<string, BundleFile>);
      const shell = ['/index.html', ...PUBLIC_SHELL, ...files.shell];
      const content = createHash('sha256');
      for (const file of [...shell, ...files.vin, ...files.garage])
        content.update(file).update(fs.readFileSync(path.join(outDir, file)));
      const build = {
        version: content.digest('hex').slice(0, 12),
        shell,
        vin: files.vin,
        garage: files.garage,
        ocr: OCR_BASE,
      };
      const template = fs.readFileSync(path.resolve(__dirname, 'service-worker.js'), 'utf8');
      const marker = /const BUILD = \{[^}]*\};/;
      if (!marker.test(template)) throw new Error('service-worker.js: no BUILD line to fill');
      fs.writeFileSync(
        path.join(outDir, 'sw.js'),
        template.replace(marker, `const BUILD = ${JSON.stringify(build)};`),
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ocrAssets(), serviceWorker()],
  define: {
    __OCR_BASE__: JSON.stringify(OCR_BASE),
  },
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
