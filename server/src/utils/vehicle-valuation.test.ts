import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  applyValuationReliabilityGuard,
  assessMsrpAnchor,
  estimateMarketValue,
  isImplausibleResaleProjection,
  LOW_VOLUME_CONFIDENCE_LABEL,
} from './vehicle-valuation.js';
import {
  calculateResaleImpact,
  computeOwnershipEconomics,
} from './ownership-economics.js';
import { inferEffectiveFuelType } from './fuel-type-inference.js';
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
      const econ = computeOwnershipEconomics(car, []);
      const { low, high, mid } = econ.resaleImpact.projectedResale5Year;
      if (high - low < 100 && mid < 5_000) degenerate++;
    }
    expect(degenerate).toBe(0);
  });

  it('flags low-volume Karma GS-6 with honest low confidence and plausible resale band', () => {
    const raw = findCar(
      (c) => c.make === 'Karma' && c.model.includes('GS-6') && c.year === 2021,
    );
    expect(raw).toBeDefined();
    const car = normalized(
      (c) => c.make === 'Karma' && c.model.includes('GS-6') && c.year === 2021,
    );

    const bevSim: Car = {
      ...raw!,
      engine: {
        fuelType: 'electric',
        configuration: raw!.engine.configuration,
      },
    };
    const beforeMarket = estimateMarketValue(bevSim);
    const beforeResale = calculateResaleImpact(bevSim, beforeMarket);
    expect(beforeMarket.mid).toBeLessThan(15_000);
    expect(isImplausibleResaleProjection(beforeMarket, beforeResale.projectedResale5Year)).toBe(true);
    expect(beforeResale.projectedResale5Year.high).toBeLessThan(1_000);
    expect(inferEffectiveFuelType(car)).toBe('plug-in hybrid');

    const anchor = assessMsrpAnchor(car);
    expect(anchor.confidence).toBe('low');

    const econ = computeOwnershipEconomics(car, []);
    expect(econ.marketValue.confidence).toBe('low');
    expect(econ.marketValue.confidenceLabel).toBe(LOW_VOLUME_CONFIDENCE_LABEL);
    expect(econ.marketValue.mid).toBeGreaterThan(beforeMarket.mid);

    const { mid: resaleMid, high: resaleHigh } = econ.resaleImpact.projectedResale5Year;
    expect(resaleHigh).toBeGreaterThanOrEqual(500);
    expect(isImplausibleResaleProjection(econ.marketValue, econ.resaleImpact.projectedResale5Year)).toBe(
      false,
    );
    expect(resaleMid).toBeGreaterThanOrEqual(econ.marketValue.mid * 0.05);
  });

  it('applyValuationReliabilityGuard widens absurd resale bands', () => {
    const market = {
      low: 10_000,
      high: 14_000,
      mid: 12_000,
      confidence: 'medium' as const,
      confidenceLabel: 'Ontario-baseline model estimate, not a live listing quote',
      msrpAnchor: 50_000,
      retainedFraction: 0.3,
    };
    const resale = {
      currentValue: { low: 10_000, high: 14_000, mid: 12_000 },
      projectedResale5Year: { low: 93, high: 493, mid: 293 },
      estimatedLoss5Year: { low: 10_000, mid: 11_500, high: 12_000 },
      note: 'Depreciation is realized when you sell.',
    };
    expect(isImplausibleResaleProjection(market, resale.projectedResale5Year)).toBe(true);

    const guarded = applyValuationReliabilityGuard(market, resale);
    expect(guarded.market.confidence).toBe('low');
    expect(guarded.market.confidenceLabel).toBe(LOW_VOLUME_CONFIDENCE_LABEL);
    expect(guarded.resale.projectedResale5Year.high).toBeGreaterThanOrEqual(500);
    expect(
      guarded.resale.projectedResale5Year.mid / guarded.market.mid,
    ).toBeGreaterThanOrEqual(0.05);
  });
});
