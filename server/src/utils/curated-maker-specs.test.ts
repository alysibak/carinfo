import { afterEach, describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  __setCuratedMakerSpecsForTests,
  curatedMakerSpecsFor,
  withCuratedMakerSpecs,
} from './curated-maker-specs.js';

const base = (over: Partial<Car> & { engine?: Partial<Car['engine']> } = {}): Car =>
  ({
    id: 'toyota-rav4-2022',
    make: 'Toyota',
    model: 'RAV4 AWD',
    year: 2022,
    bodyStyle: 'suv',
    driveType: 'AWD',
    fuelEconomy: { combined: 30 },
    provenance: {},
    engine: {
      fuelType: 'gasoline',
      displacement: 2.5,
      cylinders: 4,
      ...over.engine,
    },
    ...over,
  }) as Car;

afterEach(() => __setCuratedMakerSpecsForTests(undefined));

describe('curatedMakerSpecsFor', () => {
  it('matches by family, year and engine, and ignores a different induction', () => {
    __setCuratedMakerSpecsForTests({
      source: 'test',
      updatedAt: '2026-11-04',
      models: [
        {
          make: 'Toyota',
          model: 'RAV4',
          years: [2019, 2025],
          seats: 5,
          seatsSource: 'https://example.test/seats',
          engines: [
            {
              displacementL: 2.5,
              cylinders: 4,
              fuel: 'gasoline',
              forcedInduction: false,
              torqueLbFt: 184,
              maxTowingLb: 1500,
              source: 'https://example.test/gas',
            },
            {
              displacementL: 2.5,
              cylinders: 4,
              fuel: 'hybrid',
              torqueLbFt: 163,
              maxTowingLb: 1750,
              source: 'https://example.test/hybrid',
            },
          ],
        },
      ],
    });

    const gas = curatedMakerSpecsFor(base())!;
    expect(gas).toMatchObject({ seats: 5, torqueLbFt: 184, maxTowingLb: 1500 });
    expect(gas.provenance).toEqual({
      seats: 'curated',
      'engine.torque': 'curated',
      towingCapacityLb: 'curated',
    });

    const hybrid = curatedMakerSpecsFor(
      base({ engine: { fuelType: 'hybrid', displacement: 2.5, cylinders: 4 } }),
    )!;
    expect(hybrid).toMatchObject({ torqueLbFt: 163, maxTowingLb: 1750 });

    const turbo = curatedMakerSpecsFor(
      base({
        engine: {
          fuelType: 'gasoline',
          displacement: 2.5,
          cylinders: 4,
          aspiration: 'turbocharged',
        },
      }),
    );
    // Same displacement, wrong induction: seats still match, torque does not.
    expect(turbo).toMatchObject({ seats: 5 });
    expect(turbo?.torqueLbFt).toBeUndefined();
  });

  it('leaves a car that already has figures alone, and skips other years', () => {
    __setCuratedMakerSpecsForTests({
      source: 'test',
      updatedAt: '2026-11-04',
      models: [
        {
          make: 'Toyota',
          model: 'RAV4',
          years: [2019, 2025],
          seats: 5,
          engines: [
            {
              displacementL: 2.5,
              torqueLbFt: 184,
              maxTowingLb: 1500,
              source: 'https://example.test',
            },
          ],
        },
      ],
    });
    const kept = withCuratedMakerSpecs(
      base({ seats: 7, engine: { fuelType: 'gasoline', displacement: 2.5, torque: 200 } }),
    );
    expect(kept.seats).toBe(7);
    expect(kept.engine.torque).toBe(200);
    expect(kept.towingCapacityLb).toBe(1500);
    expect(withCuratedMakerSpecs(base({ year: 2010 }))).toEqual(base({ year: 2010 }));
  });

  it('reads the shipped maker file for a common RAV4', () => {
    // No fixture: the seam is cleared in afterEach, so this hits the JSON.
    const matched = curatedMakerSpecsFor(base());
    expect(matched).toMatchObject({
      seats: 5,
      torqueLbFt: 184,
      // The Adventure and TRD Off-Road's rating: the most a gas RAV4 of these years tows.
      maxTowingLb: 3500,
    });
    const hybrid = withCuratedMakerSpecs(
      base({ engine: { fuelType: 'hybrid', displacement: 2.5, cylinders: 4 } }),
    );
    expect(hybrid.seats).toBe(5);
    expect(hybrid.engine.torque).toBe(163);
    expect(hybrid.towingCapacityLb).toBe(1750);
  });
});
