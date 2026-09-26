import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { deriveVariant } from './performance-trims.js';

function car(overrides: Partial<Car> & Pick<Car, 'make' | 'model' | 'year'>): Car {
  return {
    id: 'x',
    provenance: {},
    engine: { fuelType: 'gasoline' },
    fuelEconomy: { city: 20, highway: 28, combined: 23 },
    transmission: { type: 'automatic' },
    driveType: 'RWD',
    bodyStyle: 'coupe',
    ...overrides,
  };
}

const v8 = { fuelType: 'gasoline' as const, cylinders: 8, displacement: 5 };

describe('deriveVariant', () => {
  it('names the Mustang from its engine', () => {
    expect(deriveVariant(car({ make: 'Ford', model: 'Mustang', year: 2020, engine: v8 }))).toBe(
      'GT',
    );
    expect(
      deriveVariant(
        car({
          make: 'Ford',
          model: 'Mustang',
          year: 2020,
          engine: {
            fuelType: 'gasoline',
            cylinders: 8,
            displacement: 5.2,
            aspiration: 'supercharged',
          },
        }),
      ),
    ).toBe('Shelby GT500');
    expect(
      deriveVariant(
        car({
          make: 'Ford',
          model: 'Mustang',
          year: 2020,
          engine: {
            fuelType: 'gasoline',
            cylinders: 4,
            displacement: 2.3,
            aspiration: 'turbocharged',
          },
        }),
      ),
    ).toBe('EcoBoost');
    // Already in the name, or not a Mustang with an engine.
    expect(
      deriveVariant(car({ make: 'Ford', model: 'Mustang GT350', year: 2017, engine: v8 })),
    ).toBeUndefined();
    expect(
      deriveVariant(
        car({
          make: 'Ford',
          model: 'Mustang Mach-E GT',
          year: 2023,
          engine: { fuelType: 'electric' },
        }),
      ),
    ).toBeUndefined();
  });

  it('tells a Civic Type R and Si from the hatchback Sport by engine and body', () => {
    const turbo = (displacement: number) => ({
      fuelType: 'gasoline' as const,
      cylinders: 4,
      displacement,
      aspiration: 'turbocharged' as const,
    });
    const manual = { type: 'manual' as const, speeds: 6 };
    const civic = (model: string, displacement: number) =>
      deriveVariant(
        car({
          make: 'Honda',
          model,
          year: 2020,
          engine: turbo(displacement),
          transmission: manual,
        }),
      );
    expect(civic('Civic 5Dr', 2)).toBe('Type R');
    expect(civic('Civic 4Dr', 1.5)).toBe('Si');
    expect(civic('Civic 5Dr', 1.5)).toBeUndefined();
    expect(civic('Civic Type R', 2)).toBeUndefined();
  });

  it('tells the WRX STI from the WRX by gearbox, and the 2015–21 STI by engine', () => {
    const impreza = (speeds: number) =>
      deriveVariant(
        car({
          make: 'Subaru',
          model: 'Impreza AWD',
          year: 2012,
          engine: {
            fuelType: 'gasoline',
            cylinders: 4,
            displacement: 2.5,
            aspiration: 'turbocharged',
          },
          transmission: { type: 'manual', speeds },
        }),
      );
    expect(impreza(6)).toBe('WRX STI');
    expect(impreza(5)).toBe('WRX');
    const wrx = (year: number, displacement: number) =>
      deriveVariant(
        car({
          make: 'Subaru',
          model: 'WRX',
          year,
          engine: { fuelType: 'gasoline', cylinders: 4, displacement, aspiration: 'turbocharged' },
        }),
      );
    expect(wrx(2018, 2.5)).toBe('STI');
    expect(wrx(2018, 2)).toBeUndefined();
    expect(wrx(2023, 2.4)).toBeUndefined();
  });

  it('adds Hellcat to an EPA "SRT", which covers both the 392 and the Hellcat', () => {
    const challenger = (model: string, displacement: number, sc: boolean) =>
      deriveVariant(
        car({
          make: 'Dodge',
          model,
          year: 2021,
          engine: {
            fuelType: 'gasoline',
            cylinders: 8,
            displacement,
            ...(sc ? { aspiration: 'supercharged' as const } : {}),
          },
        }),
      );
    expect(challenger('Challenger SRT', 6.2, true)).toBe('Hellcat');
    expect(challenger('Challenger SRT', 6.4, false)).toBeUndefined();
    expect(challenger('Challenger', 6.4, false)).toBe('Scat Pack');
    expect(challenger('Challenger', 5.7, false)).toBe('R/T');
  });

  it('calls a pre-2003 V8 Camaro a Z28, and names the later V8s', () => {
    const camaro = (year: number, displacement: number, sc = false) =>
      deriveVariant(
        car({
          make: 'Chevrolet',
          model: 'Camaro',
          year,
          engine: {
            fuelType: 'gasoline',
            cylinders: 8,
            displacement,
            ...(sc ? { aspiration: 'supercharged' as const } : {}),
          },
        }),
      );
    expect(camaro(1999, 5.7)).toBe('Z28');
    expect(camaro(2018, 6.2)).toBe('SS');
    expect(camaro(2018, 6.2, true)).toBe('ZL1');
    expect(camaro(2015, 7)).toBe('Z/28');
  });
});
