/**
 * Add the EPA listings the importer used to drop, without rebuilding
 * cars.json from scratch (which would discard the curated fixes applied to it
 * since) or moving any existing car to a new ID.
 *
 * The importer keyed its duplicate check on model, year and transmission, so
 * a second engine with the same gearbox was dropped (the Mustang GT beside the
 * EcoBoost, the Civic Type R beside the 1.5T), and it skipped EPA's "Special
 * Purpose Vehicle" class, where most 1990s–2000s SUVs and minivans sit. It
 * also stopped at the calendar year, missing the next model year's early
 * certifications. This adds each listing that is a distinct configuration
 * (lib/epa-row.ts configurationKey), and records turbo/supercharger on every
 * car from EPA's flags.
 *
 * It reports, by model, what it adds, which EPA rows it leaves out and why,
 * and any car on file whose EPA row is gone, so --dry-run answers "is every
 * car EPA lists on the site?".
 *
 * Usage: downloads EPA's current vehicles.csv, or reads the one given:
 *   tsx scripts/backfill-epa-variants.ts [path/to/vehicles.csv] [--dry-run]
 */
import { createReadStream, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import type { Car } from '../src/types/car.types.js';
import { estimatePriceMsrp } from '../src/utils/ownership-economics.js';
import { downloadEpaCsv } from './lib/epa-csv.js';
import {
  aspirationOf,
  baseCarId,
  configurationKey,
  type EpaRow,
  exclusionReason,
  type ExclusionReason,
  mapEpaRow,
  maxModelYear,
  MIN_MODEL_YEAR,
  variantCarId,
} from './lib/epa-row.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const CARS_PATH = resolve(scriptDir, '..', 'data', 'cars.json');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const csvArg = args.find((a) => !a.startsWith('--'));

interface CarsFile {
  cars: Car[];
  lastUpdated: string;
  sources?: string[];
}

interface Listed {
  make: string;
  model: string;
  year: number | string;
}

/** One line per model with its years ("  Toyota GR86: 2026"), to check a gap by name. */
function byModel(items: Listed[]): string {
  const years = new Map<string, Set<number>>();
  for (const { make, model, year } of items) {
    const name = `${make.trim()} ${model.trim()}`;
    const set = years.get(name) ?? new Set<number>();
    set.add(Number(year));
    years.set(name, set);
  }
  return [...years.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, set]) => `  ${name}: ${[...set].sort((a, b) => a - b).join(' ')}`)
    .join('\n');
}

function byYear(items: Listed[]): string {
  const counts = new Map<number, number>();
  for (const { year } of items) counts.set(Number(year), (counts.get(Number(year)) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, n]) => `${year}:${n}`)
    .join(' ');
}

function readRows(path: string): Promise<EpaRow[]> {
  return new Promise((done, fail) => {
    const rows: EpaRow[] = [];
    createReadStream(path)
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_column_count: true }))
      .on('data', (row: EpaRow) => rows.push(row))
      .on('end', () => done(rows))
      .on('error', fail);
  });
}

async function main(): Promise<void> {
  const csvPath = csvArg
    ? resolve(csvArg)
    : await downloadEpaCsv(join(scriptDir, '..', 'data', 'raw'));
  const file = JSON.parse(readFileSync(CARS_PATH, 'utf8')) as CarsFile;
  const rows = await readRows(csvPath);
  const rowByEpaId = new Map(rows.map((row) => [row.id, row]));
  const rowYears = rows.map((row) => parseInt(row.year, 10)).filter((y) => !Number.isNaN(y));
  const newestRowId = Math.max(...rows.map((row) => parseInt(row.id, 10) || 0));
  console.log(
    `[backfill] ${csvPath}: ${rows.length} EPA rows, model years ${Math.min(...rowYears)}–${Math.max(...rowYears)}, newest row ID ${newestRowId}; ${file.cars.length} cars on file`,
  );

  // 1. Existing cars: record forced induction, which the importer never read.
  let aspirated = 0;
  for (const car of file.cars) {
    const row = car.epaId != null ? rowByEpaId.get(String(car.epaId)) : undefined;
    const aspiration = row && car.engine.fuelType !== 'electric' ? aspirationOf(row) : undefined;
    if (aspiration && car.engine.aspiration !== aspiration) {
      car.engine = { ...car.engine, aspiration };
      car.provenance = { ...car.provenance, 'engine.aspiration': 'epa' };
      aspirated++;
    }
  }

  // 2. What each ID already holds, by configuration.
  const configsById = new Map<string, Set<string>>();
  const note = (row: EpaRow) => {
    const id = baseCarId(row);
    const configs = configsById.get(id) ?? new Set<string>();
    configs.add(configurationKey(row));
    configsById.set(id, configs);
  };
  const onFile = new Set<string>();
  const ids = new Set(file.cars.map((car) => car.id));
  for (const car of file.cars) {
    const row = car.epaId != null ? rowByEpaId.get(String(car.epaId)) : undefined;
    if (row) {
      onFile.add(row.id);
      note(row);
    }
  }

  // 3. Every other listing that is a configuration not yet on file.
  const added: Car[] = [];
  let duplicates = 0;
  const excluded: Record<ExclusionReason, EpaRow[]> = {
    'before-first-year': [],
    'future-year': [],
    specialty: [],
    'no-fuel-economy': [],
  };
  for (const row of rows) {
    if (onFile.has(row.id)) continue;
    const car = mapEpaRow(row);
    if (!car) {
      // mapEpaRow leaves a row out exactly when exclusionReason gives a reason.
      excluded[exclusionReason(row) as ExclusionReason].push(row);
      continue;
    }
    const configs = configsById.get(car.id);
    if (configs?.has(configurationKey(row))) {
      duplicates++;
      continue;
    }
    const id = ids.has(car.id) ? variantCarId(row) : car.id;
    const msrp = estimatePriceMsrp(car);
    added.push({
      ...car,
      id,
      price: { msrp, min: Math.round(msrp * 0.9), max: Math.round(msrp * 1.1), isEstimated: true },
      provenance: { ...car.provenance, 'price.msrp': 'estimated' },
    });
    ids.add(id);
    note(row);
  }

  console.log(
    `[backfill] ${added.length} listings added (${duplicates} emissions/test duplicates of listings on file skipped); aspiration recorded on ${aspirated} existing cars`,
  );
  if (added.length) {
    console.log(`[backfill] added by year: ${byYear(added)}`);
    console.log(`[backfill] added, by model:\n${byModel(added)}`);
  }

  const outOfYears = excluded['before-first-year'];
  console.log(
    `[backfill] left out: ${outOfYears.length} rows before ${MIN_MODEL_YEAR}${outOfYears.length ? ` (${byYear(outOfYears)})` : ''}, ${excluded['future-year'].length} after ${maxModelYear()}, ${excluded.specialty.length} hearse/limousine/livery/taxi/postal conversions, ${excluded['no-fuel-economy'].length} with no fuel economy figures`,
  );
  const named = [...excluded['future-year'], ...excluded.specialty, ...excluded['no-fuel-economy']];
  if (named.length)
    console.log(`[backfill] left out from ${MIN_MODEL_YEAR} on, by model:\n${byModel(named)}`);

  // EPA withdraws or renumbers a row now and then; the car's figures are then unverified.
  const gone = file.cars.filter((car) => car.epaId == null || !rowByEpaId.has(String(car.epaId)));
  if (gone.length) {
    console.log(
      `[backfill] ${gone.length} cars on file have no row in this EPA file:\n${gone.map((car) => `  ${car.id} (EPA ${car.epaId ?? 'none'})`).join('\n')}`,
    );
  }

  if (dryRun) {
    console.log('[backfill] --dry-run: cars.json left unchanged');
    return;
  }
  file.cars.push(...added);
  file.lastUpdated = new Date().toISOString();
  writeFileSync(CARS_PATH, JSON.stringify(file));
  console.log(`[backfill] wrote ${CARS_PATH} (${file.cars.length} cars)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
