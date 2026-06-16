import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import carRoutes from './routes/car.routes.js';
import vinRoutes from './routes/vin.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/cars', carRoutes);
app.use('/api/vin', vinRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CarInfo API is running' });
});

// Serve the built frontend in production (single-origin deploy)
// This makes `/api/...` resolve correctly without relying on Vite's dev proxy.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback (must come after API routes)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
