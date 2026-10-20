/**
 * Turn Transport Canada's vehicle specifications, as fetch-public-data.ts
 * downloads them through vPIC, into data/canadian-specs.json: each measured
 * vehicle's length, width, height, wheelbase and curb weight, for every model
 * year it is valid for. The site matches each car to the vehicles of its own
 * model line, year, body and drivetrain when the database is built
 * (utils/canadian-specs.ts); this reports how many it sizes.
 *
 * Usage: tsx scripts/build-canadian-specs.ts <folder with the public data>
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getAllCars, modelLineKey } from '../src/services/car.service.js';
import { govModelIndex } from '../src/utils/gov-models.js';
import {
  measured,
  withSizes,
  type CanadianSpecRow,
  type MeasuredVehicle,
} from '../src/utils/canadian-specs.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(scriptDir, '..', 'data');
const folder = resolve(process.argv[2] ?? join(DATA, 'public'));

const { rows, fetchedAt } = JSON.parse(
  readFileSync(join(folder, 'canadian-specs.json'), 'utf8'),
) as { rows: Array<Partial<CanadianSpecRow>>; fetchedAt: string };

// Without the year asked for, a row's MYR (the year the design was first
// measured) cannot say which years it is valid for.
if (!rows.length || rows.some((row) => typeof row.year !== 'number')) {
  console.error(
    'canadian-specs.json rows lack the year asked for: fetch the canadian-specs part again.',
  );
  process.exit(1);
}

const vehicles = new Map<string, MeasuredVehicle>();
let implausible = 0;
for (const row of rows as CanadianSpecRow[]) {
  const vehicle = measured(row);
  if (!vehicle) {
    implausible++;
    continue;
  }
  vehicles.set(`${vehicle.year}|${vehicle.make}|${vehicle.model}`, vehicle);
}
const list = [...vehicles.values()].sort(
  (a, b) => a.year - b.year || a.make.localeCompare(b.make) || a.model.localeCompare(b.model),
);

writeFileSync(
  join(DATA, 'canadian-specs.json'),
  JSON.stringify({
    source: 'https://vpic.nhtsa.dot.gov/api/vehicles/GetCanadianVehicleSpecifications',
    fetchedAt,
    vehicles: list,
  }),
);

const cars = getAllCars();
const { sized } = withSizes(cars, list, modelLineKey, govModelIndex(cars, modelLineKey).match);
console.log(
  `Canadian specifications: ${list.length} measured vehicles by model year (${implausible} rows with a missing or implausible measure left out); ${sized} of ${cars.length} cars sized`,
);
