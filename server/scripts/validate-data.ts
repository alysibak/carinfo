/**
 * Validate the vehicle corpus that actually ships (cars-ready.json).
 *
 * A data rebuild is the riskiest deploy this project has: one bad EPA download
 * or a regression in the enrichment pipeline changes every page at once, and
 * none of it is exercised by unit tests. This script checks the invariants the
 * app silently relies on and exits non-zero on any violation, so CI refuses to
 * ship a broken corpus.
 *
 * It exists because the shipped data already violated one: four IDs were shared
 * by two rows each, which made one row of each pair unreachable by ID.
 *
 * Usage: npm run validate:data  [-- --file=path/to/cars.json]
 */
import { readFileSync } from 'fs';
import { resolveDataFile } from '../src/utils/data-paths.js';
import type { Car } from '../src/types/car.types.js';
import { unpackRuntimeDatabase } from '../src/services/runtime-db.js';

const BODY_STYLES = new Set([
  'sedan',
  'suv',
  'truck',
  'coupe',
  'wagon',
  'van',
  'minivan',
  'hatchback',
  'convertible',
]);
const DRIVE_TYPES = new Set(['FWD', 'RWD', 'AWD', '4WD']);
const FUEL_TYPES = new Set([
  'gasoline',
  'diesel',
  'hybrid',
  'plug-in hybrid',
  'electric',
  'hydrogen',
  'natural gas',
]);
const TRANSMISSIONS = new Set(['automatic', 'manual', 'cvt', 'dual-clutch']);
const PROVENANCE_SOURCES = new Set(['epa', 'nhtsa', 'estimated', 'curated']);

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1984; // fueleconomy.gov coverage starts here
const MAX_YEAR = CURRENT_YEAR + 2; // next-model-year vehicles are published early

// A truncated download or a filter bug shows up first as a collapsed count.
const MIN_EXPECTED_CARS = 20_000;

interface Violation {
  rule: string;
  id: string;
  detail: string;
}

const args = process.argv.slice(2);
const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1];
const path = fileArg ?? resolveDataFile('cars-ready.json') ?? resolveDataFile('cars.json');

if (!path) {
  console.error('No cars-ready.json or cars.json found. Run `npm run build` first.');
  process.exit(1);
}

const db = JSON.parse(readFileSync(path, 'utf8')) as Parameters<typeof unpackRuntimeDatabase>[0];
if (!Array.isArray(db?.cars)) {
  console.error(`${path}: "cars" is not an array.`);
  process.exit(1);
}
const cars = unpackRuntimeDatabase(db);
const violations: Violation[] = [];
const warnings: Violation[] = [];

const fail = (rule: string, car: Pick<Car, 'id'> | undefined, detail: string) =>
  violations.push({ rule, id: car?.id ?? '(corpus)', detail });
const warn = (rule: string, car: Pick<Car, 'id'>, detail: string) =>
  warnings.push({ rule, id: car.id, detail });

// ─── Corpus-level ─────────────────────────────────────────────────────────────

if (cars.length < MIN_EXPECTED_CARS) {
  fail('corpus-size', undefined, `only ${cars.length} cars (expected >= ${MIN_EXPECTED_CARS})`);
}

if (!db.lastUpdated || Number.isNaN(Date.parse(db.lastUpdated))) {
  fail('corpus-lastUpdated', undefined, `missing or unparseable lastUpdated: ${db.lastUpdated}`);
}

const seen = new Map<string, number>();
for (const car of cars) seen.set(car.id, (seen.get(car.id) ?? 0) + 1);
for (const [id, count] of seen) {
  if (count > 1)
    fail('unique-id', { id }, `shared by ${count} rows — all but one are unreachable by ID`);
}

// ─── Per-record ───────────────────────────────────────────────────────────────

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Any NaN / Infinity anywhere in a record serializes as null and breaks math downstream. */
function findNonFinite(value: unknown, trail: string): string | null {
  if (typeof value === 'number' && !Number.isFinite(value)) return trail;
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const hit = findNonFinite(v, `${trail}.${k}`);
      if (hit) return hit;
    }
  }
  return null;
}

for (const car of cars) {
  if (!car.id || typeof car.id !== 'string') {
    fail('id', car, 'missing id');
    continue;
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(car.id)) {
    fail('id-format', car, `id is not a URL-safe slug: "${car.id}"`);
  }

  for (const field of ['make', 'model'] as const) {
    if (!car[field] || typeof car[field] !== 'string' || !car[field].trim()) {
      fail('required', car, `${field} is empty`);
    }
  }

  if (!Number.isInteger(car.year) || car.year < MIN_YEAR || car.year > MAX_YEAR) {
    fail('year', car, `year ${car.year} outside ${MIN_YEAR}–${MAX_YEAR}`);
  }

  if (!BODY_STYLES.has(car.bodyStyle)) fail('enum-bodyStyle', car, `bodyStyle "${car.bodyStyle}"`);
  if (!DRIVE_TYPES.has(car.driveType)) fail('enum-driveType', car, `driveType "${car.driveType}"`);
  if (!FUEL_TYPES.has(car.engine?.fuelType)) {
    fail('enum-fuelType', car, `engine.fuelType "${car.engine?.fuelType}"`);
  }
  if (car.transmission?.type && !TRANSMISSIONS.has(car.transmission.type)) {
    fail('enum-transmission', car, `transmission.type "${car.transmission.type}"`);
  }

  // Fuel economy: EPA values are always positive. Electric MPGe runs high but a
  // three-digit-plus figure is a unit bug (e.g. Wh/mi landing in the MPG field).
  const fe = car.fuelEconomy;
  if (!fe) {
    fail('fuelEconomy', car, 'missing fuelEconomy');
  } else {
    const ceiling =
      car.engine?.fuelType === 'electric' || car.engine?.fuelType === 'hydrogen' ? 200 : 120;
    for (const key of ['city', 'highway', 'combined'] as const) {
      const v = fe[key];
      if (v == null) continue;
      if (!isFiniteNumber(v) || v <= 0) fail('mpg-positive', car, `fuelEconomy.${key} = ${v}`);
      else if (v > ceiling) fail('mpg-plausible', car, `fuelEconomy.${key} = ${v} (> ${ceiling})`);
    }
  }

  const disp = car.engine?.displacement;
  if (disp != null && (!isFiniteNumber(disp) || disp <= 0 || disp > 10)) {
    fail('displacement', car, `engine.displacement = ${disp} L`);
  }
  const hp = car.engine?.horsepower;
  if (hp != null && (!isFiniteNumber(hp) || hp <= 0 || hp > 2000)) {
    fail('horsepower', car, `engine.horsepower = ${hp}`);
  }

  // Provenance is the product: every record must say where its values came from.
  if (!car.provenance || typeof car.provenance !== 'object') {
    fail('provenance', car, 'missing provenance map');
  } else {
    for (const [field, source] of Object.entries(car.provenance)) {
      if (!PROVENANCE_SOURCES.has(source as string)) {
        fail('provenance-source', car, `provenance["${field}"] = "${source}"`);
      }
    }
  }

  // A model-estimated price must never be presented as verified.
  if (car.price?.msrp != null) {
    if (!isFiniteNumber(car.price.msrp) || car.price.msrp <= 0) {
      fail('price', car, `price.msrp = ${car.price.msrp}`);
    }
    const estimated =
      car.price.isEstimated === true || car.provenance?.['price.msrp'] === 'estimated';
    if (!estimated && car.provenance?.['price.msrp'] !== 'curated') {
      warn('price-provenance', car, 'price has no estimated/curated marker');
    }
    if (car.price.min != null && car.price.max != null && car.price.min > car.price.max) {
      fail('price-range', car, `price.min ${car.price.min} > price.max ${car.price.max}`);
    }
  }

  // Powertrain physics. The fuel type decides units (MPG vs MPGe) and which
  // price a fuel cost uses, so a wrong one is a wrong number on the page.
  const fuel = car.engine?.fuelType;
  if (fuel === 'electric' && disp != null && disp > 0) {
    // A combustion engine means a plug-in hybrid (e.g. the BMW i3 with Range
    // Extender, whose gas MPG was shown as MPGe while it was labeled electric).
    fail('bev-has-engine', car, `electric but engine.displacement = ${disp} L`);
  }
  if (fuel === 'plug-in hybrid' && !(disp != null && disp > 0)) {
    fail('phev-without-engine', car, 'plug-in hybrid with no combustion engine');
  }

  // Burning a gallon of gasoline emits ~8,887 g of CO₂ (diesel ~10,180 g), so
  // EPA's tailpipe CO₂ and combined MPG must agree: co2 × mpg ≈ that constant.
  // Too low means the vehicle burns something else — the Civic Natural Gas
  // (ratio ~0.76) was labeled gasoline. Too high has so far only been EPA
  // source quirks, so it warns.
  const co2 = car.epa?.co2;
  const mpg = car.fuelEconomy?.combined;
  if ((fuel === 'gasoline' || fuel === 'diesel') && isFiniteNumber(co2) && co2 > 0 && mpg) {
    const ratio = (co2 * mpg) / (fuel === 'diesel' ? 10_180 : 8_887);
    if (ratio < 0.85) {
      fail(
        'co2-mpg-physics',
        car,
        `CO₂ ${co2} g/mi at ${mpg} MPG is ${ratio.toFixed(2)}× what ${fuel} emits; check the fuel type`,
      );
    } else if (ratio > 1.15) {
      warn('co2-mpg-physics', car, `CO₂ ${co2} g/mi at ${mpg} MPG is ${ratio.toFixed(2)}× ${fuel}`);
    }
  }

  const nonFinite = findNonFinite(car, 'car');
  if (nonFinite) fail('non-finite', car, `${nonFinite} is NaN or Infinity`);
}

// ─── Report ──────────────────────────────────────────────────────────────────

function summarize(list: Violation[]) {
  const byRule = new Map<string, Violation[]>();
  for (const v of list) {
    const bucket = byRule.get(v.rule);
    if (bucket) bucket.push(v);
    else byRule.set(v.rule, [v]);
  }
  for (const [rule, items] of byRule) {
    console.log(`  ${rule}: ${items.length}`);
    for (const v of items.slice(0, 5)) console.log(`    - ${v.id}: ${v.detail}`);
    if (items.length > 5) console.log(`    … and ${items.length - 5} more`);
  }
}

console.log(`Validated ${cars.length.toLocaleString()} vehicles from ${path}`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  summarize(warnings);
}

if (violations.length) {
  console.log(`\n${violations.length} violation(s):`);
  summarize(violations);
  process.exit(1);
}

console.log('\nAll invariants hold.');
