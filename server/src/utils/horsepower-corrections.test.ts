import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { applyHorsepowerCorrections } from './horsepower-corrections.js';

const car = (
  make: string,
  model: string,
  year: number,
  displacement: number,
  horsepower: number | undefined,
  extra: { aspiration?: 'turbocharged'; fuelType?: Car['engine']['fuelType'] } = {},
) =>
  ({
    id: `${make}-${model}-${year}-${displacement}`,
    make,
    model,
    year,
    provenance: horsepower != null ? { 'engine.horsepower': 'curated' } : {},
    engine: {
      fuelType: extra.fuelType ?? 'gasoline',
      displacement,
      horsepower,
      aspiration: extra.aspiration,
    },
    fuelEconomy: { combined: 28 },
    transmission: { type: 'automatic' },
    driveType: 'AWD',
    bodyStyle: 'suv',
  }) as Car;

describe('applyHorsepowerCorrections', () => {
  it("sets best-sellers' engines to the manufacturer's rating", () => {
    const { cars, corrected } = applyHorsepowerCorrections([
      // The 1.5 turbo CR-V read the CR-V Hybrid's 143 hp engine rating.
      car('Honda', 'CR-V AWD', 2021, 1.5, 143, { aspiration: 'turbocharged' }),
      // Mazda's 2.5 read 207 hp; an unrated one takes the figure too.
      car('Mazda', 'CX-5 4WD', 2020, 2.5, 207),
      car('Mazda', 'CX-5 2WD', 2020, 2.5, undefined),
      // EPA files the STI as a "WRX".
      car('Subaru', 'WRX', 2017, 2.5, 268, { aspiration: 'turbocharged' }),
    ]);
    expect(cars.map((c) => c.engine.horsepower)).toEqual([190, 187, 187, 305]);
    expect(corrected).toBe(4);
    expect(cars.every((c) => c.provenance['engine.horsepower'] === 'curated')).toBe(true);
  });

  it('leaves other engines, hybrids and years alone', () => {
    const cars = [
      car('Honda', 'CR-V Hybrid AWD', 2021, 2, 212, { fuelType: 'hybrid' }),
      car('Honda', 'CR-V AWD', 2016, 2.4, 185),
      // The 2.4 turbo WRX is not the 2.5 STI.
      car('Subaru', 'WRX', 2023, 2.4, 271, { aspiration: 'turbocharged' }),
      car('Mazda', 'CX-50 4WD', 2024, 2.5, 227, { aspiration: 'turbocharged' }),
    ];
    const { cars: out, corrected } = applyHorsepowerCorrections(cars);
    expect(out.map((c) => c.engine.horsepower)).toEqual([212, 185, 271, 227]);
    expect(corrected).toBe(0);
  });
});
