import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { compareWithClass } from './class-comparison.js';

let seq = 0;
function suv(make: string, model: string, overrides: Partial<Car> = {}): Car {
  seq += 1;
  return {
    id: `${make}-${model}-${seq}`,
    make,
    model,
    year: 2024,
    provenance: {},
    engine: { fuelType: 'gasoline', displacement: 2.5, cylinders: 4, horsepower: 200 },
    fuelEconomy: { city: 25, highway: 32, combined: 28 },
    transmission: { type: 'automatic' },
    driveType: 'AWD',
    bodyStyle: 'suv',
    runningCostCad: 6000,
    ...overrides,
  };
}

const mpg = (combined: number) => ({
  fuelEconomy: { city: combined, highway: combined, combined },
});
const lineOf = (car: Car) => `${car.make}|${car.model}`.toLowerCase();

describe('compareWithClass', () => {
  const rav4 = suv('Toyota', 'RAV4', mpg(30));

  it('counts each rival model line once, however many configurations it has', () => {
    const crv = Array.from({ length: 10 }, () => suv('Honda', 'CR-V', mpg(30)));
    const corpus = [
      rav4,
      ...crv,
      suv('Mazda', 'CX-5', mpg(25)),
      suv('Subaru', 'Forester', mpg(28)),
      suv('Hyundai', 'Tucson', mpg(27)),
    ];
    const result = compareWithClass(rav4, corpus, lineOf);
    expect(result?.className).toBe('Compact SUV');
    expect(result?.models).toBe(4);
    // Per line: 7.8, 9.4, 8.4 and 8.7 L/100 km; ten CR-Vs would have dragged it to 7.8.
    expect(result?.fuel).toEqual({ unit: 'L/100 km', car: 7.8, median: 8.6, models: 4 });
  });

  it('leaves the car’s own model line out of its class', () => {
    const corpus = [
      rav4,
      suv('Toyota', 'RAV4', { ...mpg(12), runningCostCad: 20000 }),
      suv('Honda', 'CR-V', { runningCostCad: 5000 }),
      suv('Mazda', 'CX-5', { runningCostCad: 6000 }),
      suv('Subaru', 'Forester', { runningCostCad: 7000 }),
    ];
    expect(compareWithClass(rav4, corpus, lineOf)?.annualCost).toEqual({
      car: 6000,
      median: 6000,
      models: 3,
    });
  });

  it('compares an electric car’s energy use with electric rivals only', () => {
    const ev = suv('Toyota', 'RAV4', {
      engine: { fuelType: 'electric', horsepower: 200 },
      ...mpg(110),
    });
    const corpus = [ev, suv('Honda', 'CR-V'), suv('Mazda', 'CX-5'), suv('Subaru', 'Forester')];
    const result = compareWithClass(ev, corpus, lineOf);
    expect(result).toBeDefined();
    expect(result?.fuel).toBeUndefined();
  });

  it('draws rivals from a model year either side, and needs three of them', () => {
    const corpus = [
      rav4,
      suv('Honda', 'CR-V', { year: 2023 }),
      suv('Mazda', 'CX-5', { year: 2025 }),
      suv('Subaru', 'Forester', { year: 2026 }),
    ];
    expect(compareWithClass(rav4, corpus, lineOf)).toBeUndefined();
    const result = compareWithClass(rav4, [...corpus, suv('Hyundai', 'Tucson')], lineOf);
    expect(result?.models).toBe(3);
    expect(result?.years).toEqual({ min: 2023, max: 2025 });
  });

  it('says nothing for a car with no class', () => {
    const oddity = suv('Nobody', 'Special', { bodyStyle: 'van' });
    expect(compareWithClass(oddity, [oddity, rav4], lineOf)).toBeUndefined();
  });
});
