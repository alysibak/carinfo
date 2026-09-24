import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { inferEffectiveFuelType, isLikelyMisclassifiedPhev } from '../utils/fuel-type-inference.js';
import { findCar, findEnrichedCar, loadEnrichedCars } from '../__tests__/helpers/loadCars.js';

const CAYENNE_ID = 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8';

/**
 * The label older pipeline runs wrote: EPA's combined fuel string ("Premium
 * Gas or Electricity") read as electric. cars.json now matches EPA (see
 * scripts/reconcile-fuel-types.ts), so the correction rules are exercised by
 * putting that stale label back.
 */
const asStaleElectric = (car: Car): Car => ({
  ...car,
  engine: { ...car.engine, fuelType: 'electric' },
});

describe('fuel-type-inference', () => {
  it('agrees with EPA on every vehicle in the corpus', () => {
    // cars.json carries EPA's classification for all 28k records, so any
    // disagreement here would be a rule overriding the source of truth. Before
    // the reconciliation the source was stale and the rules corrected 426
    // records (after an earlier bug where they also demoted 11 genuine BEVs).
    const overridden = loadEnrichedCars().filter(
      (c) => inferEffectiveFuelType(c) !== c.engine.fuelType,
    );
    expect(overridden.map((c) => `${c.year} ${c.make} ${c.model}`)).toEqual([]);
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
      (c) => c.make === make && c.model === model && c.engine.fuelType === 'plug-in hybrid',
    );
    expect(car, `${make} ${model} should exist in the corpus`).toBeDefined();
    expect(inferEffectiveFuelType(asStaleElectric(car!))).toBe('plug-in hybrid');
  });

  it.each([
    ['i3 with Range Extender', 2019],
    ['i3s with Range Extender', 2021],
    ['i3 (94Ah) with Range Extender', 2018],
  ])('reclassifies the BMW %s (%i), a 0.6 L range extender, as a plug-in hybrid', (model, year) => {
    // Regression: the displacement rule started at 1.0 L and "i3" matched the
    // BEV name rule, so these showed their 31 MPG gas figure as 31 MPGe.
    const car = findEnrichedCar((c) => c.make === 'BMW' && c.model === model && c.year === year);
    expect(car, `${year} BMW ${model} should exist in the corpus`).toBeDefined();
    expect(car!.engine.displacement).toBe(0.6);
    expect(inferEffectiveFuelType(asStaleElectric(car!))).toBe('plug-in hybrid');
  });

  it('keeps natural gas vehicles as natural gas', () => {
    const civic = findEnrichedCar(
      (c) => c.make === 'Honda' && c.year === 2012 && c.engine.fuelType === 'natural gas',
    );
    expect(civic, '2012 Honda Civic Natural Gas should exist in the corpus').toBeDefined();
    expect(inferEffectiveFuelType(civic!)).toBe('natural gas');
  });

  it('reclassifies Cayenne e-Hybrid from electric to plug-in hybrid', () => {
    const cayenne = findCar((c) => c.id === CAYENNE_ID);
    expect(cayenne).toBeDefined();
    expect(cayenne!.engine.fuelType).toBe('plug-in hybrid');
    const stale = asStaleElectric(cayenne!);
    expect(inferEffectiveFuelType(stale)).toBe('plug-in hybrid');
    expect(isLikelyMisclassifiedPhev(stale)).toBe(true);
  });

  it('keeps Tesla Model 3 Long Range as electric', () => {
    const model3 = findCar(
      (c) => c.make === 'Tesla' && c.model.includes('Model 3 Long Range') && c.year === 2022,
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
    const karma = findCar((c) => c.make === 'Karma' && c.model.includes('GS-6') && c.year === 2021);
    expect(karma).toBeDefined();
    expect(karma!.engine.fuelType).toBe('plug-in hybrid');
    const stale = asStaleElectric(karma!);
    expect(inferEffectiveFuelType(stale)).toBe('plug-in hybrid');
    expect(isLikelyMisclassifiedPhev(stale)).toBe(true);
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
