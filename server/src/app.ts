import express from 'express';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';
import carRoutes from './routes/car.routes.js';
import vinRoutes from './routes/vin.routes.js';
import meRoutes from './routes/me.routes.js';
import billingRoutes from './routes/billing.routes.js';
import statsRoutes from './routes/stats.routes.js';
import seoRoutes from './seo/seo.routes.js';
import * as carService from './services/car.service.js';
import * as billingController from './controllers/billing.controller.js';
import { resolveDataFile } from './utils/data-paths.js';
import { corsOptions, publicReadLimiter } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestContext } from './middleware/request-context.js';

// Load .env from the CWD (server/ in dev), then fall back to the repo
// root so one root .env can configure both workspaces. Missing files no-op.
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const app = express();

// Behind Vercel / any reverse proxy, the client IP lives in X-Forwarded-For.
// Rate limiting keys on it, so without this every visitor shares one bucket.
app.set('trust proxy', 1);

// Drop the default `X-Powered-By: Express` fingerprint.
app.disable('x-powered-by');

app.use(requestContext);

app.use(
  helmet({
    // Baseline CSP, matching vercel.json, for the HTML this server renders
    // (vehicle and compare pages, and the SPA under `npm start`). It leaves
    // script sources open: restricting them means allowlisting the Clerk
    // Frontend API host for the deployment's key. No upgrade-insecure-requests
    // here: `npm start` over plain http://localhost would break.
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        // Deliberately no default-src: it would restrict scripts and styles.
        defaultSrc: helmet.contentSecurityPolicy.dangerouslyDisableDefaultSrc,
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    // Allow the SPA on another origin to read API responses.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(cors(corsOptions()));
app.use(compression());

// Stripe webhooks need the raw body for signature verification, so this must
// be registered before express.json() claims the stream.
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  billingController.handleStripeWebhook,
);

app.use(express.json({ limit: '256kb' }));

// Blanket ceiling under the per-route limits, to bound total API traffic.
app.use('/api', publicReadLimiter());

app.use('/api/cars', carRoutes);
app.use('/api/vin', vinRoutes);
app.use('/api/me', meRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (_req, res) => {
  try {
    const results = carService.searchCars({ limit: 1 });
    // Production ships only the prebuilt corpus; development reads cars.json.
    const dbPath = resolveDataFile('cars-ready.json') ?? resolveDataFile('cars.json');
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      message: 'CarInfo API is running',
      carsTotal: results.total,
      dbFound: !!dbPath,
      dataVersion: carService.getDataVersion(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Health error:', message, error);
    res.status(500).json({
      status: 'error',
      message: 'CarInfo API failed to initialize',
      detail: message,
    });
  }
});

// Unknown /api/* paths get a JSON 404 rather than falling through to the SPA.
app.use('/api', notFoundHandler);

// Server-rendered shells for shareable/indexable pages (vehicle, compare).
// Inert until the client is built; see seo/seo.routes.ts.
app.use(seoRoutes);

// Terminal error handler — must be registered last.
app.use(errorHandler);

export default app;
