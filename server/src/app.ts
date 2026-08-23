import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import carRoutes from './routes/car.routes.js';
import vinRoutes from './routes/vin.routes.js';
import meRoutes from './routes/me.routes.js';
import billingRoutes from './routes/billing.routes.js';
import * as carService from './services/car.service.js';
import * as billingController from './controllers/billing.controller.js';
import { resolveDataFile } from './utils/data-paths.js';

dotenv.config();

const app = express();

app.use(cors());

// Stripe webhooks need the raw body for signature verification.
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  billingController.handleStripeWebhook,
);

app.use(express.json());

app.use('/api/cars', carRoutes);
app.use('/api/vin', vinRoutes);
app.use('/api/me', meRoutes);
app.use('/api/billing', billingRoutes);

app.get('/api/health', (_req, res) => {
  try {
    const results = carService.searchCars({ limit: 1 });
    const dbPath = resolveDataFile('cars.json');
    res.json({
      status: 'ok',
      message: 'CarInfo API is running',
      carsTotal: results.total,
      dbFound: !!dbPath,
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

export default app;
