import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { matchReasons } from './matchReasons';

const sorento = {
  id: 'kia-sorento',
  make: 'Kia',
  model: 'Sorento',
  year: 2025,
  engine: { fuelType: 'gasoline', horsepower: 281 },
  fuelEconomy: { city: 22, highway: 29, combined: 25 },
  driveType: 'AWD',
  bodyStyle: 'suv',
  price: { msrp: 38000, isEstimated: true },
} as unknown as CarSpecs;

describe('matchReasons', () => {
  it('says how the car meets each limit the search set', () => {
    expect(
      matchReasons(sorento, undefined, { price: { max: 40000 }, threeRow: true, snow: true }),
    ).toEqual(['Under $40k', 'Three rows', 'AWD']);
  });

  it('gives the car’s own figure for a fuel or power bound', () => {
    expect(
      matchReasons(sorento, { fuelEconomy: { min: 24 }, horsepower: { min: 250 } }, undefined),
    ).toEqual(['9.4 L/100 km', '281 hp']);
  });

  it('names the rival a "cars like" search started from', () => {
    expect(
      matchReasons(sorento, undefined, {
        similarTo: { id: 'x', label: '2025 Hyundai Santa Fe' },
      }),
    ).toEqual(['A rival of the 2025 Hyundai Santa Fe']);
  });

  it('says nothing for a search that set no limits', () => {
    expect(matchReasons(sorento, {}, {})).toEqual([]);
  });
});
