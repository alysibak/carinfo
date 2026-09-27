import { describe, expect, it } from 'vitest';
import { getAllCars } from '../services/car.service.js';
import { isCollectorCar } from './collector-cars.js';
import { isPorsche911 } from './porsche-911.js';
import { estimateMarketValue } from './vehicle-valuation.js';

describe('isPorsche911', () => {
  it("knows a 911 by EPA's 2003-2009 names", () => {
    for (const model of [
      '911 Carrera',
      'Carrera 2 Coupe',
      'Carrera 4 S Cabriolet',
      'Targa',
      'Turbo GT2',
    ]) {
      expect(isPorsche911({ make: 'Porsche', model }), model).toBe(true);
    }
    for (const model of ['Carrera GT', 'Cayenne Turbo', 'Panamera Turbo', 'Boxster']) {
      expect(isPorsche911({ make: 'Porsche', model }), model).toBe(false);
    }
    expect(isPorsche911({ make: 'Chevrolet', model: 'Turbo' })).toBe(false);
  });

  it('values them as 911s', () => {
    const find = (model: string, year: number) =>
      getAllCars().find((c) => c.make === 'Porsche' && c.model === model && c.year === year)!;
    // A 2008 Carrera read $13,250, between a 2002 at $37,500 and a 2010 at $57,500.
    const carrera = estimateMarketValue(find('Carrera 2 Coupe', 2008)).mid;
    expect(carrera).toBeGreaterThan(40_000);
    expect(carrera).toBeLessThan(estimateMarketValue(find('911 Carrera', 2010)).mid);
    // The 996 GT2 is a collector car, as the later GT2s are.
    expect(isCollectorCar(find('Turbo GT2', 2003))).toBe(true);
  });
});
