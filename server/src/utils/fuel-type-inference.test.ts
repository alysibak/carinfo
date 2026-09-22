import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  inferEffectiveFuelType,
  isLikelyMisclassifiedPhev,
} from '../utils/fuel-type-inference.js';
import { findCar, findEnrichedCar, loadEnrichedCars } from '../__tests__/helpers/loadCars.js';

const CAYENNE_ID = 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8';

describe('fuel-type-inference', () => {
  it('corrects exactly 426 enriched electric records to plug-in hybrid (includes series/EREV hybrids with gas displacement)', () => {
    // Was pinned at 437 against raw records. That count included 11 genuine
    // BEVs — Honda Clarity EV and Volvo XC40/C40 Recharge — that the name rules
    // wrongly demoted, and it measured raw records although inference runs on
    // enriched ones (enrichment supplies the range the rules depend on).
    const misclassified = loadEnrichedCars().filter(
      (c) => c.engine.fuelType === 'electric' && inferEffectiveFuelType(c) === 'plug-in hybrid',
    );
    expect(misclassified).toHaveLength(426);
  });

  it('never classifies a vehicle with no combustion engine as a plug-in hybrid', () => {
    // A PHEV has an engine by definition. This invariant is what the 11
    // demoted BEVs violated.
    const engineless = loadEnrichedCars().filter(
      (c) =>
        c.engine.fuelType === 'electric' &&
        !(c.engine.displacement && c.engine.displacement > 0) &&
        (c.epa?.rangeMiles ?? 0) >= 50,
    );
    expect(engineless.length).toBeGreaterThan(0);
    for (const car of engineless) {
      expect(inferEffectiveFuelType(car), `${car.year} ${car.make} ${car.model}`).toBe('electric');
    }
  });

  it.each([
    ['Honda', 'Clarity EV'],
    ['Volvo', 'XC40 Recharge'],
    ['Volvo', 'XC40 Recharge twin'],
    ['Volvo', 'C40 Recharge'],
    ['Volvo', 'C40 Recharge twin'],
  ])('keeps the %s %s as electric despite a PHEV-associated name', (make, model) => {
    const car = findEnrichedCar((c) => c.make === make && c.model === model);
    expect(car, `${make} ${model} should exist in the corpus`).toBeDefined();
    expect(inferEffectiveFuelType(car!)).toBe('electric');
  });

  it.each([
    ['Honda', 'Clarity Plug-in Hybrid'],
    ['Volvo', 'XC60 T8 AWD Recharge'],
    ['Volvo', 'XC90 T8 AWD Recharge'],
  ])('still reclassifies the %s %s, which shares that name and has an engine', (make, model) => {
    const car = findEnrichedCar(
      (c) => c.make === make && c.model === model && c.engine.fuelType === 'electric',
    );
    expect(car, `${make} ${model} should exist in the corpus`).toBeDefined();
    expect(inferEffectiveFuelType(car!)).toBe('plug-in hybrid');
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

  it('reclassifies Karma GS-6 series hybrid from electric to plug-in hybrid', () => {
    const karma = findCar(
      (c) => c.make === 'Karma' && c.model.includes('GS-6') && c.year === 2021,
    );
    expect(karma).toBeDefined();
    expect(karma!.engine.fuelType).toBe('electric');
    expect(inferEffectiveFuelType(karma!)).toBe('plug-in hybrid');
    expect(isLikelyMisclassifiedPhev(karma!)).toBe(true);
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
