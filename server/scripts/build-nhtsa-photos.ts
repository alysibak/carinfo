/**
 * List NHTSA's photo of every car it has rated, by model year, in
 * data/nhtsa-photos.json. build-runtime-db then gives each car the photo of
 * its own model year, where NHTSA tested it (src/utils/nhtsa-photos.ts).
 *
 * Newest year first. A year already listed is skipped, but for the latest
 * two: NHTSA rates new models through the year. A year with failed requests
 * is left unlisted so the next run tries it again; what it did fetch is kept.
 * The run ends when NHTSA refuses it (run again later), or after three years
 * in a row with no photo: NHTSA's 1990s ratings came without them.
 *
 * Usage:
 *   tsx scripts/build-nhtsa-photos.ts [--from=1995] [--to=<next year>] [--refresh]
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { Car } from '../src/types/car.types.js';
import type { NhtsaPhotoFile } from '../src/utils/nhtsa-photos.js';
import { listYear, makeKey, serializePhotoFile } from './lib/nhtsa-photos.js';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const CARS_PATH = resolve(DATA_DIR, 'cars.json');
const OUT_PATH = resolve(DATA_DIR, 'nhtsa-photos.json');

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const thisYear = new Date().getUTCFullYear();
const from = parseInt(arg('from') ?? '1995', 10);
const to = parseInt(arg('to') ?? String(thisYear + 1), 10);
const refresh = args.includes('--refresh');

function load(): NhtsaPhotoFile {
  if (!existsSync(OUT_PATH)) {
    return {
      source: 'NHTSA 5-Star Safety Ratings API, VehiclePicture (api.nhtsa.gov/SafetyRatings)',
      years: {},
      vehicles: [],
    };
  }
  return JSON.parse(readFileSync(OUT_PATH, 'utf8')) as NhtsaPhotoFile;
}

async function main(): Promise<void> {
  const { cars } = JSON.parse(readFileSync(CARS_PATH, 'utf8')) as { cars: Car[] };
  const makes = new Set(cars.map((c) => makeKey(c.make)));
  const years = new Set(cars.map((c) => c.year));
  const file = load();
  const known = new Map(file.vehicles.map((v) => [v.id, v]));
  const today = new Date().toISOString().slice(0, 10);
  let incomplete = 0;
  let emptyYears = 0;
  let stopped = '';

  for (let year = to; year >= from; year--) {
    if (!years.has(year)) continue;
    if (!refresh && file.years[year] && year < thisYear) continue;

    const started = Date.now();
    const listing = await listYear(year, { makes, known });
    const fetched = new Set(listing.vehicles.map((v) => v.id));
    // After a failure, what an earlier run fetched for the year stays too.
    const kept = listing.failures.length
      ? file.vehicles.filter((v) => v.year === year && !fetched.has(v.id))
      : [];
    file.vehicles = [...file.vehicles.filter((v) => v.year !== year), ...listing.vehicles, ...kept];
    for (const v of listing.vehicles) known.set(v.id, v);

    if (listing.failures.length) {
      incomplete++;
      delete file.years[year];
      console.warn(
        `${year}: ${listing.failures.length} request(s) failed, e.g. ${listing.failures[0]}`,
      );
    } else {
      file.years[year] = today;
    }
    console.log(
      `${year}: ${listing.vehicles.length} photos, ${listing.withoutPhoto} rated without one ` +
        `(${((Date.now() - started) / 1000).toFixed(0)}s)`,
    );
    writeFileSync(OUT_PATH, serializePhotoFile(file));

    if (listing.refused) {
      stopped = `NHTSA refused requests at ${year}; run again later`;
      break;
    }
    emptyYears = listing.vehicles.length === 0 && !listing.failures.length ? emptyYears + 1 : 0;
    if (emptyYears >= 3) {
      stopped = `three years in a row without a photo, down to ${year}`;
      break;
    }
  }

  writeFileSync(OUT_PATH, serializePhotoFile(file));
  console.log(
    `Done: ${file.vehicles.length} photos over ${Object.keys(file.years).length} complete year(s)` +
      (incomplete ? `; ${incomplete} year(s) incomplete, run again` : '') +
      (stopped ? `; stopped: ${stopped}` : '') +
      `. Re-run: npm run build-runtime-db --workspace=server`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
