/**
 * Turn NHTSA's 5-Star Safety Ratings, as fetch-public-data.ts downloads them
 * (every vehicle tested since model year 2011), into data/nhtsa-ratings.json:
 * one entry per tested vehicle with its stars, rollover risk and the safety
 * technology NHTSA lists. The site matches each car to the tests of its own
 * body and drivetrain that model year when the database is built
 * (utils/nhtsa-ratings.ts); this reports how many it rates.
 *
 * Usage: tsx scripts/build-nhtsa-ratings.ts <folder with the public data>
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getAllCars, modelLineKey } from '../src/services/car.service.js';
import { govModelIndex } from '../src/utils/gov-models.js';
import {
  ratingOf,
  saysAnything,
  withNhtsaRatings,
  type NhtsaTest,
  type NhtsaVehicle,
} from '../src/utils/nhtsa-ratings.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(scriptDir, '..', 'data');
const folder = resolve(process.argv[2] ?? join(DATA, 'public'));

const { vehicles, fetchedAt } = JSON.parse(
  readFileSync(join(folder, 'nhtsa-ratings.json'), 'utf8'),
) as { vehicles: NhtsaVehicle[]; fetchedAt: string };

const seen = new Set<number>();
const tests: NhtsaTest[] = [];
for (const vehicle of vehicles) {
  if (seen.has(vehicle.VehicleId)) continue;
  seen.add(vehicle.VehicleId);
  const rating = ratingOf(vehicle);
  if (!saysAnything(rating)) continue;
  tests.push({
    make: vehicle.Make.trim(),
    model: vehicle.Model.trim(),
    year: vehicle.ModelYear,
    ...rating,
  });
}
tests.sort((a, b) => a.id - b.id);

writeFileSync(
  join(DATA, 'nhtsa-ratings.json'),
  JSON.stringify({
    source: 'https://api.nhtsa.gov/SafetyRatings',
    fetchedAt,
    tests,
  }),
);

const cars = getAllCars();
const index = govModelIndex(cars, modelLineKey);
const matched = tests.filter((t) => index.match(t.make, t.model, t.year)).length;
const eligible = cars.filter((car) => car.year >= 2011).length;
const { rated, described } = withNhtsaRatings(cars, tests, modelLineKey, index.match);
console.log(
  `NHTSA ratings: ${tests.length} tested vehicles (${matched} matched to the site's models); ` +
    `${described} of ${eligible} cars from 2011 on described by a test, ${rated} with an overall rating`,
);
