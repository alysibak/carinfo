/**
 * Build verified vehicle database from EPA FuelEconomy.gov bulk CSV + optional NHTSA enrichment.
 *
 * Usage:
 *   tsx scripts/build-verified-database.ts [--skip-nhtsa] [--nhtsa-from=2011] [--limit=N]
 */

import axios from 'axios';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import type { BodyStyle, Car, DriveType, FuelType, Provenance, ProvenanceSource } from '../src/types/car.types.js';
import { estimatePriceMsrp } from '../src/utils/ownership-economics.js';

const EPA_CSV_URL = 'https://fueleconomy.gov/feg/epadata/vehicles.csv';
const EPA_ZIP_URL = 'https://fueleconomy.gov/feg/epadata/vehicles.csv.zip';
const __scriptDir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__scriptDir, '..', 'data');
const RAW_DIR = join(DATA_DIR, 'raw');
const CSV_PATH = join(RAW_DIR, 'vehicles.csv');
const ZIP_PATH = join(RAW_DIR, 'vehicles.csv.zip');
const OUTPUT_PATH = join(DATA_DIR, 'cars.json');
const NHTSA_CACHE_PATH = join(RAW_DIR, 'nhtsa-enrichment-cache.json');
const MANUAL_PRICES_PATH = join(DATA_DIR, 'manual-prices.json');
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1995;

interface EpaRow {
  id: string;
  make: string;
  model: string;
  year: string;
  trany: string;
  trans_dscr?: string;
  baseModel?: string;
  drive: string;
  cylinders: string;
  displ: string;
  city08: string;
  highway08: string;
  comb08: string;
  combA08?: string;
  combE?: string;
  cityE?: string;
  co2: string;
  fuelCost08: string;
  fuelType: string;
  fuelType1?: string;
  atvType?: string;
  phevBlended?: string;
  VClass: string;
  rangeA?: string;
  charge120?: string;
  charge240?: string;
}

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

/**
 * VClass → bodyStyle mapping table:
 * - Sport Utility / SUV → suv
 * - Pickup → truck
 * - Station Wagon → wagon
 * - Minivan → minivan
 * - Van / Passenger Van / Cargo Van → van
 * - Two Seaters → coupe
 * - *Cars* (compact/subcompact/mid/large/minicompact) → sedan
 * - Special Purpose → excluded before mapping
 */
function mapVClassToBodyStyle(vclass: string, model = ''): BodyStyle | null {
  const v = vclass.toLowerCase();
  const m = model.toLowerCase();
  if (v.includes('special purpose')) return null;
  if (v.includes('sport utility') || v.includes('suv')) return 'suv';
  if (v.includes('pickup')) return 'truck';
  if (v.includes('station wagon') || v.includes('wagon')) return 'wagon';
  if (v.includes('minivan')) return 'minivan';
  if (v.includes('cargo van') || v.includes('passenger van') || (v.includes('van') && !v.includes('minivan'))) return 'van';
  if (v.includes('two-seater') || v.includes('two seaters')) return 'coupe';
  if (/\b(gti|golf r|e-golf|hatchback|leaf|bolt|prius|veloster|fit|yaris)\b/.test(m)) return 'hatchback';
  if (v.includes('car')) return 'sedan';
  return 'sedan';
}

function mapDrive(drive: string): DriveType {
  const d = drive.toLowerCase();
  if (d.includes('front')) return 'FWD';
  if (d.includes('rear')) return 'RWD';
  // EPA uses "2-Wheel Drive" mostly for RWD trucks
  if (d.includes('2-wheel')) return 'RWD';
  if (d.includes('part-time') || d === '4-wheel drive') return '4WD';
  if (d.includes('all-wheel') || d.includes('4-wheel')) return 'AWD';
  // Unknown/blank: FWD is the most common passenger-car layout
  return 'FWD';
}

function mapTransmission(trany: string): { type: Car['transmission']['type']; speeds?: number; description: string } {
  const t = trany.toLowerCase();
  const speedMatch = trany.match(/(\d+)[-\s]?spd/i);
  const speeds = speedMatch ? parseInt(speedMatch[1], 10) : undefined;
  if (t.includes('manual')) return { type: 'manual', speeds, description: trany };
  if (t.includes('variable gear') || t.includes('cvt')) return { type: 'cvt', speeds, description: trany };
  if (t.includes('dual') || t.includes('dct')) return { type: 'dual-clutch', speeds, description: trany };
  return { type: 'automatic', speeds, description: trany };
}

function mapFuelType(row: EpaRow): FuelType {
  const atv = (row.atvType || '').toLowerCase();
  const ft = (row.fuelType || row.fuelType1 || '').toLowerCase();
  const model = (row.model || '').toLowerCase();
  if (
    atv.includes('fcv') ||
    atv.includes('efcv') ||
    ft.includes('hydrogen') ||
    model.includes('fuel cell') ||
    model.includes('mirai') ||
    model.includes('nexo')
  ) {
    return 'hydrogen';
  }
  // PHEV before electricity — "Premium Gas or Electricity" contains "electricity".
  if (atv.includes('plug-in hybrid') || atv.includes('phev')) return 'plug-in hybrid';
  if (atv.includes('ev') || ft.includes('electricity')) return 'electric';
  if (atv.includes('hybrid') || ft.includes('hybrid')) return 'hybrid';
  if (ft.includes('diesel')) return 'diesel';
  return 'gasoline';
}

function parseNum(value: string | undefined): number | undefined {
  if (!value || value === '-1') return undefined;
  const n = parseFloat(value);
  return Number.isNaN(n) || n < 0 ? undefined : n;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'base';
}

function setProv(provenance: Provenance, field: string, source: ProvenanceSource): void {
  provenance[field] = source;
}

const MAKE_COUNTRY: Record<string, string> = {
  acura: 'Japan', 'alfa romeo': 'Italy', audi: 'Germany', bmw: 'Germany', buick: 'USA',
  cadillac: 'USA', chevrolet: 'USA', chrysler: 'USA', dodge: 'USA', ferrari: 'Italy',
  fiat: 'Italy', ford: 'USA', genesis: 'South Korea', gmc: 'USA', honda: 'Japan',
  hyundai: 'South Korea', infiniti: 'Japan', jaguar: 'UK', jeep: 'USA', kia: 'South Korea',
  lamborghini: 'Italy', 'land rover': 'UK', lexus: 'Japan', lincoln: 'USA', maserati: 'Italy',
  mazda: 'Japan', 'mercedes-benz': 'Germany', mini: 'UK', mitsubishi: 'Japan', nissan: 'Japan',
  porsche: 'Germany', ram: 'USA', subaru: 'Japan', tesla: 'USA', toyota: 'Japan',
  volkswagen: 'Germany', volvo: 'Sweden',
};

function lookupCountry(make: string): string | undefined {
  return MAKE_COUNTRY[make.toLowerCase()];
}

function completenessScore(car: Car): number {
  let score = 0;
  if (car.fuelEconomy.combined) score += 2;
  if (car.fuelEconomy.city) score += 1;
  if (car.fuelEconomy.highway) score += 1;
  if (car.safetyRating?.overall) score += 5;
  if (car.countryOfOrigin) score += 1;
  if (car.epa?.co2) score += 1;
  if (car.engine.displacement) score += 1;
  return score;
}

async function ensureEpaCsv(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  if (existsSync(CSV_PATH)) return;

  console.log('Downloading EPA vehicles.csv...');
  try {
    const response = await axios.get(EPA_CSV_URL, { responseType: 'arraybuffer' });
    writeFileSync(CSV_PATH, Buffer.from(response.data));
    return;
  } catch {
    console.log('Direct CSV unavailable, trying zip...');
  }

  const zipResponse = await axios.get(EPA_ZIP_URL, { responseType: 'arraybuffer' });
  writeFileSync(ZIP_PATH, Buffer.from(zipResponse.data));

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

function buildTrim(row: EpaRow): string {
  const parts = [row.baseModel, row.trans_dscr, row.trany].filter(Boolean);
  const raw = parts.join(' ').trim() || 'base';
  return slugify(raw);
}

function mapEpaRow(row: EpaRow): Car | null {
  const year = parseInt(row.year, 10);
  if (Number.isNaN(year) || year < MIN_YEAR || year > CURRENT_YEAR) return null;

  const bodyStyle = mapVClassToBodyStyle(row.VClass || '', row.model || '');
  if (!bodyStyle) return null;

  const fuelType = mapFuelType(row);
  const provenance: Provenance = {};
  const trim = buildTrim(row);
  const id = `${slugify(row.make)}-${slugify(row.model)}-${year}-${trim}`;

  let city: number | undefined;
  let highway: number | undefined;
  let combined: number | undefined;

  if (fuelType === 'electric') {
    city = parseNum(row.cityE);
    combined = parseNum(row.combE);
    highway = combined;
  } else if (fuelType === 'plug-in hybrid' && row.phevBlended === 'true') {
    city = parseNum(row.city08);
    highway = parseNum(row.highway08);
    combined = parseNum(row.combA08) ?? parseNum(row.comb08);
  } else {
    city = parseNum(row.city08);
    highway = parseNum(row.highway08);
    combined = parseNum(row.comb08);
  }

  if (!combined && !city && !highway) return null;

  const displacement = parseNum(row.displ);
  const cylinders = parseInt(row.cylinders, 10);
  const transmission = mapTransmission(row.trany || 'Automatic');
  const co2 = parseNum(row.co2);
  const annualFuelCost = parseNum(row.fuelCost08);
  const rangeMiles = parseNum(row.rangeA);
  const charge120 = parseNum(row.charge120);
  const charge240 = parseNum(row.charge240);

  let kWhPer100Mi: number | undefined;
  if (fuelType === 'electric' && combined && combined > 0) {
    kWhPer100Mi = Math.round((3370 / combined) * 10) / 10;
  }

  const car: Car = {
    id,
    make: row.make.trim(),
    model: row.model.trim(),
    year,
    trim,
    epaId: parseInt(row.id, 10) || undefined,
    provenance,
    engine: {
      fuelType,
      displacement,
      cylinders: Number.isNaN(cylinders) ? undefined : cylinders,
      configuration: cylinders
        ? cylinders === 6
          ? 'I6'
          : cylinders === 8
            ? 'V8'
            : cylinders <= 4
              ? `I${cylinders}`
              : `V${cylinders}`
        : undefined,
    },
    fuelEconomy: { city, highway, combined },
    transmission,
    driveType: mapDrive(row.drive || ''),
    bodyStyle,
    epa: {
      co2,
      annualFuelCost,
      ...(fuelType === 'electric' || fuelType === 'plug-in hybrid'
        ? {
            rangeMiles,
            kWhPer100Mi,
            ...(charge120 && charge120 > 0 ? { charge120Hours: charge120 } : {}),
            ...(charge240 && charge240 > 0 ? { charge240Hours: charge240 } : {}),
          }
        : {}),
      vClass: row.VClass,
    },
  };

  setProv(provenance, 'make', 'epa');
  setProv(provenance, 'model', 'epa');
  setProv(provenance, 'year', 'epa');
  setProv(provenance, 'fuelEconomy.city', 'epa');
  setProv(provenance, 'fuelEconomy.highway', 'epa');
  setProv(provenance, 'fuelEconomy.combined', 'epa');
  setProv(provenance, 'engine.displacement', 'epa');
  setProv(provenance, 'engine.cylinders', 'epa');
  setProv(provenance, 'driveType', 'epa');
  setProv(provenance, 'transmission', 'epa');
  setProv(provenance, 'bodyStyle', 'epa');
  setProv(provenance, 'engine.fuelType', 'epa');
  if (co2 !== undefined) setProv(provenance, 'epa.co2', 'epa');
  if (annualFuelCost !== undefined) setProv(provenance, 'epa.annualFuelCost', 'epa');
  if (rangeMiles !== undefined) setProv(provenance, 'epa.rangeMiles', 'epa');
  if (kWhPer100Mi !== undefined) setProv(provenance, 'epa.kWhPer100Mi', 'epa');
  if (charge120 !== undefined) setProv(provenance, 'epa.charge120Hours', 'epa');
  if (charge240 !== undefined) setProv(provenance, 'epa.charge240Hours', 'epa');

  const country = lookupCountry(car.make);
  if (country) {
    car.countryOfOrigin = country;
    setProv(provenance, 'countryOfOrigin', 'estimated');
  }

  // HP/torque are NOT in EPA data — omit rather than invent misleading estimates

  return car;
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
    car.price = { msrp, min: Math.round(msrp * 0.9), max: Math.round(msrp * 1.1), isEstimated: true };
    setProv(car.provenance, 'price.msrp', 'estimated');
  }
}

function dedupeCars(cars: Car[]): Car[] {
  const byKey = new Map<string, Car>();
  for (const car of cars) {
    const key = `${car.make}|${car.model}|${car.year}|${car.trim}`;
    const existing = byKey.get(key);
    if (!existing || completenessScore(car) > completenessScore(existing)) {
      byKey.set(key, car);
    }
  }
  return Array.from(byKey.values());
}

function loadNhtsaCache(): NhtsaCache {
  if (!existsSync(NHTSA_CACHE_PATH)) return {};
  return JSON.parse(readFileSync(NHTSA_CACHE_PATH, 'utf-8'));
}

function saveNhtsaCache(cache: NhtsaCache): void {
  writeFileSync(NHTSA_CACHE_PATH, JSON.stringify(cache, null, 2));
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

  const detailRes = await axios.get(`https://api.nhtsa.gov/SafetyRatings/VehicleId/${vehicleId}`, { timeout: 15000 });
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

async function enrichWithNhtsa(cars: Car[]): Promise<void> {
  const cache = loadNhtsaCache();
  const uniqueKeys = new Set<string>();
  for (const car of cars) {
    if (car.year < nhtsaFromYear) continue;
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

  for (const car of cars) {
    const key = `${car.make}|${car.model}|${car.year}`;
    const entry = cache[key];
    if (!entry) continue;

    if (entry.safetyRating) {
      car.safetyRating = entry.safetyRating;
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
  console.log(`With safety ratings: ${withSafety} (${((withSafety / cars.length) * 100).toFixed(1)}%)`);
  console.log(`With country (estimated): ${withCountry} (${((withCountry / cars.length) * 100).toFixed(1)}%)`);
  console.log(`With price: ${withPrice} (${((withPrice / cars.length) * 100).toFixed(1)}%)`);
  console.log(`Estimated prices: ${estimatedPrice}`);
  console.log('Cars with at least one source tag:', provenanceCounts);
  console.log(`Year range: ${Math.min(...cars.map((c) => c.year))}–${Math.max(...cars.map((c) => c.year))}`);
  console.log(`Makes: ${new Set(cars.map((c) => c.make)).size}`);
}

async function main(): Promise<void> {
  console.log('Building verified database from EPA data...');
  await ensureEpaCsv();

  const rows = await parseEpaCsv();
  console.log(`Parsed ${rows.length} EPA rows`);

  let cars: Car[] = [];
  for (const row of rows) {
    const car = mapEpaRow(row);
    if (car) cars.push(car);
    if (limit && cars.length >= limit) break;
  }

  console.log(`Mapped ${cars.length} passenger vehicles (${MIN_YEAR}–${CURRENT_YEAR})`);
  cars = dedupeCars(cars);
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
