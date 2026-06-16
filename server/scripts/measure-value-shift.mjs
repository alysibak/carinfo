/** Dataset-wide value shift after fixes. Run after server build. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { estimateMarketValue, effectiveFuelType } = await import('../dist/utils/vehicle-valuation.js');
const { inferEffectiveFuelType } = await import('../dist/utils/fuel-type-inference.js');
const { normalizeCarRecord } = await import('../dist/utils/car-normalize.js');

const cars = JSON.parse(fs.readFileSync(path.join(root, 'data/cars.json'), 'utf8')).cars;

// Simulate OLD behavior: stored fuel type, battery on PHEV, no Porsche rules — approximate via tagging
let phevReclassified = 0;
let valueIncreased = 0;
let valueDecreased = 0;
let totalDelta = 0;
const luxuryMakes = new Set(['BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Lexus', 'Jaguar', 'Land Rover']);

for (const car of cars) {
  const wasElectric = car.engine.fuelType === 'electric';
  const nowPhev = inferEffectiveFuelType(car) === 'plug-in hybrid';
  if (wasElectric && nowPhev) phevReclassified++;

  const norm = normalizeCarRecord(car);
  const newMid = estimateMarketValue(norm).mid;
  const oldMid = car.price?.msrp ?? newMid;
  const delta = newMid - oldMid;
  totalDelta += delta;
  if (delta > 500) valueIncreased++;
  if (delta < -500) valueDecreased++;
}

console.log('PHEV reclassified (electric tag):', phevReclassified);
console.log('Records with value increase >$500:', valueIncreased);
console.log('Records with value decrease >$500:', valueDecreased);
console.log('Avg delta vs stored price.msrp:', Math.round(totalDelta / cars.length));

const cayenne = cars.find((c) => c.id === 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8');
const n = normalizeCarRecord(cayenne);
const v = estimateMarketValue(n);
console.log('Cayenne:', { stored: cayenne.price.msrp, new: v.mid, fuel: n.engine.fuelType });
