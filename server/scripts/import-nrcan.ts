/**
 * Add the cars sold in Canada that EPA never rated (lib/nrcan.ts lists them)
 * from Natural Resources Canada's fuel consumption ratings.
 *
 * Re-running replaces the NRCan listings with the current files' figures, so
 * a corrected rating reaches the site; EPA listings are never touched. A row
 * EPA has since listed (same make, year and first word of the model name) is
 * skipped and reported, so a refresh cannot list a car twice.
 *
 * Usage: downloads NRCan's current files, or reads the CSVs in the folder given:
 *   tsx scripts/import-nrcan.ts [path/to/folder] [--dry-run]
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import type { Car } from '../src/types/car.types.js';
import { estimatePriceMsrp } from '../src/utils/ownership-economics.js';
import { fetchBuffer, fetchJson } from './lib/fetch.js';
import {
  assignNrcanIds,
  CANADIAN_MODELS,
  type CanadianModel,
  canadianModelOf,
  cleanModel,
  mapNrcanRow,
  type NrcanRow,
} from './lib/nrcan.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const CARS_PATH = resolve(scriptDir, '..', 'data', 'cars.json');
const RAW_DIR = resolve(scriptDir, '..', 'data', 'raw', 'nrcan');
const DATASET =
  'https://open.canada.ca/data/api/action/package_show?id=98f1a129-f628-4ce4-b24d-6f16bf24dd64';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const folderArg = args.find((a) => !a.startsWith('--'));

interface CarsFile {
  cars: Car[];
  lastUpdated: string;
  sources?: string[];
}

interface Dataset {
  result: { resources: Array<{ format: string; language: string[]; url: string }> };
}

/** NRCan's English CSVs, minus the original two-cycle ratings EPA's figures replaced. */
const wanted = (name: string) => /^my.*\.csv$/i.test(name);

async function download(): Promise<string> {
  mkdirSync(RAW_DIR, { recursive: true });
  console.log(`Downloading NRCan's fuel consumption ratings (${DATASET})...`);
  const { result } = await fetchJson<Dataset>(DATASET);
  for (const resource of result.resources) {
    const name = decodeURIComponent(basename(new URL(resource.url).pathname));
    if (resource.format.toUpperCase() !== 'CSV' || !resource.language.includes('en')) continue;
    if (!wanted(name)) continue;
    writeFileSync(join(RAW_DIR, name), await fetchBuffer(resource.url, 120_000));
  }
  return RAW_DIR;
}

/**
 * Conventional and battery-electric rows. The plug-in hybrid file is left out:
 * no car on the list is one, and its two fuels need their own mapping.
 */
function readRows(folder: string): NrcanRow[] {
  const rows: NrcanRow[] = [];
  for (const name of readdirSync(folder).filter(wanted).sort()) {
    // Some years' files are Latin-1; every header and name the import reads is ASCII.
    const parsed = parse(readFileSync(join(folder, name), 'latin1'), {
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
    }) as NrcanRow[];
    if (parsed.length && 'Fuel type 1' in parsed[0]) continue;
    rows.push(...parsed);
  }
  return rows;
}

/** "B 250" → "b250", "City Golf" → "city": the word a model line goes by. */
function firstWord(model: string): string {
  return model
    .toLowerCase()
    .replace(/^([a-z]{1,3})\s+(\d)/, '$1$2')
    .split(/\s+/)[0]
    .replace(/[^a-z0-9+]/g, '');
}

async function main(): Promise<void> {
  const folder = folderArg ? resolve(folderArg) : await download();
  const rows = readRows(folder);
  const file = JSON.parse(readFileSync(CARS_PATH, 'utf8')) as CarsFile;
  const isNrcan = (car: Car) => car.provenance?.make === 'nrcan';
  const epaCars = file.cars.filter((car) => !isNrcan(car));
  const before = new Set(file.cars.filter(isNrcan).map((car) => car.id));
  console.log(`[nrcan] ${folder}: ${rows.length} rows; ${file.cars.length} cars on file`);

  const epaLines = new Set(
    epaCars.map((car) => `${car.make.toLowerCase()}|${car.year}|${firstWord(car.model)}`),
  );
  const mapped: Car[] = [];
  const nowOnEpa: string[] = [];
  const matched = new Set<CanadianModel>();
  for (const row of rows) {
    const entry = canadianModelOf(row);
    if (!entry) continue;
    matched.add(entry);
    const year = parseInt(row['Model year'], 10);
    const model = cleanModel(row.Model);
    if (epaLines.has(`${entry.make.toLowerCase()}|${year}|${firstWord(model)}`)) {
      nowOnEpa.push(`${entry.make} ${model} ${year}`);
      continue;
    }
    const car = mapNrcanRow(row, entry);
    const msrp = estimatePriceMsrp(car);
    car.price = {
      msrp,
      min: Math.round(msrp * 0.9),
      max: Math.round(msrp * 1.1),
      isEstimated: true,
    };
    car.provenance['price.msrp'] = 'estimated';
    mapped.push(car);
  }
  const added = assignNrcanIds(mapped);

  const byModel = new Map<string, Set<number>>();
  for (const car of added) {
    const name = `${car.make} ${car.model}`;
    byModel.set(name, (byModel.get(name) ?? new Set()).add(car.year));
  }
  const missing = CANADIAN_MODELS.filter((entry) => !matched.has(entry));
  const ids = new Set(added.map((car) => car.id));
  const dropped = [...before].filter((id) => !ids.has(id));

  console.log(
    `[nrcan] ${added.length} Canadian listings (${added.filter((car) => !before.has(car.id)).length} new, ${dropped.length} no longer in NRCan's files):`,
  );
  for (const [name, years] of [...byModel].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${name}: ${[...years].sort((a, b) => a - b).join(' ')}`);
  }
  if (nowOnEpa.length) console.log(`[nrcan] skipped, EPA lists them now: ${nowOnEpa.join(', ')}`);
  if (missing.length) {
    console.log(
      `[nrcan] list entries that matched no row: ${missing.map((e) => `${e.make} ${e.model.source}`).join(', ')}`,
    );
  }
  if (dropped.length) console.log(`[nrcan] removed: ${dropped.join(', ')}`);

  if (dryRun) {
    console.log('[nrcan] --dry-run: cars.json left unchanged');
    return;
  }
  file.cars = [...epaCars, ...added];
  file.lastUpdated = new Date().toISOString();
  if (!file.sources?.includes('nrcan')) file.sources = [...(file.sources ?? []), 'nrcan'];
  writeFileSync(CARS_PATH, JSON.stringify(file));
  console.log(`[nrcan] wrote ${CARS_PATH} (${file.cars.length} cars)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
