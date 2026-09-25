import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  applyValuationReliabilityGuard,
  assessMsrpAnchor,
  estimateMarketValue,
  isImplausibleResaleProjection,
  LOW_VOLUME_CONFIDENCE_LABEL,
} from './vehicle-valuation.js';
import { calculateResaleImpact, computeOwnershipEconomics } from './ownership-economics.js';
import { getRegionalAssumptions } from '../config/regional-assumptions.js';
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
  // Dollar accuracy is pinned against observed Canadian prices in
  // valuation-calibration.test.ts. These hand-set bands were retired there:
  // they had been tuned to an over-high model (a 2020 Corolla at $22–30k when
  // listings average $18.6k). What stays here is behaviour, not dollars.

  it('keeps battery health off a plug-in hybrid after the PHEV correction', () => {
    const car = normalized((c) => c.id === 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8');
    expect(car.engine.fuelType).toBe('plug-in hybrid');
    const mv = estimateMarketValue(car);
    // Launched at C$91,700; comparable US listings run US$44–46k in 2026.
    assertValueBand(mv.low, mv.mid, mv.high, 40_000, 70_000);
    expect(mv.batteryHealth).toBeUndefined();
  });

  it('prices a 2018 Camry XSE’s fuel from its EPA economy and the regional pump price', () => {
    const car = normalized((c) => c.id === 'toyota-camry-xse-2018-camry-automatic-s8');
    const econ = computeOwnershipEconomics(car, []);
    const region = getRegionalAssumptions();
    const litresPer100Km = 235.215 / Math.round(car.fuelEconomy.combined!);
    const expected = (region.annualKm / 100) * litresPer100Km * region.gasPriceCadPerL;
    expect(econ.annualCost.energy).toBeCloseTo(expected, -1);
  });

  it('labels battery health on a used BEV (Model 3 Long Range 2022)', () => {
    const car = normalized(
      (c) => c.make === 'Tesla' && c.model.includes('Model 3 Long Range') && c.year === 2022,
    );
    const mv = estimateMarketValue(car);
    expect(mv.low).toBeLessThanOrEqual(mv.mid);
    expect(mv.mid).toBeLessThanOrEqual(mv.high);
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
    const raw = findCar((c) => c.make === 'Karma' && c.model.includes('GS-6') && c.year === 2021);
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
    expect(isImplausibleResaleProjection(beforeMarket, beforeResale.projectedResale5Year)).toBe(
      true,
    );
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
    expect(
      isImplausibleResaleProjection(econ.marketValue, econ.resaleImpact.projectedResale5Year),
    ).toBe(false);
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
    expect(guarded.resale.projectedResale5Year.mid / guarded.market.mid).toBeGreaterThanOrEqual(
      0.05,
    );
  });
});
