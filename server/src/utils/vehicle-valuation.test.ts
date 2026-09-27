import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  applyValuationReliabilityGuard,
  assessMsrpAnchor,
  estimateMarketValue,
  estimateNewVehicleMsrp,
  isImplausibleResaleProjection,
  LOW_VOLUME_CONFIDENCE_LABEL,
} from './vehicle-valuation.js';
import { computeOwnershipEconomics } from './ownership-economics.js';
import { getRegionalAssumptions } from '../config/regional-assumptions.js';
import { inferEffectiveFuelType } from './fuel-type-inference.js';
import { normalizeCarRecord } from '../utils/car-normalize.js';
import { findCar, loadRawCars } from '../__tests__/helpers/loadCars.js';
import { getAllCars } from '../services/car.service.js';

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

  it('prices EV trims apart instead of one price per line', () => {
    const mid = (model: string, year: number, make = 'Ford') =>
      estimateMarketValue(
        normalized((c) => c.make === make && c.model === model && c.year === year),
      ).mid;
    expect(mid('Mustang Mach-E RWD', 2021)).toBeLessThan(mid('Mustang Mach-E AWD', 2021));
    expect(mid('Mustang Mach-E AWD', 2021)).toBeLessThan(mid('Mustang Mach-E GT', 2021));
    expect(mid('Model 3 Standard Range Plus', 2019, 'Tesla')).toBeLessThan(
      mid('Model 3 Long Range AWD', 2019, 'Tesla'),
    );
    expect(mid('Taycan 4S Perf Battery', 2021, 'Porsche')).toBeLessThan(
      mid('Taycan Turbo S', 2021, 'Porsche') / 1.5,
    );
  });

  it('discounts early short-range EVs against long-range ones of the same age', () => {
    // Rated range comes from the EPA enrichment the runtime database merges in.
    const find = (make: string, model: string) =>
      getAllCars().find((c) => c.make === make && c.model === model && c.year === 2017)!;
    const leaf = estimateMarketValue(find('Nissan', 'Leaf'));
    const bolt = estimateMarketValue(find('Chevrolet', 'Bolt EV'));
    expect(leaf.batteryHealth).toBeDefined();
    expect(leaf.retainedFraction).toBeLessThan(bolt.retainedFraction * 0.85);
  });

  it('keeps battery wear out of the EV midpoint and puts it in the condition range', () => {
    const car = normalized((c) => c.make === 'Nissan' && c.model === 'Leaf' && c.year === 2015);
    const mv = estimateMarketValue(car);
    expect(Math.abs(mv.mid - mv.msrpAnchor * mv.retainedFraction)).toBeLessThan(250);
    const [poor, average, excellent] = mv.conditionBands!;
    expect(average.low).toBeLessThan(mv.mid);
    expect(average.high).toBeGreaterThan(mv.mid);
    expect(poor.high).toBeLessThan(mv.mid);
    expect(excellent.low).toBeGreaterThan(mv.mid);
    // A worn pack is likelier on an early Leaf, so its range is wider than a
    // new EV's.
    const fresh = estimateMarketValue(
      normalized((c) => c.make === 'Tesla' && c.model === 'Model 3 RWD' && c.year === 2024),
    );
    expect((mv.high - mv.low) / mv.mid).toBeGreaterThan((fresh.high - fresh.low) / fresh.mid);
    // Bands are ordered at both ends, for a worn pack and a new one.
    for (const bands of [mv.conditionBands!, fresh.conditionBands!]) {
      const [p, a, e] = bands;
      expect(p.low).toBeLessThan(a.low);
      expect(a.low).toBeLessThan(e.low);
      expect(p.high).toBeLessThan(a.high);
      expect(a.high).toBeLessThan(e.high);
    }
  });

  it('lets make reputation show with age, not on a new car', () => {
    const retained = (make: string, model: RegExp, year: number) =>
      estimateMarketValue(
        getAllCars().find(
          (c) =>
            c.make === make &&
            model.test(c.model) &&
            c.year === year &&
            (c.engine.fuelType === 'gasoline' || c.engine.fuelType === 'hybrid'),
        )!,
      ).retainedFraction;
    // New: both keep the same share of their sticker.
    expect(retained('Ford', /^Escape/, 2026)).toBe(retained('Toyota', /^RAV4$/, 2026));
    // Seven years on, the Toyota keeps far more.
    expect(retained('Toyota', /^RAV4$/, 2019)).toBeGreaterThan(
      retained('Ford', /^Escape/, 2019) * 1.3,
    );
  });

  it('prices exotics by line and keeps supercars off the exotic curve', () => {
    const car = (make: string, model: RegExp, year: number) =>
      getAllCars().find((c) => c.make === make && model.test(c.model) && c.year === year)!;
    // EPA files the GT-R as a subcompact; it used to take a $22,000 anchor
    // and come out at $13,000. A 2017 lists around US$80,000.
    const gtr = car('Nissan', /^GT-R$/, 2017);
    expect(estimateNewVehicleMsrp(gtr)).toBeGreaterThan(100_000);
    expect(estimateMarketValue(gtr).mid).toBeGreaterThan(75_000);
    // A marque's price already covers its V12; the big-engine uplift made a
    // Ghost $512,000.
    expect(estimateNewVehicleMsrp(car('Rolls-Royce', /^Ghost$/, 2017))).toBe(360_000);
    // Nine years on, a Huracán keeps far more of its sticker than a Bentayga,
    // and a Ghibli (about a quarter of its sticker at eight years) far less.
    const kept = (make: string, model: RegExp, year: number) =>
      estimateMarketValue(car(make, model, year)).retainedFraction;
    expect(kept('Lamborghini', /^Huracan$/, 2017)).toBeGreaterThan(0.7);
    expect(kept('Bentley', /^Bentayga$/, 2017)).toBeLessThan(0.45);
    expect(kept('Maserati', /^Ghibli/, 2018)).toBeLessThan(0.35);
  });

  it('prices flagships at their sticker and lets them lose it faster with age', () => {
    const car = (make: string, model: RegExp, year: number) =>
      getAllCars().find(
        (c) =>
          c.make === make &&
          model.test(c.model) &&
          c.year === year &&
          c.engine.fuelType !== 'plug-in hybrid',
      )!;
    // The size-class table had a Maybach S 580 and a 760i at $52,700.
    expect(estimateNewVehicleMsrp(car('Mercedes-Benz', /^S580 4matic Maybach$/, 2021))).toBe(
      200_000,
    );
    expect(estimateNewVehicleMsrp(car('BMW', /^760i/, 2023))).toBe(120_000);
    // New, a flagship keeps the luxury curve; by eight years it has lost far
    // more than a C-Class (a 2018 S 560 ~US$37,200 on Cars.com).
    const kept = (make: string, model: RegExp, year: number) =>
      estimateMarketValue(car(make, model, year)).retainedFraction;
    expect(kept('Mercedes-Benz', /^S580 4matic$/, 2026)).toBeGreaterThan(0.9);
    // EPA's weight classes gave the GX and LX one price.
    expect(estimateNewVehicleMsrp(car('Lexus', /^GX 460$/, 2019))).toBe(55_000);
    expect(estimateNewVehicleMsrp(car('Lexus', /^LX 570$/, 2019))).toBe(95_000);
    // A 2019 Q7 lists around US$20,400 (about $24,500 CAD); it read $37,000.
    expect(estimateMarketValue(car('Audi', /^Q7$/, 2019)).mid).toBeLessThan(30_000);
    expect(kept('Mercedes-Benz', /^S560 4matic$/, 2018)).toBeLessThan(
      kept('Mercedes-Benz', /^C300 4matic$/, 2018) * 0.65,
    );
  });

  it('prices enthusiast cars and MINIs by trim, not by size class', () => {
    const car = (make: string, model: RegExp, year: number) =>
      getAllCars().find((c) => c.make === make && model.test(c.model) && c.year === year)!;
    // All three used to take a base car's anchor ($22,000 to $27,000).
    expect(estimateNewVehicleMsrp(car('Toyota', /^GR Corolla$/, 2023))).toBe(42_000);
    expect(estimateNewVehicleMsrp(car('MINI', /^John Cooper Works Hardtop$/, 2020))).toBe(40_000);
    expect(estimateNewVehicleMsrp(car('MINI', /^Cooper Hardtop 2 door$/, 2020))).toBe(28_500);
    // A 2017 Focus RS lists around US$29,300 (Cars.com); it was valued at $11,750.
    expect(estimateMarketValue(car('Ford', /^Focus RS/, 2017)).mid).toBeGreaterThan(28_000);
    // A 2015 i8 lists around US$48,400 and a 2019 coupe US$68,300 (Cars.com),
    // $58,000 and $82,000 at the 1.2 Canada/US ratio. Anchored as a
    // three-cylinder coupe, a 2014 read $15,750.
    const i8 = (year: number) => estimateMarketValue(car('BMW', /^i8$/i, year)).mid;
    expect(i8(2015)).toBeGreaterThan(58_000 * 0.8);
    expect(i8(2015)).toBeLessThan(58_000 * 1.2);
    expect(estimateMarketValue(car('BMW', /^i8 coupe$/i, 2019)).mid).toBeGreaterThan(82_000 * 0.8);
  });

  it('depreciates an everyday coupe like its sedan, a sports car on its own curve', () => {
    const car = (make: string, model: RegExp, year: number) =>
      getAllCars().find((c) => c.make === make && model.test(c.model) && c.year === year)!;
    // On the performance curve a 2010 Cobalt Coupe read $9,500 and the sedan $6,250.
    const coupe = estimateMarketValue(car('Chevrolet', /^Cobalt Coupe$/, 2010)).mid;
    const sedan = estimateMarketValue(car('Chevrolet', /^Cobalt Sedan$/, 2010)).mid;
    expect(coupe).toBeLessThanOrEqual(sedan * 1.1);
    // The Cobalt SS, a sport compact, keeps the performance curve.
    const ss = estimateMarketValue(car('Chevrolet', /^Cobalt SS Coupe$/, 2010)).mid;
    expect(ss).toBeGreaterThan(coupe);
  });

  it('prices city cars EPA files as two-seaters as city cars', () => {
    const car = (make: string, model: RegExp, year: number) =>
      getAllCars().find((c) => c.make === make && model.test(c.model) && c.year === year)!;
    // They took the class's sports-car anchor: a 2017 smart fortwo read
    // $28,000 and a 2016 CR-Z $28,500. KBB puts a 2017 fortwo at US$7,825-
    // 9,725; a 2016 CR-Z averages about US$13,500 (Cars.com).
    // A city car on the economy curve, within a third of KBB's figure.
    const fortwo = estimateMarketValue(car('smart', /^fortwo coupe$/, 2017)).mid;
    expect(fortwo).toBeGreaterThan(9_725 * 1.2 * 0.65);
    expect(fortwo).toBeLessThan(9_725 * 1.2 * 1.2);
    const crz = estimateMarketValue(car('Honda', /^CR-Z$/, 2016)).mid;
    expect(crz).toBeGreaterThan(13_500 * 1.2 * 0.8);
    expect(crz).toBeLessThan(13_500 * 1.2 * 1.25);
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
    // Misread as a battery EV, its 61-mile electric range made it an early
    // short-range EV and priced it below the plug-in hybrid it is. (The old
    // per-tier EV curve also collapsed its resale to under $1,000; the guard
    // for that is tested directly below.)
    const beforeMarket = estimateMarketValue(bevSim);
    expect(beforeMarket.mid).toBeLessThan(15_000);
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
