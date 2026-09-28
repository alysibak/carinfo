import { describe, expect, it } from 'vitest';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import { summarizeComparison } from './compareSummary';
import { trustDashboard } from '../test/fixtures';

function car(id: string, overrides: Partial<CarSpecs>): CarSpecs {
  return {
    ...trustDashboard.car,
    id,
    ...overrides,
  } as CarSpecs;
}

function dash(c: CarSpecs, mid: number, running: number): CarDashboard {
  return {
    ...trustDashboard,
    car: c,
    ownership: {
      ...trustDashboard.ownership,
      marketValue: { ...trustDashboard.ownership.marketValue, mid },
    },
    annualRunningCost: { low: running - 300, high: running + 300, mid: running },
  };
}

const civic = car('civic', {
  make: 'Honda',
  model: 'Civic Si',
  year: 2026,
  bodyStyle: 'sedan',
  driveType: 'FWD',
  transmission: { type: 'manual', speeds: 6 },
  fuelEconomy: { city: 27, highway: 37, combined: 31 },
  engine: { fuelType: 'gasoline', horsepower: 200 },
});
const rav4 = car('rav4', {
  make: 'Toyota',
  model: 'RAV4',
  year: 2025,
  bodyStyle: 'suv',
  driveType: 'AWD',
  fuelEconomy: { city: 27, highway: 35, combined: 30 },
  engine: { fuelType: 'gasoline', horsepower: 203 },
  safetyRating: { overall: 5 },
});

describe('summarizeComparison', () => {
  it('says in a sentence what each car has that the other does not', () => {
    const lines = summarizeComparison([
      { car: civic, dashboard: dash(civic, 34000, 5800) },
      { car: rav4, dashboard: dash(rav4, 35000, 6400) },
    ]);
    expect(lines).toEqual([
      {
        carId: 'civic',
        name: '2026 Honda Civic Si',
        sentence: 'The sedan: the only manual and the cheapest to run (about $600 a year less).',
      },
      {
        carId: 'rav4',
        name: '2025 Toyota RAV4',
        sentence: 'The SUV: the only AWD (better in snow) and the only one NHTSA has rated (5/5).',
      },
    ]);
  });

  it('crowns nobody on a near-tie', () => {
    const twin = car('twin', { ...civic, id: 'twin', make: 'Acura', model: 'Integra' });
    const lines = summarizeComparison([
      { car: civic, dashboard: dash(civic, 34000, 5800) },
      { car: twin, dashboard: dash(twin, 34500, 5850) },
    ]);
    expect(lines.map((l) => l.sentence)).toEqual([
      'Much the same as the others on paper.',
      'Much the same as the others on paper.',
    ]);
  });

  it('needs two cars', () => {
    expect(summarizeComparison([{ car: civic }])).toEqual([]);
  });
});
