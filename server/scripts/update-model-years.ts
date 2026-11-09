/**
 * Writes the model-year constants (src/config/model-years.ts) from the cars
 * on file: the first and newest model years, and the newest with a full
 * lineup. The EPA refresh runs it after adding listings, so the constants
 * move with the data instead of waiting on a hand edit when a test fails.
 *
 *   npx tsx scripts/update-model-years.ts            # writes what changed
 *   npx tsx scripts/update-model-years.ts --check    # exits 1 if out of date
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIRST_MODEL_YEAR,
  LATEST_FULL_MODEL_YEAR,
  LATEST_MODEL_YEAR,
  latestFullModelYearOf,
  latestModelYearOf,
} from '../src/config/model-years.js';

const here = dirname(fileURLToPath(import.meta.url));
const CARS_PATH = resolve(here, '../data/cars.json');
const CONFIG_PATH = resolve(here, '../src/config/model-years.ts');

/** How many cars each model year has on file. */
export function carsByYear(cars: { year: number }[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const car of cars) counts.set(car.year, (counts.get(car.year) ?? 0) + 1);
  return counts;
}

/** The constants the data calls for. */
export function modelYearsFor(cars: { year: number }[]): {
  first: number;
  latest: number;
  latestFull: number;
} {
  const counts = carsByYear(cars);
  const first = Math.min(...counts.keys());
  return {
    first,
    latest: latestModelYearOf(counts) ?? first,
    latestFull: latestFullModelYearOf(counts) ?? first,
  };
}

/** The config's text with the three constants set. */
export function withModelYears(
  source: string,
  years: { first: number; latest: number; latestFull: number },
): string {
  return source
    .replace(/(export const FIRST_MODEL_YEAR = )\d{4};/, `$1${years.first};`)
    .replace(/(export const LATEST_MODEL_YEAR = )\d{4};/, `$1${years.latest};`)
    .replace(/(export const LATEST_FULL_MODEL_YEAR = )\d{4};/, `$1${years.latestFull};`);
}

function main(): void {
  const { cars } = JSON.parse(readFileSync(CARS_PATH, 'utf8')) as { cars: { year: number }[] };
  const years = modelYearsFor(cars);
  const current = {
    first: FIRST_MODEL_YEAR,
    latest: LATEST_MODEL_YEAR,
    latestFull: LATEST_FULL_MODEL_YEAR,
  };
  const changed = (Object.keys(years) as (keyof typeof years)[]).filter(
    (key) => years[key] !== current[key],
  );
  if (changed.length === 0) {
    console.log(
      `[model-years] ${years.first}–${years.latest}, full lineups through ${years.latestFull}: the constants already say so.`,
    );
    return;
  }
  const report = changed.map((key) => `${key} ${current[key]} → ${years[key]}`).join(', ');
  if (process.argv.includes('--check')) {
    console.error(`[model-years] out of date: ${report}. Run scripts/update-model-years.ts.`);
    process.exit(1);
  }
  const source = readFileSync(CONFIG_PATH, 'utf8');
  const next = withModelYears(source, years);
  if (next === source) throw new Error('model-years.ts has no constants to write');
  writeFileSync(CONFIG_PATH, next);
  console.log(`[model-years] ${report}: written to src/config/model-years.ts.`);
}

if (process.argv[1] && /update-model-years\.ts$/.test(process.argv[1])) main();
