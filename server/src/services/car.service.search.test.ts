import { describe, expect, it } from 'vitest';
import { getCarById, searchCars } from '../services/car.service.js';

describe('car.service search smoke', () => {
  it(
    'loads the full committed database (not fallback-only)',
    () => {
      const { total } = searchCars({ limit: 1 });
      expect(total).toBeGreaterThan(25_000);
    },
    120_000,
  );

  it('filters by make using indexes', () => {
    const { results, total } = searchCars({
      filters: { make: ['Toyota'] },
      limit: 10,
    });
    expect(total).toBeGreaterThan(100);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.make === 'Toyota')).toBe(true);
  });

  it('filters plug-in hybrid after runtime fuel correction', () => {
    const { results, total } = searchCars({
      filters: { fuelType: ['plug-in hybrid'] },
      limit: 20,
    });
    expect(total).toBeGreaterThan(100);
    expect(results.every((c) => c.engine.fuelType === 'plug-in hybrid')).toBe(true);
  });

  it('returns normalized dossier-ready records by id', () => {
    const car = getCarById('porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8');
    expect(car).not.toBeNull();
    expect(car!.engine.fuelType).toBe('plug-in hybrid');
    expect(car!.price?.isEstimated).toBe(true);
  });
});
