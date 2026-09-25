/**
 * Build verified vehicle database from EPA FuelEconomy.gov bulk CSV + optional NHTSA enrichment.
 *
 * Usage:
 *   tsx scripts/build-verified-database.ts [--skip-nhtsa] [--nhtsa-from=2011] [--limit=N]
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import type { Car, Provenance, ProvenanceSource } from '../src/types/car.types.js';
import { estimatePriceMsrp } from '../src/utils/ownership-economics.js';
import { canonicalizeDisplayModel, resolveNhtsaSafety } from '../src/utils/vehicle-taxonomy.js';
import { ensureUniqueIds } from '../src/utils/unique-ids.js';
import {
  completenessScore,
  configurationKey,
  type EpaRow,
  mapEpaRow,
  MIN_MODEL_YEAR,
  maxModelYear,
  variantCarId,
} from './lib/epa-row.js';
import { fetchBuffer } from './lib/fetch.js';
import { fetchNhtsaSafety } from './lib/nhtsa-safety.js';

const EPA_CSV_URL = 'https://fueleconomy.gov/feg/epadata/vehicles.csv';
const EPA_ZIP_URL = 'https://fueleconomy.gov/feg/epadata/vehicles.csv.zip';
const __scriptDir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__scriptDir, '..', 'data');
const RAW_DIR = join(DATA_DIR, 'raw');
const CSV_PATH = join(RAW_DIR, 'vehicles.csv');
const ZIP_PATH = join(RAW_DIR, 'vehicles.csv.zip');
const OUTPUT_PATH = join(DATA_DIR, 'cars.json');
const NHTSA_CACHE_PATH = join(RAW_DIR, 'nhtsa-enrichment-cache.json');
/** Optional MSRP overrides keyed by car id. File is not required; missing is a no-op. */
const MANUAL_PRICES_PATH = join(DATA_DIR, 'manual-prices.json');
interface NhtsaCacheEntry {
  countryOfOrigin?: string;
  safetyRating?: Car['safetyRating'];
  fetchedAt: string;
}

type NhtsaCache = Record<string, NhtsaCacheEntry>;

const args = process.argv.slice(2);
const skipNhtsa = args.includes('--skip-nhtsa');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const nhtsaFromArg = args.find((a) => a.startsWith('--nhtsa-from='));
const nhtsaFromYear = nhtsaFromArg ? parseInt(nhtsaFromArg.split('=')[1], 10) : 2011;

function setProv(provenance: Provenance, field: string, source: ProvenanceSource): void {
  provenance[field] = source;
}

/** The full EPA file is tens of megabytes; allow a slow link, not a hung one. */
const DOWNLOAD_TIMEOUT_MS = 5 * 60_000;

async function ensureEpaCsv(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  if (existsSync(CSV_PATH)) return;

  console.log('Downloading EPA vehicles.csv...');
  try {
    writeFileSync(CSV_PATH, await fetchBuffer(EPA_CSV_URL, DOWNLOAD_TIMEOUT_MS));
    return;
  } catch {
    console.log('Direct CSV unavailable, trying zip...');
  }

  writeFileSync(ZIP_PATH, await fetchBuffer(EPA_ZIP_URL, DOWNLOAD_TIMEOUT_MS));

  const { execSync } = await import('child_process');
  const isWin = process.platform === 'win32';
  if (isWin) {
    execSync(
      `powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${RAW_DIR}' -Force"`,
      { stdio: 'inherit' },
    );
  } else {
    execSync(`unzip -o "${ZIP_PATH}" -d "${RAW_DIR}"`, { stdio: 'inherit' });
  }
}

async function parseEpaCsv(): Promise<EpaRow[]> {
  return new Promise((resolvePromise, reject) => {
    const rows: EpaRow[] = [];
    createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_column_count: true }))
      .on('data', (row: EpaRow) => rows.push(row))
      .on('end', () => resolvePromise(rows))
      .on('error', reject);
  });
}

function applyPricing(cars: Car[]): void {
  let manual: Record<string, number> = {};
  if (existsSync(MANUAL_PRICES_PATH)) {
    manual = JSON.parse(readFileSync(MANUAL_PRICES_PATH, 'utf-8'));
  }

  for (const car of cars) {
    const manualPrice = manual[car.id];
    if (manualPrice) {
      car.price = { msrp: manualPrice, isEstimated: false };
      setProv(car.provenance, 'price.msrp', 'curated');
      continue;
    }

    const msrp = estimatePriceMsrp(car);
    car.price = {
      msrp,
      min: Math.round(msrp * 0.9),
      max: Math.round(msrp * 1.1),
      isEstimated: true,
    };
    setProv(car.provenance, 'price.msrp', 'estimated');
  }
}

/**
 * One listing per configuration a shopper can tell apart (configurationKey:
 * engine, aspiration, fuel, drive, transmission). The importer used to key on
 * model, year and transmission alone, so a second engine with the same
 * gearbox was dropped: the Mustang GT beside the EcoBoost, the Civic Type R
 * beside the 1.5T, about 6,600 listings in all.
 *
 * Within each make-model-year-trim ID, the row the old rule kept (the first
 * most complete) keeps the plain ID, so existing links and saved garages
 * still resolve. Other configurations get EPA's row ID appended.
 */
function selectListings(entries: { row: EpaRow; car: Car }[]): Car[] {
  const byId = new Map<string, { row: EpaRow; car: Car }[]>();
  for (const entry of entries) {
    const group = byId.get(entry.car.id);
    if (group) group.push(entry);
    else byId.set(entry.car.id, [entry]);
  }

  const listings: Car[] = [];
  for (const group of byId.values()) {
    let primary = group[0];
    for (const entry of group) {
      if (completenessScore(entry.car) > completenessScore(primary.car)) primary = entry;
    }
    listings.push(primary.car);
    const seen = new Set([configurationKey(primary.row)]);
    for (const entry of group) {
      const key = configurationKey(entry.row);
      if (seen.has(key)) continue; // an emissions or test variant of one already listed
      seen.add(key);
      listings.push({ ...entry.car, id: variantCarId(entry.row) });
    }
  }
  return listings;
}

function loadNhtsaCache(): NhtsaCache {
  if (!existsSync(NHTSA_CACHE_PATH)) return {};
  return JSON.parse(readFileSync(NHTSA_CACHE_PATH, 'utf-8'));
}

function saveNhtsaCache(cache: NhtsaCache): void {
  writeFileSync(NHTSA_CACHE_PATH, JSON.stringify(cache, null, 2));
}

async function enrichWithNhtsa(cars: Car[]): Promise<void> {
  const cache = loadNhtsaCache();
  const uniqueKeys = new Set<string>();
  for (const car of cars) {
    if (car.year < nhtsaFromYear) continue;
    const displayModel = canonicalizeDisplayModel(car);
    uniqueKeys.add(`${car.make}|${displayModel}|${car.year}`);
    uniqueKeys.add(`${car.make}|${car.model}|${car.year}`);
  }

  let processed = 0;
  const total = uniqueKeys.size;

  for (const key of uniqueKeys) {
    processed++;
    const [make, model, yearStr] = key.split('|');
    const year = parseInt(yearStr, 10);

    if (cache[key]) {
      if (processed % 500 === 0) console.log(`NHTSA cache hit progress: ${processed}/${total}`);
      continue;
    }

    try {
      const safety = await fetchNhtsaSafety(make, model, year);
      cache[key] = {
        safetyRating: safety,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`NHTSA fetch failed for ${key}:`, (err as Error).message);
      cache[key] = { fetchedAt: new Date().toISOString() };
    }

    if (processed % 25 === 0) {
      saveNhtsaCache(cache);
      console.log(`NHTSA enrichment: ${processed}/${total}`);
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  saveNhtsaCache(cache);

  const safetyIndex: Record<
    string,
    { overall: number; frontal?: number; side?: number; rollover?: number }
  > = {};
  for (const [key, entry] of Object.entries(cache)) {
    if (entry.safetyRating?.overall) {
      safetyIndex[key] = entry.safetyRating as { overall: number };
    }
  }

  for (const car of cars) {
    const resolved = resolveNhtsaSafety(car, safetyIndex, canonicalizeDisplayModel(car));
    if (resolved) {
      car.safetyRating = resolved;
      setProv(car.provenance, 'safetyRating', 'nhtsa');
    }
  }
}

function reportCoverage(cars: Car[]): void {
  const provenanceCounts: Record<ProvenanceSource, number> = {
    epa: 0,
    nhtsa: 0,
    estimated: 0,
    curated: 0,
  };

  let withSafety = 0;
  let withPrice = 0;
  let estimatedPrice = 0;

  let withEpaMpg = 0;
  let withCountry = 0;

  for (const car of cars) {
    if (car.safetyRating) withSafety++;
    if (car.price?.msrp) withPrice++;
    if (car.price?.isEstimated) estimatedPrice++;
    if (car.fuelEconomy.combined) withEpaMpg++;
    if (car.countryOfOrigin) withCountry++;
    const sources = new Set(Object.values(car.provenance));
    for (const source of sources) {
      provenanceCounts[source]++;
    }
  }

  if (cars.length === 0) {
    console.log('\n=== Build Summary ===\nNo records produced.');
    return;
  }

  console.log('\n=== Build Summary ===');
  console.log(`Total records: ${cars.length}`);
  console.log(`With EPA MPG: ${withEpaMpg} (${((withEpaMpg / cars.length) * 100).toFixed(1)}%)`);
  console.log(
    `With safety ratings: ${withSafety} (${((withSafety / cars.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `With country (estimated): ${withCountry} (${((withCountry / cars.length) * 100).toFixed(1)}%)`,
  );
  console.log(`With price: ${withPrice} (${((withPrice / cars.length) * 100).toFixed(1)}%)`);
  console.log(`Estimated prices: ${estimatedPrice}`);
  console.log('Cars with at least one source tag:', provenanceCounts);
  console.log(
    `Year range: ${Math.min(...cars.map((c) => c.year))}–${Math.max(...cars.map((c) => c.year))}`,
  );
  console.log(`Makes: ${new Set(cars.map((c) => c.make)).size}`);
}

async function main(): Promise<void> {
  console.log('Building verified database from EPA data...');
  await ensureEpaCsv();

  const rows = await parseEpaCsv();
  console.log(`Parsed ${rows.length} EPA rows`);

  const entries: { row: EpaRow; car: Car }[] = [];
  for (const row of rows) {
    const car = mapEpaRow(row);
    if (car) entries.push({ row, car });
    if (limit && entries.length >= limit) break;
  }

  console.log(`Mapped ${entries.length} passenger vehicles (${MIN_MODEL_YEAR}–${maxModelYear()})`);
  let cars = selectListings(entries);
  // A safety net: listings are grouped by slugified ID, so none should share one.
  cars = ensureUniqueIds(cars).cars;
  console.log(`After deduplication: ${cars.length}`);

  applyPricing(cars);

  if (!skipNhtsa) {
    console.log(`Enriching with NHTSA (years >= ${nhtsaFromYear})...`);
    await enrichWithNhtsa(cars);
  } else {
    console.log('Skipping NHTSA enrichment (--skip-nhtsa)');
  }

  const output = {
    cars,
    lastUpdated: new Date().toISOString(),
    sources: ['epa', skipNhtsa ? undefined : 'nhtsa'].filter(Boolean),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  reportCoverage(cars);
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
