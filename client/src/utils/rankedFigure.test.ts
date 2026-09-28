import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { rankedFigure } from './rankedFigure';

const car = {
  id: 'a',
  year: 2022,
  make: 'Kia',
  model: 'Niro',
  bodyStyle: 'suv',
  engine: { fuelType: 'hybrid', horsepower: 139 },
  fuelEconomy: { city: 53, highway: 54, combined: 53 },
  safetyRating: { overall: 5 },
} as unknown as CarSpecs;

describe('rankedFigure', () => {
  it('shows each shortlist pick by the record the list ranks on', () => {
    expect(rankedFigure(car, 'efficiency')).toBe('4.4 L/100 km');
    expect(rankedFigure(car, 'daily-driver')).toBe('NHTSA 5/5');
    expect(rankedFigure(car, 'fun')).toBe('139 hp');
  });

  it('gives an EV its EPA range in km', () => {
    const ev = {
      ...car,
      engine: { fuelType: 'electric', horsepower: 300 },
      epa: { rangeMiles: 330 },
    } as unknown as CarSpecs;
    expect(rankedFigure(ev, 'range')).toBe('531 km range');
  });

  it('falls back to fuel use when the ranked record is missing', () => {
    const unrated = { ...car, safetyRating: undefined } as unknown as CarSpecs;
    expect(rankedFigure(unrated, 'daily-driver')).toBe('4.4 L/100 km');
  });
});
