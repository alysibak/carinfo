import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { differentiateCars, differentiateVsAnchor } from './differentiateCars';

function car(partial: Partial<CarSpecs> & Pick<CarSpecs, 'id' | 'make' | 'model'>): CarSpecs {
  const { engine, fuelEconomy, ...rest } = partial;
  return {
    year: 2022,
    provenance: {},
    transmission: { type: 'automatic' },
    driveType: 'FWD',
    bodyStyle: 'sedan',
    price: { msrp: 28000, isEstimated: true },
    ...rest,
    engine: {
      fuelType: 'gasoline',
      horsepower: 180,
      ...engine,
    },
    fuelEconomy: {
      city: 25,
      highway: 32,
      combined: 28,
      ...fuelEconomy,
    },
  };
}

describe('differentiateCars', () => {
  it('calls out the efficiency leader when MPG meaningfully differs', () => {
    const a = car({
      id: 'a',
      make: 'Toyota',
      model: 'Corolla',
      fuelEconomy: { city: 30, highway: 38, combined: 34 },
      engine: { fuelType: 'gasoline', horsepower: 139 },
    });
    const b = car({
      id: 'b',
      make: 'Honda',
      model: 'Civic',
      fuelEconomy: { city: 26, highway: 32, combined: 28 },
      engine: { fuelType: 'gasoline', horsepower: 158 },
    });
    const c = car({
      id: 'c',
      make: 'Mazda',
      model: '3',
      fuelEconomy: { city: 26, highway: 33, combined: 29 },
      engine: { fuelType: 'gasoline', horsepower: 186 },
    });

    const { byCarId, axes } = differentiateCars([a, b, c]);
    expect(byCarId.a.edge).toMatch(/efficiency|MPG/i);
    expect(axes.some((x) => /efficiency/i.test(x))).toBe(true);
  });

  it('flags a unique powertrain in the set', () => {
    const gas = car({ id: 'g', make: 'Toyota', model: 'Camry' });
    const ev = car({
      id: 'e',
      make: 'Tesla',
      model: 'Model 3',
      engine: { fuelType: 'electric', horsepower: 283 },
      fuelEconomy: { city: 130, highway: 120, combined: 125 },
      price: { msrp: 42000, isEstimated: true },
    });
    const { byCarId } = differentiateCars([gas, ev]);
    expect(byCarId.e.edge).toMatch(/electric/i);
  });

  it('explains close calls instead of inventing a fake winner', () => {
    const a = car({
      id: 'a',
      make: 'Toyota',
      model: 'Corolla',
      fuelEconomy: { city: 30, highway: 38, combined: 33 },
      engine: { fuelType: 'gasoline', horsepower: 169 },
      price: { msrp: 25000, isEstimated: true },
    });
    const b = car({
      id: 'b',
      make: 'Honda',
      model: 'Civic',
      fuelEconomy: { city: 30, highway: 38, combined: 33 },
      engine: { fuelType: 'gasoline', horsepower: 158 },
      price: { msrp: 25500, isEstimated: true },
    });
    const { byCarId } = differentiateCars([a, b]);
    expect(byCarId.a.edge.length).toBeGreaterThan(10);
    expect(byCarId.b.edge.length).toBeGreaterThan(10);
  });
});

describe('differentiateVsAnchor', () => {
  it('phrases the alternative relative to the current car', () => {
    const current = car({
      id: 'cur',
      make: 'Toyota',
      model: 'RAV4',
      bodyStyle: 'suv',
      driveType: 'FWD',
      fuelEconomy: { city: 27, highway: 34, combined: 30 },
    });
    const alt = car({
      id: 'alt',
      make: 'Toyota',
      model: 'RAV4',
      bodyStyle: 'suv',
      driveType: 'AWD',
      fuelEconomy: { city: 25, highway: 32, combined: 28 },
      engine: { fuelType: 'gasoline', horsepower: 203 },
    });
    const edges = differentiateVsAnchor(current, [alt]);
    expect(edges.alt).toMatch(/AWD|snow|power|efficiency|thirst/i);
  });
});
