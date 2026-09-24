import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { packRuntimeDatabase, unpackRuntimeDatabase } from './runtime-db.js';

function car(id: string, provenance: Car['provenance']): Car {
  return {
    id,
    make: 'Honda',
    model: 'Civic',
    year: 2022,
    provenance,
    engine: { fuelType: 'gasoline' },
    fuelEconomy: { city: 31, highway: 40, combined: 35 },
    transmission: { type: 'cvt' },
    driveType: 'FWD',
    bodyStyle: 'sedan',
  };
}

const META = { lastUpdated: '2026-09-01T00:00:00.000Z', sources: ['epa'] };

/** What actually happens between build and runtime: the file is JSON. */
const throughDisk = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('runtime database format', () => {
  const cars = [
    car('a', { make: 'epa', 'engine.horsepower': 'curated' }),
    car('b', { 'engine.horsepower': 'curated', make: 'epa' }), // same map, other order
    car('c', { make: 'epa', 'engine.horsepower': 'estimated' }),
    car('d', {}),
  ];

  it('stores each distinct provenance map once', () => {
    const file = packRuntimeDatabase(cars, META);
    expect(file.provenance).toHaveLength(3);
    expect(file.cars.map((c) => c.provenance)).toEqual([0, 0, 1, 2]);
  });

  it('round-trips every car exactly', () => {
    const restored = unpackRuntimeDatabase(throughDisk(packRuntimeDatabase(cars, META)));
    expect(restored).toEqual(cars);
  });

  it('shares and freezes restored provenance', () => {
    const [a, b] = unpackRuntimeDatabase(throughDisk(packRuntimeDatabase(cars, META)));
    expect(a.provenance).toBe(b.provenance);
    expect(Object.isFrozen(a.provenance)).toBe(true);
    // An in-place write would rewrite every car sharing the map; it must throw.
    expect(() => {
      a.provenance.make = 'estimated';
    }).toThrow(TypeError);
  });

  it('still reads files in the original format', () => {
    const legacy = { cars: throughDisk(cars), lastUpdated: META.lastUpdated, ready: true };
    expect(unpackRuntimeDatabase(legacy)).toEqual(cars);
  });

  it('refuses a file whose index points nowhere', () => {
    const file = throughDisk(packRuntimeDatabase(cars, META));
    file.cars[2].provenance = 99;
    expect(() => unpackRuntimeDatabase(file)).toThrow(/c has provenance #99/);
  });
});
