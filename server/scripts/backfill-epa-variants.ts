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
 * Usage (EPA's vehicles.csv from https://fueleconomy.gov/feg/epadata/vehicles.csv):
 *   tsx scripts/backfill-epa-variants.ts [path/to/vehicles.csv] [--dry-run]
 */
import { createReadStream, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import type { Car } from '../src/types/car.types.js';
import { estimatePriceMsrp } from '../src/utils/ownership-economics.js';
import {
  aspirationOf,
  baseCarId,
  configurationKey,
  type EpaRow,
  mapEpaRow,
  variantCarId,
} from './lib/epa-row.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const CARS_PATH = resolve(scriptDir, '..', 'data', 'cars.json');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const csvPath = resolve(
  args.find((a) => !a.startsWith('--')) ?? join(scriptDir, '..', 'data', 'raw', 'vehicles.csv'),
);

interface CarsFile {
  cars: Car[];
  lastUpdated: string;
  sources?: string[];
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
  const file = JSON.parse(readFileSync(CARS_PATH, 'utf8')) as CarsFile;
  const rows = await readRows(csvPath);
  const rowByEpaId = new Map(rows.map((row) => [row.id, row]));
  console.log(`[backfill] ${rows.length} EPA rows, ${file.cars.length} cars on file`);

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
  const reasons = { duplicate: 0, excluded: 0 };
  for (const row of rows) {
    if (onFile.has(row.id)) continue;
    const car = mapEpaRow(row);
    if (!car) {
      reasons.excluded++;
      continue;
    }
    const configs = configsById.get(car.id);
    if (configs?.has(configurationKey(row))) {
      reasons.duplicate++;
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

  const byYear = new Map<number, number>();
  for (const car of added) byYear.set(car.year, (byYear.get(car.year) ?? 0) + 1);
  console.log(
    `[backfill] ${added.length} listings added (${reasons.duplicate} emissions/test duplicates and ${reasons.excluded} out-of-scope rows skipped); aspiration recorded on ${aspirated} existing cars`,
  );
  console.log(
    `[backfill] added by year: ${[...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, n]) => `${year}:${n}`)
      .join(' ')}`,
  );

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
