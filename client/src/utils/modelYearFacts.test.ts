import { describe, expect, it } from 'vitest';
import type { ModelYearSummary } from '../types/car.types';
import {
  generationParts,
  generationSummary,
  modelYearCells,
  modelYearFacts,
  modelYearLines,
  yearSpan,
} from './modelYearFacts';

describe('modelYearFacts', () => {
  it('reads a year as fuel use, power, safety, then what it was offered as, with no estimate', () => {
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
      'from 4.5 L/100 km',
      '202–301 hp',
      'NHTSA 5/5',
      'Gasoline, Hybrid · Sedan',
      '9 versions',
    ]);
  });

  it('gives one figure where every version shares it, and an EV its range', () => {
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
    ).toEqual(['up to 575 km range', '384 hp', 'Electric SUV', '1 version']);
  });
});

describe('modelYearLines', () => {
  const civic: ModelYearSummary = {
    year: 2025,
    carId: 'civic-2025',
    configurations: 7,
    price: { min: 30000, max: 31000 },
    combinedMpg: 49,
    horsepower: { min: 150, max: 315 },
    safetyStars: 5,
    recalls: 3,
    complaints: 105,
    fuelTypes: ['gasoline', 'hybrid'],
    bodyStyles: ['hatchback', 'sedan'],
  };

  it('splits a year into the car, its records and what it was offered as', () => {
    expect(modelYearLines(civic)).toEqual({
      car: ['from 4.8 L/100 km', '150–315 hp'],
      records: ['NHTSA 5/5', '3 recalls in Canada', '105 complaints to NHTSA'],
      offered: ['Gasoline, Hybrid · Sedan, Hatchback', '7 versions'],
    });
  });

  it('keeps fuels and bodies apart in the table, as in the rows', () => {
    // It read "Gasoline, Hybrid Sedan, Hatchback".
    expect(modelYearCells(civic).offered).toBe('Gasoline, Hybrid · Sedan, Hatchback');
  });
});

describe('yearSpan', () => {
  it('writes a run of years, or one', () => {
    expect(yearSpan(1995, 2026)).toBe('1995–2026');
    expect(yearSpan(2026, 2026)).toBe('2026');
  });
});

describe('generations', () => {
  it('splits a label into its name, years and code', () => {
    expect(generationParts('FE · 11th generation (2022 on)')).toEqual({
      name: '11th generation',
      years: '2022 on',
      code: 'FE',
    });
    expect(generationParts('9th generation (2018–2024)')).toEqual({
      name: '9th generation',
      years: '2018–2024',
    });
    expect(generationParts('XV70')).toEqual({ name: 'XV70', years: undefined });
  });

  it('sums a folded generation up in a line', () => {
    const base: Omit<ModelYearSummary, 'year'> = {
      carId: 'x',
      configurations: 1,
      fuelTypes: [],
      bodyStyles: [],
    };
    expect(
      generationSummary([
        { ...base, year: 2017, combinedMpg: 36, horsepower: { min: 158, max: 306 } },
        { ...base, year: 2016, combinedMpg: 35, horsepower: { min: 158, max: 174 } },
      ]),
    ).toEqual(['2 years', 'from 6.5 L/100 km', '158–306 hp']);
  });
});
