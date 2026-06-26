/**
 * Backfill NHTSA safety ratings into the enrichment cache for make|model|year
 * combos that are missing ratings. Uses canonical EPA display model names for
 * better NHTSA API hits.
 *
 * Usage:
 *   tsx scripts/build-nhtsa-backfill.ts [--from=2008] [--limit=N] [--refresh]
 */
import axios from 'axios';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Car } from '../src/types/car.types.js';
import { canonicalizeDisplayModel } from '../src/utils/vehicle-taxonomy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const CARS_PATH = join(DATA_DIR, 'cars.json');
const CACHE_PATH = join(DATA_DIR, 'raw', 'nhtsa-enrichment-cache.json');

const args = process.argv.slice(2);
const fromYear = parseInt(args.find((a) => a.startsWith('--from='))?.split('=')[1] ?? '2008', 10);
const limit = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '0', 10);
const refresh = args.includes('--refresh');

interface CacheEntry {
  safetyRating?: {
    overall?: number;
    frontal?: number;
    side?: number;
    rollover?: number;
  };
  fetchedAt?: string;
}

function parseStar(value: string | undefined): number | undefined {
  if (!value || value === 'Not Rated' || value === 'N/A') return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

async function fetchNhtsaSafety(make: string, model: string, year: number) {
  const listRes = await axios.get(
    `https://api.nhtsa.gov/SafetyRatings/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}`,
    { timeout: 15000 },
  );
  const results = listRes.data?.Results;
  if (!Array.isArray(results) || results.length === 0) return undefined;

  const vehicleId = results[0].VehicleId;
  if (!vehicleId) return undefined;

  const detailRes = await axios.get(`https://api.nhtsa.gov/SafetyRatings/VehicleId/${vehicleId}`, {
    timeout: 15000,
  });
  const detail = detailRes.data?.Results?.[0];
  if (!detail) return undefined;

  const safety = {
    overall: parseStar(detail.OverallRating),
    frontal: parseStar(detail.OverallFrontCrashRating),
    side: parseStar(detail.OverallSideCrashRating),
    rollover: parseStar(detail.RolloverRating),
  };

  if (!safety.overall && !safety.frontal && !safety.side && !safety.rollover) return undefined;
  return safety;
}

function loadCache(): Record<string, CacheEntry> {
  if (!existsSync(CACHE_PATH)) return {};
  return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
}

async function main(): Promise<void> {
  const { cars } = JSON.parse(readFileSync(CARS_PATH, 'utf8')) as { cars: Car[] };
  const cache = loadCache();

  const targets = new Set<string>();
  for (const car of cars) {
    if (car.year < fromYear) continue;
    const displayModel = canonicalizeDisplayModel(car);
    targets.add(`${car.make}|${displayModel}|${car.year}`);
    targets.add(`${car.make}|${car.model}|${car.year}`);
  }

  let queued = 0;
  let fetched = 0;
  let newRatings = 0;

  for (const key of targets) {
    const existing = cache[key];
    if (!refresh && existing?.safetyRating?.overall) continue;
    if (!refresh && existing && !existing.safetyRating && existing.fetchedAt) continue;
    if (limit > 0 && queued >= limit) break;

    queued++;
    const [make, model, yearStr] = key.split('|');
    const year = parseInt(yearStr, 10);

    try {
      const safety = await fetchNhtsaSafety(make, model, year);
      cache[key] = {
        safetyRating: safety,
        fetchedAt: new Date().toISOString(),
      };
      fetched++;
      if (safety?.overall) newRatings++;
      if (fetched % 25 === 0) {
        writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
        console.log(`Progress: ${fetched} fetched, ${newRatings} new ratings`);
      }
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.warn(`Failed ${key}:`, (err as Error).message);
      cache[key] = { fetchedAt: new Date().toISOString() };
    }
  }

  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  console.log(`Done. Fetched ${fetched} lookups, ${newRatings} with star ratings.`);
  console.log(`Cache: ${CACHE_PATH}`);
  console.log('Re-run: npm run build-enrichment --workspace=server');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
