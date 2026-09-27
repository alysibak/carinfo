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
      // A 5.0 F-150 at the Raptor R's figure; the base Ram Hurricane at the HO's.
      car('Ford', 'F150 Pickup 4WD FFV', 2016, 5, 653),
      car('Ram', '1500 4WD', 2025, 3, 540, { aspiration: 'turbocharged' }),
    ]);
    expect(cars.map((c) => c.engine.horsepower)).toEqual([190, 187, 187, 305, 385, 420]);
    expect(corrected).toBe(6);
    expect(cars.every((c) => c.provenance['engine.horsepower'] === 'curated')).toBe(true);
  });

  it('fills trucks the match left without a figure, hybrids at their system rating', () => {
    const diesel = { aspiration: 'turbocharged' as const, fuelType: 'diesel' as const };
    const { cars } = applyHorsepowerCorrections([
      car('Chevrolet', 'Silverado 4WD', 2022, 5.3, undefined),
      // The SUVs' Duramax: 277 hp to 2024, 305 from the 2025 update.
      car('GMC', 'Yukon 4WD', 2024, 3, 276, diesel),
      car('GMC', 'Yukon 4WD', 2025, 3, undefined, diesel),
      // EPA's 2.8 Duramax figure stands.
      car('Chevrolet', 'Colorado 4WD', 2020, 2.8, 181, diesel),
      // The i-Force Max hybrid read the gas engine's 389 hp.
      car('Toyota', 'Tundra 4WD', 2023, 3.4, 389, {
        aspiration: 'turbocharged',
        fuelType: 'hybrid',
      }),
      car('Toyota', 'Tundra 4WD', 2023, 3.4, 389, { aspiration: 'turbocharged' }),
    ]);
    expect(cars.map((c) => c.engine.horsepower)).toEqual([355, 277, 305, 181, 437, 389]);
  });

  it("rates the 718 by trim and clears EPA's turbo flag on its 4.0", () => {
    const { cars } = applyHorsepowerCorrections([
      // The 2.0 turbo base car read the GTS's 361 hp.
      car('Porsche', 'Cayman', 2019, 2, 361, { aspiration: 'turbocharged' }),
      car('Porsche', '718 Cayman GTS', 2023, 4, undefined, { aspiration: 'turbocharged' }),
      // The 2023 GT4 read the GT4 RS's 493.
      car('Porsche', '718 Cayman GT4', 2023, 4, 493, { aspiration: 'turbocharged' }),
    ]);
    expect(cars.map((c) => c.engine.horsepower)).toEqual([300, 394, 414]);
    expect(cars.map((c) => c.engine.aspiration)).toEqual(['turbocharged', undefined, undefined]);
  });

  it('leaves other engines, hybrids and years alone', () => {
    const cars = [
      car('Honda', 'CR-V Hybrid AWD', 2021, 2, 212, { fuelType: 'hybrid' }),
      car('Honda', 'CR-V AWD', 2016, 2.4, 185),
      // The 2.4 turbo WRX is not the 2.5 STI.
      car('Subaru', 'WRX', 2023, 2.4, 271, { aspiration: 'turbocharged' }),
      car('Mazda', 'CX-50 4WD', 2024, 2.5, 227, { aspiration: 'turbocharged' }),
      car('Ram', '1500 HO 4WD', 2025, 3, 540, { aspiration: 'turbocharged' }),
    ];
    const { cars: out, corrected } = applyHorsepowerCorrections(cars);
    expect(out.map((c) => c.engine.horsepower)).toEqual([212, 185, 271, 227, 540]);
    expect(corrected).toBe(0);
  });
});
