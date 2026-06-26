import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  calculateResaleImpact,
  computeOwnershipEconomics,
  estimateMarketValue,
} from '../utils/ownership-economics.js';
import { normalizeCarRecord } from '../utils/car-normalize.js';
import { findCar, loadRawCars } from '../__tests__/helpers/loadCars.js';

function assertValueBand(
  low: number,
  mid: number,
  high: number,
  expectedLow: number,
  expectedHigh: number,
) {
  expect(low).toBeGreaterThanOrEqual(expectedLow);
  expect(high).toBeLessThanOrEqual(expectedHigh);
  expect(low).toBeLessThanOrEqual(mid);
  expect(mid).toBeLessThanOrEqual(high);
}

function normalized(find: (c: Car) => boolean) {
  const raw = findCar(find);
  expect(raw).toBeDefined();
  return normalizeCarRecord(raw!);
}

describe('vehicle-valuation (Ontario/CAD)', () => {
  it('Corolla 2020 lands in corrected economy-sedan band', () => {
    const car = normalized(
      (c) => c.make === 'Toyota' && c.model === 'Corolla' && c.year === 2020,
    );
    const mv = estimateMarketValue(car);
    assertValueBand(mv.low, mv.mid, mv.high, 22_000, 30_000);
  });

  it('RAV4 2020 gasoline lands in corrected SUV band', () => {
    const car = normalized(
      (c) =>
        c.make === 'Toyota' &&
        c.model === 'RAV4' &&
        c.year === 2020 &&
        c.engine.fuelType === 'gasoline',
    );
    const mv = estimateMarketValue(car);
    assertValueBand(mv.low, mv.mid, mv.high, 28_000, 40_000);
  });

  it('Macan 2023 lands in corrected luxury SUV band', () => {
    const car = normalized(
      (c) => c.make === 'Porsche' && c.model === 'Macan' && c.year === 2023,
    );
    const mv = estimateMarketValue(car);
    assertValueBand(mv.low, mv.mid, mv.high, 64_000, 90_000);
  });

  it('Cayenne e-Hybrid after PHEV correction lands in expected band', () => {
    const car = normalized((c) => c.id === 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8');
    expect(car.engine.fuelType).toBe('plug-in hybrid');
    const mv = estimateMarketValue(car);
    assertValueBand(mv.low, mv.mid, mv.high, 52_000, 72_000);
    expect(mv.batteryHealth).toBeUndefined();
  });

  it('Camry XSE 2018 lands in corrected band with expected annual energy cost', () => {
    const car = normalized((c) => c.id === 'toyota-camry-xse-2018-camry-automatic-s8');
    const mv = estimateMarketValue(car);
    assertValueBand(mv.low, mv.mid, mv.high, 17_000, 24_000);

    const econ = computeOwnershipEconomics(car, []);
    expect(econ.annualCost.energy).toBeGreaterThanOrEqual(2_050);
    expect(econ.annualCost.energy).toBeLessThanOrEqual(2_150);
  });

  it('Model 3 Long Range 2022 BEV retains battery health label', () => {
    const car = normalized(
      (c) =>
        c.make === 'Tesla' &&
        c.model.includes('Model 3 Long Range') &&
        c.year === 2022,
    );
    const mv = estimateMarketValue(car);
    assertValueBand(mv.low, mv.mid, mv.high, 42_000, 60_000);
    expect(mv.batteryHealth?.label).toBeTruthy();
  });

  it('has zero degenerate resale ranges across the full dataset', () => {
    const cars = loadRawCars();
    let degenerate = 0;
    for (const raw of cars) {
      const car = normalizeCarRecord(raw);
      const mv = estimateMarketValue(car);
      const resale = calculateResaleImpact(car, mv);
      const { low, high, mid } = resale.projectedResale5Year;
      if (high - low < 100 && mid < 5_000) degenerate++;
    }
    expect(degenerate).toBe(0);
  });
});
