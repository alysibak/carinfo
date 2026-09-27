import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { applyHorsepowerCorrections } from './horsepower-corrections.js';

const car = (
  make: string,
  model: string,
  year: number,
  displacement: number,
  horsepower: number | undefined,
  extra: {
    aspiration?: Car['engine']['aspiration'];
    fuelType?: Car['engine']['fuelType'];
    transmission?: 'manual' | 'automatic';
  } = {},
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
    transmission: { type: extra.transmission ?? 'automatic' },
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

  it("rates the Golf's lumped engines by what they are", () => {
    const turbo = { aspiration: 'turbocharged' as const };
    const { cars } = applyHorsepowerCorrections([
      // A 2000 GTI 1.8T read the eight-valve 2.0's 115 hp; a 2002 Golf TDI too.
      car('Volkswagen', 'Golf GTI', 2000, 1.8, 115, turbo),
      car('Volkswagen', 'Golf GTI', 2004, 1.8, undefined, turbo),
      car('Volkswagen', 'Golf', 2002, 1.9, 115, { ...turbo, fuelType: 'diesel' }),
      car('Volkswagen', 'Golf', 2005, 1.9, 115, { ...turbo, fuelType: 'diesel' }),
    ]);
    expect(cars.map((c) => c.engine.horsepower)).toEqual([150, 180, 90, 100]);
  });

  it('rates hybrids at their system output, not the engine alone', () => {
    const hybrid = { fuelType: 'hybrid' as const };
    const { cars } = applyHorsepowerCorrections([
      // The test-car list gives the engine: a Prius read 98 hp, a RAV4 Hybrid 176.
      car('Toyota', 'Prius', 2012, 1.8, 98, hybrid),
      car('Toyota', 'RAV4 Hybrid AWD', 2021, 2.5, 176, hybrid),
      car('Honda', 'Accord Hybrid', 2024, 2, 146, hybrid),
      car('Hyundai', 'Tucson Hybrid', 2023, 1.6, 177, { ...hybrid, aspiration: 'turbocharged' }),
      // A Fusion Hybrid read the 2.0 EcoBoost's 240.
      car('Ford', 'Fusion Hybrid FWD', 2017, 2, 240, hybrid),
      // The Crown's turbocharged Hybrid MAX is rated apart.
      car('Toyota', 'Crown AWD', 2024, 2.4, 264, { ...hybrid, aspiration: 'turbocharged' }),
      car('Toyota', 'Crown AWD', 2024, 2.5, 184, hybrid),
    ]);
    expect(cars.map((c) => c.engine.horsepower)).toEqual([134, 219, 204, 226, 188, 340, 236]);
  });

  it('rates plug-in hybrids at their system output', () => {
    const phev = { fuelType: 'plug-in hybrid' as const };
    const { cars } = applyHorsepowerCorrections([
      // A RAV4 Prime read its engine's 203 hp, a Wrangler 4xe 270.
      car('Toyota', 'RAV4 Prime AWD', 2022, 2.5, 203, phev),
      car('Jeep', 'Wrangler 4dr 4xe', 2023, 2, 270, { ...phev, aspiration: 'turbocharged' }),
      car('Volvo', 'XC90 T8 AWD Recharge', 2024, 2, 312, { ...phev, aspiration: 'turbocharged' }),
      car('Porsche', 'Cayenne Turbo S/Coupe E-Hybrid', 2022, 4, 541, {
        ...phev,
        aspiration: 'turbocharged',
      }),
    ]);
    expect(cars.map((c) => c.engine.horsepower)).toEqual([302, 375, 455, 670]);
  });

  it("puts the maker's rating on performance cars that read another engine's", () => {
    const hp = (...args: Parameters<typeof car>) =>
      applyHorsepowerCorrections([car(...args)]).cars[0].engine.horsepower;
    // Every 2017-24 Camaro SS read 553 hp, a 2019-23 Charger R/T the Scat Pack's 485.
    expect(hp('Chevrolet', 'Camaro', 2020, 6.2, 553)).toBe(455);
    expect(hp('Chevrolet', 'Camaro', 2020, 6.2, 553, { aspiration: 'supercharged' })).toBe(650);
    expect(hp('Dodge', 'Charger', 2021, 5.7, 485)).toBe(370);
    expect(hp('BMW', 'M5', 2019, 4.4, 455, { aspiration: 'turbocharged' })).toBe(600);
    expect(hp('Porsche', '911 Carrera GTS', 2016, 3.8, 350)).toBe(430);
    // The gearbox tells the Camaro SS's two V8s apart.
    expect(hp('Chevrolet', 'Camaro', 2013, 6.2, undefined, { transmission: 'manual' })).toBe(426);
    expect(hp('Chevrolet', 'Camaro', 2013, 6.2, undefined)).toBe(400);
  });

  it('tells a Volvo T5 from a T6 by the supercharger EPA records', () => {
    const hp = (model: string, year: number, aspiration: Car['engine']['aspiration']) =>
      applyHorsepowerCorrections([car('Volvo', model, year, 2, undefined, { aspiration })]).cars[0]
        .engine.horsepower;
    expect(hp('XC90 AWD', 2018, 'turbocharged')).toBe(250);
    expect(hp('XC90 AWD', 2018, 'turbocharged and supercharged')).toBe(316);
    // The older platform's T5 and T6.
    expect(hp('S60 FWD', 2016, 'turbocharged')).toBe(240);
    expect(hp('S60 FWD', 2016, 'turbocharged and supercharged')).toBe(302);
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
