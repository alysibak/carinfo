import { describe, expect, it } from 'vitest';
import { estimateAnnualEnergyCost } from '@carinfo/shared/energy-cost';
import { getRegionalAssumptions } from '@carinfo/config/regional-assumptions';
import type { CarSpecs, OwnershipEconomics } from '../types/car.types';
import { annualRetention, computeTco, defaultTcoInputs, monthlyPayment } from './tco';

const REGION = getRegionalAssumptions();
const regionInputs = 'ontario' as const;

function car(overrides: Partial<CarSpecs> = {}): CarSpecs {
  return {
    id: 'test-car',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    provenance: {},
    engine: { fuelType: 'gasoline', displacement: 2.5, cylinders: 4 },
    fuelEconomy: { city: 28, highway: 39, combined: 32 },
    transmission: { type: 'automatic' },
    driveType: 'FWD',
    bodyStyle: 'sedan',
    ...overrides,
  };
}

function ownership(overrides: Partial<OwnershipEconomics> = {}): OwnershipEconomics {
  return {
    marketValue: { low: 26000, high: 32000, mid: 29000, confidence: 'medium', confidenceLabel: '' },
    annualCost: {
      energy: 1500,
      insurance: 2100,
      maintenance: 900,
      tires: 250,
      registration: 120,
      total: 4870,
      totalLow: 4383,
      totalHigh: 5454,
    },
    resaleImpact: {
      currentValue: { low: 26000, high: 32000, mid: 29000 },
      projectedResale5Year: { low: 15000, high: 20000, mid: 17400 },
      estimatedLoss5Year: { low: 10000, high: 13000, mid: 11600 },
      note: '',
    },
    derivedComparison: null,
    tco5Year: null,
    assumptions: {} as OwnershipEconomics['assumptions'],
    warnings: [],
    practicalityNote: '',
    ...overrides,
  };
}

describe('computeTco', () => {
  it('reproduces the dossier 5-year estimate at default inputs', () => {
    // The dossier computes: 5-year value loss + 5 × annual running costs, with
    // energy from the shared engine. The calculator must land on the same
    // number before the user changes anything.
    const c = car();
    const o = ownership();
    const result = computeTco(c, defaultTcoInputs(c, o, regionInputs), o);

    const energy = estimateAnnualEnergyCost(c)!.annualCad;
    const expected = o.resaleImpact.estimatedLoss5Year.mid + 5 * (energy + 2100 + 900 + 250 + 120);
    expect(result.total).toBe(expected);
    expect(result.resaleValue).toBe(o.resaleImpact.projectedResale5Year.mid);
    expect(result.depreciationFromDossier).toBe(true);
  });

  it('keeps a custom horizon on the same depreciation curve', () => {
    const o = ownership();
    const { rate } = annualRetention(o);
    const result = computeTco(
      car(),
      { ...defaultTcoInputs(car(), o, regionInputs), yearsOwned: 3 },
      o,
    );
    expect(result.resaleValue).toBe(Math.round(29000 * Math.pow(rate, 3)));
    // Keeping it longer can only lose more value.
    const longer = computeTco(
      car(),
      { ...defaultTcoInputs(car(), o, regionInputs), yearsOwned: 8 },
      o,
    );
    expect(longer.depreciation).toBeGreaterThan(result.depreciation);
  });

  it('prices hydrogen from EPA cost, independent of the gas price', () => {
    // Regression: the old client cost function had no hydrogen branch, so a
    // fuel-cell car was priced as gasoline using its MPGe.
    const mirai = car({
      make: 'Toyota',
      model: 'Mirai',
      engine: { fuelType: 'hydrogen' },
      fuelEconomy: { city: 76, highway: 71, combined: 74 },
      epa: { annualFuelCost: 4800 } as CarSpecs['epa'],
    });
    const inputs = defaultTcoInputs(mirai, ownership(), regionInputs);
    const cheapGas = computeTco(mirai, { ...inputs, gasPriceCadPerL: 0.5 });
    const dearGas = computeTco(mirai, { ...inputs, gasPriceCadPerL: 3.0 });

    expect(cheapGas.energy?.basis).toBe('epa-annual-cost');
    expect(cheapGas.energy?.annual).toBe(dearGas.energy?.annual);
    // Hydrogen at EPA's cost is far above what gasoline math on 74 MPGe gives.
    const gasolineEquivalent = (REGION.annualKm / 100) * (235.215 / 74) * REGION.gasPriceCadPerL;
    expect(cheapGas.energy!.annual).toBeGreaterThan(gasolineEquivalent * 2);
  });

  it('reports energy as unknown instead of inventing a figure', () => {
    // Regression: no MPG used to yield "$0/yr"; EVs without efficiency data
    // got a hardcoded 20 kWh/100 km.
    const noData = car({ fuelEconomy: { city: 0, highway: 0, combined: 0 } });
    const result = computeTco(
      noData,
      defaultTcoInputs(noData, ownership(), regionInputs),
      ownership(),
    );
    expect(result.energy).toBeNull();
  });

  it('responds to driving distance for fuel, and only for fuel', () => {
    const o = ownership();
    const base = defaultTcoInputs(car(), o, regionInputs);
    const short = computeTco(car(), { ...base, annualKm: 10_000 }, o);
    const long = computeTco(car(), { ...base, annualKm: 30_000 }, o);
    expect(long.energy!.annual).toBeGreaterThan(short.energy!.annual * 2.5);
    expect(long.insurance).toBe(short.insurance);
  });

  it('adds financing interest only when financed', () => {
    const o = ownership();
    const cash = computeTco(car(), defaultTcoInputs(car(), o, regionInputs), o);
    const loan = computeTco(
      car(),
      { ...defaultTcoInputs(car(), o, regionInputs), financed: true },
      o,
    );
    expect(cash.interest).toBe(0);
    expect(loan.interest).toBeGreaterThan(0);
    expect(loan.total - cash.total).toBe(loan.interest);
  });

  it('falls back to a labelled generic curve when the dossier is unavailable', () => {
    const result = computeTco(car(), {
      ...defaultTcoInputs(car(), null, regionInputs),
      purchasePrice: 30000,
    });
    expect(result.depreciationFromDossier).toBe(false);
    expect(result.resaleValue).toBe(Math.round(30000 * Math.pow(0.85, 5)));
  });
});

describe('monthlyPayment', () => {
  it('handles 0% financing without dividing by zero', () => {
    // Regression: the old formula returned NaN at a 0% rate.
    expect(monthlyPayment(24000, 0, 48)).toBe(500);
  });

  it('matches the standard amortization formula', () => {
    // $30,000 at 6% over 60 months is a textbook $579.98.
    expect(monthlyPayment(30000, 0.06, 60)).toBeCloseTo(579.98, 2);
  });

  it('is zero when nothing is borrowed', () => {
    expect(monthlyPayment(0, 0.05, 60)).toBe(0);
  });
});

describe('regional defaults', () => {
  it('starts from the selected region, not always Ontario', () => {
    const on = defaultTcoInputs(car(), ownership(), 'ontario');
    const bc = defaultTcoInputs(car(), ownership(), 'british-columbia');
    const bcAssumptions = getRegionalAssumptions('british-columbia');
    expect(bc.gasPriceCadPerL).toBe(bcAssumptions.gasPriceCadPerL);
    expect(bc.electricityRateCadPerKwh).toBe(bcAssumptions.electricityRateCadPerKwh);
    expect(bc.region).toBe('british-columbia');
    expect(on.region).toBe('ontario');
  });
});
