import { describe, expect, it } from 'vitest';
import type { Car, CarSpecs } from '../types/car.types.js';
import { COLLECTIONS, calculateCollectionScore, rankCollectionPicks } from './collections.js';

function car(overrides: Partial<Car> & { id: string }): Car {
  return {
    year: 2022,
    make: 'Make',
    model: overrides.id,
    bodyStyle: 'sedan',
    engine: { fuelType: 'gasoline', horsepower: 150 },
    fuelEconomy: { city: 30, highway: 38, combined: 33 },
    ...overrides,
  } as Car;
}

describe('calculateCollectionScore', () => {
  it('ranks on the records, never on the estimated price', () => {
    const cheap = car({ id: 'cheap', price: { msrp: 12000 } } as Partial<CarSpecs> & {
      id: string;
    });
    const dear = car({ id: 'dear', price: { msrp: 60000 } } as Partial<Car> & { id: string });
    for (const rankBy of ['best-value', 'daily-driver', 'efficiency', 'fun', 'luxury'] as const) {
      expect(calculateCollectionScore(cheap, rankBy)).toBe(calculateCollectionScore(dear, rankBy));
    }
  });

  it('puts NHTSA stars ahead of fuel economy for the family lists', () => {
    const fiveStar = car({ id: 'safe', safetyRating: { overall: 5 } as CarSpecs['safetyRating'] });
    const thrifty = car({
      id: 'thrifty',
      fuelEconomy: { city: 50, highway: 50, combined: 50 },
      safetyRating: { overall: 4 } as CarSpecs['safetyRating'],
    });
    expect(calculateCollectionScore(fiveStar, 'daily-driver')).toBeGreaterThan(
      calculateCollectionScore(thrifty, 'daily-driver'),
    );
  });

  it('sinks a car without the ranked record below every car with it', () => {
    const noRange = car({ id: 'no-range', engine: { fuelType: 'electric', horsepower: 300 } });
    const ranged = car({
      id: 'ranged',
      engine: { fuelType: 'electric', horsepower: 300 },
      epa: { rangeMiles: 150 } as CarSpecs['epa'],
    });
    expect(calculateCollectionScore(noRange, 'range')).toBeLessThan(
      calculateCollectionScore(ranged, 'range'),
    );
  });
});

describe('rankCollectionPicks', () => {
  it('keeps one pick per model, the best-scoring trim, best first', () => {
    const picks = rankCollectionPicks(
      [
        car({ id: 'a1', model: 'A', fuelEconomy: { city: 40, highway: 40, combined: 40 } }),
        car({ id: 'a2', model: 'A', fuelEconomy: { city: 45, highway: 45, combined: 45 } }),
        car({ id: 'b1', model: 'B', fuelEconomy: { city: 42, highway: 42, combined: 42 } }),
      ],
      COLLECTIONS['gas-savers'],
    );
    expect(picks.map((p) => p.id)).toEqual(['a2', 'b1']);
  });
});
