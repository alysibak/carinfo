/**
 * Pre-build enriched+normalized cars for fast serverless cold starts.
 * Runtime loads cars-ready.json and skips per-request enrichCar/normalize.
 *
 * Usage: npm run build-runtime-db --workspace=server
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { enrichCar } from '../src/services/content-enrichment.js';
import { normalizeCarRecord } from '../src/utils/car-normalize.js';
import { resolveDataFile } from '../src/utils/data-paths.js';
import type { Car } from '../src/types/car.types.js';

interface CarDatabase {
  cars: Car[];
  lastUpdated: string;
  sources?: string[];
}

const started = Date.now();
const dbPath = resolveDataFile('cars.json');
if (!dbPath) {
  console.error('[build-runtime-db] cars.json not found');
  process.exit(1);
}

console.log(`[build-runtime-db] Reading ${dbPath}...`);
const db = JSON.parse(readFileSync(dbPath, 'utf-8')) as CarDatabase;
console.log(`[build-runtime-db] Enriching + normalizing ${db.cars.length.toLocaleString()} cars...`);

const cars = db.cars.map((car) => normalizeCarRecord(enrichCar(car)));
const out = {
  cars,
  lastUpdated: db.lastUpdated,
  sources: db.sources?.length ? db.sources : ['epa'],
  ready: true as const,
  builtAt: new Date().toISOString(),
};

const outPath = resolve(dbPath, '..', 'cars-ready.json');
const payload = JSON.stringify(out);
writeFileSync(outPath, payload);
const mb = (Buffer.byteLength(payload) / (1024 * 1024)).toFixed(1);
console.log(
  `[build-runtime-db] Wrote ${outPath} (${cars.length.toLocaleString()} cars, ${mb} MB) in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
