import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  inferEffectiveFuelType,
  isLikelyMisclassifiedPhev,
} from '../utils/fuel-type-inference.js';
import { findCar, loadRawCars } from '../__tests__/helpers/loadCars.js';

const CAYENNE_ID = 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8';

describe('fuel-type-inference', () => {
  it('corrects exactly 419 raw electric records to plug-in hybrid', () => {
    const cars = loadRawCars();
    const misclassified = cars.filter(
      (c) => c.engine.fuelType === 'electric' && inferEffectiveFuelType(c) === 'plug-in hybrid',
    );
    expect(misclassified).toHaveLength(419);
  });

  it('reclassifies Cayenne e-Hybrid from electric to plug-in hybrid', () => {
    const cayenne = findCar((c) => c.id === CAYENNE_ID);
    expect(cayenne).toBeDefined();
    expect(cayenne!.engine.fuelType).toBe('electric');
    expect(inferEffectiveFuelType(cayenne!)).toBe('plug-in hybrid');
    expect(isLikelyMisclassifiedPhev(cayenne!)).toBe(true);
  });

  it('keeps Tesla Model 3 Long Range as electric', () => {
    const model3 = findCar(
      (c) =>
        c.make === 'Tesla' &&
        c.model.includes('Model 3 Long Range') &&
        c.year === 2022,
    );
    expect(model3).toBeDefined();
    expect(inferEffectiveFuelType(model3!)).toBe('electric');
    expect(isLikelyMisclassifiedPhev(model3!)).toBe(false);
  });

  it('flags misclassification only when stored type is electric', () => {
    const synthetic: Car = {
      id: 'test-phev-named',
      make: 'Toyota',
      model: 'Prius Prime',
      year: 2020,
      provenance: {},
      engine: { fuelType: 'electric' },
      fuelEconomy: { city: 0, highway: 0, combined: 0 },
      transmission: { type: 'automatic' },
      driveType: 'FWD',
      bodyStyle: 'sedan',
    };
    expect(inferEffectiveFuelType(synthetic)).toBe('plug-in hybrid');
    expect(isLikelyMisclassifiedPhev(synthetic)).toBe(true);

    const alreadyPhev: Car = { ...synthetic, engine: { fuelType: 'plug-in hybrid' } };
    expect(isLikelyMisclassifiedPhev(alreadyPhev)).toBe(false);
  });

  it('short-range + displacement signature drives PHEV correction', () => {
    const borderline: Car = {
      id: 'test-borderline-phev',
      make: 'BMW',
      model: 'X5',
      year: 2021,
      trim: 'xdrive45e',
      provenance: {},
      engine: { fuelType: 'electric', displacement: 3 },
      fuelEconomy: { city: 0, highway: 0, combined: 0 },
      epa: { rangeMiles: 30 },
      transmission: { type: 'automatic' },
      driveType: 'AWD',
      bodyStyle: 'suv',
    };
    expect(inferEffectiveFuelType(borderline)).toBe('plug-in hybrid');
  });
});
