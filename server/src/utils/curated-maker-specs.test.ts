import { afterEach, describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  __setCuratedMakerSpecsForTests,
  curatedEntriesFor,
  curatedMakerSpecsFor,
  withCuratedMakerSpecs,
  type CuratedMakerSpecsFile,
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

  it('tells apart cars the family name would lump together, by modelMatch and horsepower', () => {
    __setCuratedMakerSpecsForTests({
      source: 'test',
      updatedAt: '2026-11-15',
      models: [
        {
          make: 'Jeep',
          model: 'Wrangler',
          modelMatch: '^wrangler 2dr',
          years: [2021, 2026],
          seats: 4,
          seatsSource: 'https://example.test/2dr',
          engines: [
            {
              displacementL: 3.6,
              cylinders: 6,
              fuel: 'gasoline',
              maxTowingLb: 2000,
              source: 'https://example.test/2dr',
            },
          ],
        },
        {
          make: 'Jeep',
          model: 'Wrangler',
          modelMatch: '^wrangler 4dr',
          years: [2021, 2026],
          seats: 5,
          seatsSource: 'https://example.test/4dr',
          engines: [
            {
              displacementL: 3.6,
              cylinders: 6,
              fuel: 'gasoline',
              maxTowingLb: 3500,
              source: 'https://example.test/4dr',
            },
          ],
        },
        {
          make: 'Honda',
          model: 'Civic',
          years: [2022, 2026],
          engines: [
            {
              displacementL: 1.5,
              cylinders: 4,
              fuel: 'gasoline',
              forcedInduction: true,
              horsepower: 180,
              torqueLbFt: 177,
              source: 'https://example.test/ex',
            },
            {
              displacementL: 1.5,
              cylinders: 4,
              fuel: 'gasoline',
              forcedInduction: true,
              horsepower: 200,
              torqueLbFt: 192,
              source: 'https://example.test/si',
            },
          ],
        },
      ],
    });
    const wrangler = (model: string) =>
      base({
        make: 'Jeep',
        model,
        year: 2024,
        engine: { fuelType: 'gasoline', displacement: 3.6, cylinders: 6 },
      });
    expect(curatedMakerSpecsFor(wrangler('Wrangler 2dr 4WD'))).toMatchObject({
      seats: 4,
      maxTowingLb: 2000,
    });
    expect(curatedMakerSpecsFor(wrangler('Wrangler 4dr 4WD'))).toMatchObject({
      seats: 5,
      maxTowingLb: 3500,
    });
    expect(curatedMakerSpecsFor(wrangler('Wrangler 4dr 4xe'))).toMatchObject({ seats: 5 });
    expect(curatedMakerSpecsFor(wrangler('Gladiator 4WD'))).toBeNull();

    const civic = (horsepower?: number) =>
      base({
        make: 'Honda',
        model: 'Civic 4Dr',
        year: 2024,
        engine: {
          fuelType: 'gasoline',
          displacement: 1.5,
          cylinders: 4,
          aspiration: 'turbocharged',
          horsepower,
        },
      });
    expect(curatedMakerSpecsFor(civic(180))?.torqueLbFt).toBe(177);
    expect(curatedMakerSpecsFor(civic(200))?.torqueLbFt).toBe(192);
    // With no horsepower on file, neither output can be told from the other.
    expect(curatedMakerSpecsFor(civic(undefined))).toBeNull();
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

describe('the shipped maker file', () => {
  it('names only cars the catalogue has, with a source for every figure', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { getAllCars } = await import('../services/car.service.js');
    const file = JSON.parse(
      readFileSync(join(__dirname, '../../data/curated-maker-specs.json'), 'utf8'),
    ) as CuratedMakerSpecsFile;
    const cars = getAllCars();
    const seen = new Set<string>();
    for (const entry of file.models) {
      const label = `${entry.make} ${entry.model}${entry.modelMatch ? ` /${entry.modelMatch}/` : ''} ${entry.years[0]}-${entry.years[1]}`;
      expect(entry.years[0], label).toBeLessThanOrEqual(entry.years[1]);
      if (entry.seats != null) expect(entry.seatsSource, label).toMatch(/^https?:\/\//);
      if (entry.seatsMax != null)
        expect(entry.seatsMax, label).toBeGreaterThanOrEqual(entry.seats ?? 0);
      for (const engine of entry.engines ?? []) {
        expect(engine.source, label).toMatch(/^https?:\/\//);
        expect(engine.torqueLbFt != null || engine.maxTowingLb != null, label).toBe(true);
      }
      // Each entry, and each of its engines, describes at least one car on file.
      const own = cars.filter(
        (car) =>
          car.year >= entry.years[0] &&
          car.year <= entry.years[1] &&
          curatedEntriesFor(car).some(
            (found) =>
              found.make === entry.make &&
              found.model === entry.model &&
              found.modelMatch === entry.modelMatch &&
              found.years[0] === entry.years[0] &&
              found.years[1] === entry.years[1],
          ),
      );
      expect(own.length, label).toBeGreaterThan(0);
      // An engine entry may name a car the catalogue files under another name
      // (the RAV4 Prime is EPA's "RAV4 Prime"), so engines are not held to a match.
      seen.add(label);
    }
    expect(seen.size).toBeGreaterThan(0);
  }, 60_000);
});
