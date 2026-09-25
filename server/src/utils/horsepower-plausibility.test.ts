import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  dropInductionMismatchedHorsepower,
  isPlausibleRatedHorsepower,
} from './horsepower-plausibility.js';

describe('isPlausibleRatedHorsepower', () => {
  it.each([
    // Placeholders and mis-keyed EPA Test Car List rows that reached the site.
    [999, 2.5, '2020 Audi TT RS'],
    [999, 4.0, '2020 Audi S8'],
    [1, 1.5, '2026 Ford Bronco Sport'],
    [1, 2.0, '2019 Audi A3 quattro'],
    [11, 2.0, '2021 Mercedes-Benz C300'],
    [14, 4.0, '2021 Mercedes-AMG G63'],
    [35, 4.8, '2010 Porsche Cayenne S'],
    [38, 0.6, 'BMW i3 REx generator'],
  ])('rejects %i hp from %f L (%s)', (hp, litres) => {
    expect(isPlausibleRatedHorsepower(hp, litres)).toBe(false);
  });

  it.each([
    [1500, 8.0, 'Bugatti Chiron'],
    [1025, 6.2, 'Dodge Challenger SRT Demon 170'],
    [1250, 5.5, 'Corvette ZR1X (hybrid)'],
    [416, 2.0, 'Mercedes-AMG CLA45 S'],
    [70, 1.0, 'Smart fortwo'],
    [180, 1.5, 'Ford Bronco Sport'],
  ])('accepts %i hp from %f L (%s)', (hp, litres) => {
    expect(isPlausibleRatedHorsepower(hp, litres)).toBe(true);
  });

  it('judges by the absolute floor when displacement is unknown', () => {
    expect(isPlausibleRatedHorsepower(150, undefined)).toBe(true);
    expect(isPlausibleRatedHorsepower(1, undefined)).toBe(false);
  });
});

describe('dropInductionMismatchedHorsepower', () => {
  const car = (id: string, hp: number, aspiration?: 'turbocharged', displacement = 2.5) =>
    ({
      id,
      make: 'Subaru',
      model: 'Legacy AWD',
      year: 2005,
      provenance: { 'engine.horsepower': 'curated' },
      engine: { fuelType: 'gasoline', displacement, horsepower: hp, aspiration },
      fuelEconomy: { combined: 22 },
      transmission: { type: 'manual' },
      driveType: 'AWD',
      bodyStyle: 'sedan',
    }) as Car;

  it("drops a turbo car's rating when it merely repeats the non-turbo sibling's", () => {
    const { cars, dropped } = dropInductionMismatchedHorsepower([
      car('2.5i', 168),
      car('gt', 168, 'turbocharged'),
    ]);
    expect(dropped).toBe(1);
    expect(cars[0].engine.horsepower).toBe(168);
    expect(cars[1].engine.horsepower).toBeUndefined();
    expect(cars[1].provenance['engine.horsepower']).toBeUndefined();
  });

  it('keeps a turbo rating above the non-turbo one, or with no sibling to compare', () => {
    const { cars, dropped } = dropInductionMismatchedHorsepower([
      car('2.5i', 168),
      car('gt', 250, 'turbocharged'),
      car('2.0t', 243, 'turbocharged', 2),
    ]);
    expect(dropped).toBe(0);
    expect(cars.map((c) => c.engine.horsepower)).toEqual([168, 250, 243]);
  });
});
