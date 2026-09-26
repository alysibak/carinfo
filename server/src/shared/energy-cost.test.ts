import { describe, expect, it } from 'vitest';
import { getRegionalAssumptions } from '../config/regional-assumptions.js';
import type { Car } from '../types/car.types.js';
import { estimateAnnualEnergyCost } from './energy-cost.js';

const ONTARIO = getRegionalAssumptions('ontario');

function car(overrides: Partial<Car>): Car {
  return {
    id: 'x',
    make: 'Honda',
    model: 'Civic',
    year: 2012,
    provenance: {},
    engine: { fuelType: 'gasoline' },
    fuelEconomy: { city: 27, highway: 38, combined: 31 },
    epa: { annualFuelCost: 1400 },
    transmission: { type: 'automatic' },
    driveType: 'FWD',
    bodyStyle: 'sedan',
    ...overrides,
  };
}

describe('estimateAnnualEnergyCost', () => {
  it('prices gasoline from the regional pump price', () => {
    const estimate = estimateAnnualEnergyCost(car({}), {}, ONTARIO);
    expect(estimate?.basis).toBe('gasoline');
    // The pump price is an input, so raising it raises the cost.
    const pricier = estimateAnnualEnergyCost(
      car({}),
      { gasPriceCadPerL: ONTARIO.gasPriceCadPerL * 2 },
      ONTARIO,
    );
    expect(pricier!.annualCad).toBeGreaterThan(estimate!.annualCad * 1.9);
  });

  it('prices diesel at the diesel price, which the calculator can override', () => {
    // Regression: diesel cars were priced at the gasoline pump price.
    const tdi = car({ engine: { fuelType: 'diesel' } });
    const estimate = estimateAnnualEnergyCost(tdi, {}, ONTARIO);
    expect(estimate?.basis).toBe('diesel');
    const asGasoline = estimateAnnualEnergyCost(car({}), {}, ONTARIO)!;
    expect(estimate!.annualCad / asGasoline.annualCad).toBeCloseTo(
      ONTARIO.dieselPriceCadPerL / ONTARIO.gasPriceCadPerL,
      2,
    );
    // The gas price does not move it; the diesel price does.
    expect(estimateAnnualEnergyCost(tdi, { gasPriceCadPerL: 9 }, ONTARIO)?.annualCad).toBe(
      estimate?.annualCad,
    );
    expect(
      estimateAnnualEnergyCost(
        tdi,
        { dieselPriceCadPerL: ONTARIO.dieselPriceCadPerL * 2 },
        ONTARIO,
      )!.annualCad,
    ).toBeGreaterThan(estimate!.annualCad * 1.9);
  });

  it('prices natural gas from EPA’s own figure, not the gasoline price', () => {
    // Regression: the Civic Natural Gas was labeled gasoline, so its per-GGE
    // economy was priced at the gasoline pump price.
    const cng = car({ engine: { fuelType: 'natural gas' } });
    const estimate = estimateAnnualEnergyCost(cng, {}, ONTARIO);
    expect(estimate?.basis).toBe('epa-annual-cost');
    expect(
      estimateAnnualEnergyCost(cng, { gasPriceCadPerL: ONTARIO.gasPriceCadPerL * 2 }, ONTARIO)
        ?.annualCad,
    ).toBe(estimate?.annualCad);
  });

  it('prices hydrogen where a pump price is posted, and nowhere else', () => {
    // EPA publishes no fuel cost for fuel-cell cars (0 in the data), and its
    // MPGe for them is miles per kilogram.
    const mirai = car({
      make: 'Toyota',
      model: 'Mirai',
      engine: { fuelType: 'hydrogen' },
      fuelEconomy: { city: 76, highway: 71, combined: 74 },
      epa: { annualFuelCost: 0 },
    });
    const bc = getRegionalAssumptions('british-columbia');
    const estimate = estimateAnnualEnergyCost(mirai, {}, bc);
    expect(estimate?.basis).toBe('hydrogen');
    const kg = bc.annualKm / 1.609344 / 74;
    expect(estimate?.annualCad).toBe(Math.round(kg * bc.hydrogenCadPerKg!));
    // Ontario posts no price: unknown, not free.
    expect(estimateAnnualEnergyCost(mirai, {}, ONTARIO)).toBeNull();
  });

  it('says "unknown" for natural gas without an EPA cost rather than guessing', () => {
    const cng = car({ engine: { fuelType: 'natural gas' }, epa: {} });
    expect(estimateAnnualEnergyCost(cng, {}, ONTARIO)).toBeNull();
  });
});
