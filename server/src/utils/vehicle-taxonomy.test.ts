import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types.js';
import {
  canonicalizeDisplayModel,
  classifyShoppingSegment,
  inferBodyStyle,
} from '../utils/vehicle-taxonomy.js';
import { findCar } from '../__tests__/helpers/loadCars.js';

function minimalCar(overrides: Partial<CarSpecs> & Pick<CarSpecs, 'make' | 'model'>): CarSpecs {
  return {
    id: 'test',
    year: 2020,
    provenance: {},
    engine: { fuelType: 'gasoline' },
    fuelEconomy: { city: 25, highway: 32, combined: 28 },
    transmission: { type: 'automatic' },
    driveType: 'FWD',
    bodyStyle: 'sedan',
    ...overrides,
  };
}

describe('vehicle-taxonomy', () => {
  it('classifies shopping segments from rules', () => {
    const ev = minimalCar({ make: 'Tesla', model: 'Model 3', engine: { fuelType: 'electric' } });
    const display = canonicalizeDisplayModel(ev);
    expect(classifyShoppingSegment(ev, display, 'sedan')).toBe('ev');

    const truck = minimalCar({ make: 'Ford', model: 'F-150', bodyStyle: 'truck' });
    expect(classifyShoppingSegment(truck, truck.model, 'truck')).toBe('truck');

    const camry = findCar((c) => c.make === 'Toyota' && c.model.includes('Camry') && c.year === 2020);
    expect(camry).toBeDefined();
    const camryDisplay = canonicalizeDisplayModel(camry!);
    const camryBody = inferBodyStyle(camry!, camryDisplay);
    expect(classifyShoppingSegment(camry!, camryDisplay, camryBody)).toBe('mainstream');
  });

  it('corrects EPA hatchback mislabels (Golf stored as sedan)', () => {
    const golf = findCar(
      (c) =>
        c.make === 'Volkswagen' &&
        /^golf$/i.test(c.model) &&
        c.bodyStyle === 'sedan',
    );
    expect(golf).toBeDefined();
    const display = canonicalizeDisplayModel(golf!);
    expect(inferBodyStyle(golf!, display)).toBe('hatchback');
  });

  it('disambiguates Golf GTI from base Golf via displacement', () => {
    const gti = minimalCar({
      make: 'Volkswagen',
      model: 'Golf GTI',
      trim: 'golf-gti-automatic-s7',
      engine: { fuelType: 'gasoline', displacement: 2 },
      bodyStyle: 'sedan',
    });
    expect(canonicalizeDisplayModel(gti)).toBe('Golf GTI');

    const base = minimalCar({
      make: 'Volkswagen',
      model: 'Golf GTI',
      trim: 'golf-gti-automatic-s7',
      engine: { fuelType: 'gasoline', displacement: 1.8 },
      bodyStyle: 'sedan',
    });
    expect(canonicalizeDisplayModel(base)).toBe('Golf');
  });
});
