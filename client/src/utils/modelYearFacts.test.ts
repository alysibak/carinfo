import { describe, expect, it } from 'vitest';
import { modelYearFacts, yearSpan } from './modelYearFacts';

describe('modelYearFacts', () => {
  it('reads a year as value, fuel use, power, safety, then what it was offered as', () => {
    expect(
      modelYearFacts({
        year: 2024,
        carId: 'camry-2024',
        configurations: 9,
        price: { min: 30000, max: 31000 },
        combinedMpg: 52,
        horsepower: { min: 202, max: 301 },
        safetyStars: 5,
        fuelTypes: ['gasoline', 'hybrid'],
        bodyStyles: ['sedan'],
      }),
    ).toEqual([
      'Est. value $30k–$31k',
      'from 4.5 L/100 km',
      '202–301 hp',
      'NHTSA 5/5',
      'Gasoline, Hybrid Sedan',
      '9 configurations',
    ]);
  });

  it('gives one figure where every configuration shares it, and an EV its range', () => {
    expect(
      modelYearFacts({
        year: 2026,
        carId: 'model-y-2026',
        configurations: 1,
        price: { min: 58000, max: 58400 },
        rangeMiles: 357,
        horsepower: { min: 384, max: 384 },
        fuelTypes: ['electric'],
        bodyStyles: ['suv'],
      }),
    ).toEqual([
      'Est. value ~$58k',
      'up to 575 km range',
      '384 hp',
      'Electric SUV',
      '1 configuration',
    ]);
  });
});

describe('yearSpan', () => {
  it('writes a run of years, or one', () => {
    expect(yearSpan(1995, 2026)).toBe('1995–2026');
    expect(yearSpan(2026, 2026)).toBe('2026');
  });
});
