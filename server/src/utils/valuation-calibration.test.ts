import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { getAllCars } from '../services/car.service.js';

/**
 * Estimated market values against observed Canadian prices.
 *
 * New vehicles are compared with the midpoint of the manufacturer's Canadian
 * MSRP range; used vehicles with the average asking price of current listings
 * (CarGurus Canada, April–September 2026). The model estimates from a handful of
 * inputs (size class, brand, age), so the tolerance is wide; before this test
 * existed, new compacts came out 50–90% high (a 2026 Elantra at $46,500).
 *
 * When prices move, update the references with their source and date rather
 * than widening the tolerance.
 */
interface Reference {
  label: string;
  find: (c: Car) => boolean;
  observedCad: number;
  source: string;
}

const TOLERANCE = 0.25;

const named = (make: string, model: RegExp, year: number) => (c: Car) =>
  c.make === make && c.year === year && model.test(c.model) && c.engine.fuelType !== 'hybrid';

const REFERENCES: Reference[] = [
  // New: midpoint of the Canadian MSRP range (before freight).
  {
    label: '2026 Hyundai Elantra (new)',
    find: named('Hyundai', /^Elantra$/, 2026),
    observedCad: 25_500,
    source: 'Hyundai Canada MSRP $23,499–$27,499 (non-hybrid)',
  },
  {
    label: '2026 Honda Civic sedan (new)',
    find: named('Honda', /^Civic 4Dr$/, 2026),
    observedCad: 31_000,
    source: 'Honda Canada MSRP $28,340 LX to $36,700 Si',
  },
  {
    label: '2026 Toyota Corolla (new)',
    find: named('Toyota', /^Corolla$/, 2026),
    observedCad: 28_000,
    source: 'Toyota Canada MSRP from $24,520 (gas trims to ~$31k)',
  },
  {
    label: '2026 Chevrolet Trax (new)',
    find: named('Chevrolet', /^Trax$/, 2026),
    observedCad: 28_300,
    source: 'Chevrolet Canada MSRP $26,699–$29,899',
  },
  // Used: average asking price of current listings.
  {
    label: '2023 Honda Civic sedan',
    find: named('Honda', /^Civic 4Dr$/, 2023),
    observedCad: 25_500,
    source: 'CarGurus Toronto average, 2026',
  },
  {
    label: '2020 Toyota Corolla',
    find: named('Toyota', /^Corolla$/, 2020),
    observedCad: 18_600,
    source: 'CarGurus Toronto average, 2026',
  },
  {
    label: '2020 Toyota RAV4',
    find: named('Toyota', /^RAV4$/, 2020),
    observedCad: 27_200,
    source: 'CarGurus Toronto average, June 2026',
  },
  {
    label: '2018 Toyota Camry',
    find: named('Toyota', /^Camry$/, 2018),
    observedCad: 21_200,
    source: 'CarGurus Canada average, June 2026',
  },
  {
    label: '2019 Ford F-150',
    find: named('Ford', /^F150 Pickup 2WD$/, 2019),
    observedCad: 29_100,
    source: 'CarGurus Toronto average, April 2026',
  },
  {
    label: '2013 Honda Civic',
    find: named('Honda', /^Civic$/, 2013),
    observedCad: 10_600,
    source: 'CarGurus Ontario average, 2026',
  },
  {
    label: '2006 Toyota Corolla',
    find: named('Toyota', /^Corolla$/, 2006),
    observedCad: 6_400,
    source: 'CarGurus Canada average, 2026',
  },
  {
    label: '2023 Porsche Macan',
    find: named('Porsche', /^Macan$/, 2023),
    observedCad: 66_700,
    source: 'CarGurus Canada average, 2026',
  },
  {
    label: '2022 Tesla Model 3',
    find: named('Tesla', /^Model 3 RWD$/, 2022),
    observedCad: 32_600,
    source: 'CarGurus Canada average (all trims), August 2026',
  },
];

describe('valuation calibration against observed Canadian prices', () => {
  it.each(REFERENCES.map((r) => [r.label, r] as const))('%s', (_label, ref) => {
    const car = getAllCars().find(ref.find);
    expect(car, `${ref.label} should exist in the corpus`).toBeDefined();
    const mid = car!.price!.msrp!;
    const error = mid / ref.observedCad - 1;
    expect(
      Math.abs(error),
      `${ref.label}: estimate $${mid.toLocaleString()} vs observed $${ref.observedCad.toLocaleString()} (${ref.source}), ${(error * 100).toFixed(0)}%`,
    ).toBeLessThanOrEqual(TOLERANCE);
  });
});
