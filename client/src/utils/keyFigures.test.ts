import { describe, expect, it } from 'vitest';
import type { CarDashboard } from '../types/car.types';
import { buildKeyFigures, buildSpecLine, typicalOf } from './keyFigures';
import { formatMoneyRange } from './money';
import { sparseDashboard, trustDashboard } from '../test/fixtures';

const withClass = (overrides: Partial<NonNullable<CarDashboard['classComparison']>>) => ({
  ...trustDashboard,
  classComparison: {
    className: 'Midsize car',
    models: 12,
    years: { min: 2020, max: 2022 },
    ...overrides,
  },
});

const byId = (dashboard: CarDashboard, id: string) =>
  buildKeyFigures(dashboard).find((f) => f.id === id);

describe('buildKeyFigures', () => {
  it('leads with what EPA and NHTSA recorded, not with estimates', () => {
    const ids = buildKeyFigures(trustDashboard).map((f) => f.id);
    expect(ids).toEqual(['fuel', 'safety', 'power', 'engine']);
    expect(ids).not.toContain('value');
    expect(ids).not.toContain('cost');
  });

  it('gives fuel use in L/100 km from EPA, with the EPA mpg beneath', () => {
    expect(byId(trustDashboard, 'fuel')).toMatchObject({
      value: '7.1',
      unit: 'L/100 km',
      detail: '33 mpg combined',
      source: 'epa',
    });
  });

  it('sets fuel use against the class, from the same EPA records', () => {
    const better = withClass({ fuel: { unit: 'L/100 km', car: 7.1, median: 8.4, models: 12 } });
    expect(byId(better, 'fuel')?.comparison).toEqual({
      text: '1.3 L/100 km less than a typical midsize car',
      tone: 'better',
    });
    const worse = withClass({ fuel: { unit: 'L/100 km', car: 9.5, median: 8.4, models: 12 } });
    expect(byId(worse, 'fuel')?.comparison?.tone).toBe('worse');
  });

  it('states power against the class as a fact, not a verdict', () => {
    const dashboard = withClass({ horsepower: { car: 203, median: 180, models: 12 } });
    expect(byId(dashboard, 'power')?.comparison).toEqual({
      text: '23 hp more than a typical midsize car',
      tone: 'neutral',
    });
  });

  it('marks where the power figure comes from', () => {
    // The fixture's horsepower carries estimated provenance.
    expect(byId(trustDashboard, 'power')).toMatchObject({
      value: '203',
      source: 'estimated',
    });
  });

  it('says plainly when NHTSA has not rated the car', () => {
    expect(byId(sparseDashboard, 'safety')).toMatchObject({ value: 'Not rated', missing: true });
  });

  it("says a plug-in hybrid's fuel use is its gas-mode figure", () => {
    const phev: CarDashboard = {
      ...trustDashboard,
      car: {
        ...trustDashboard.car,
        engine: { fuelType: 'plug-in hybrid', horsepower: 248 },
        fuelEconomy: { city: 25, highway: 26, combined: 26 },
      },
    };
    expect(byId(phev, 'fuel')).toMatchObject({
      label: 'Fuel use',
      value: '9.0',
      detail: 'In gas mode, 26 mpg combined',
    });
  });

  it('gives an EV its EPA range in km and its energy use', () => {
    const ev: CarDashboard = {
      ...trustDashboard,
      car: {
        ...trustDashboard.car,
        engine: { fuelType: 'electric', horsepower: 300 },
        fuelEconomy: { city: 130, highway: 110, combined: 120 },
      },
      evCharge: { rangeMiles: 330, kWhPer100Mi: 28 },
    };
    const figures = buildKeyFigures(ev);
    expect(figures.map((f) => f.id)).toEqual(['range', 'energy', 'safety', 'power']);
    expect(figures.find((f) => f.id === 'range')).toMatchObject({
      value: '531',
      unit: 'km',
      source: 'epa',
    });
    expect(figures.find((f) => f.id === 'energy')).toMatchObject({
      value: '17.4',
      unit: 'kWh/100 km',
    });
  });
});

describe('buildSpecLine', () => {
  it('lists the gearbox and drive, and leaves a predicted 0–60 to the estimates', () => {
    expect(buildSpecLine(trustDashboard)).toEqual(['8-Speed Automatic', 'FWD']);
  });

  it('keeps a 0–60 time that is on record', () => {
    const measured = {
      ...trustDashboard,
      zeroToSixty: { value: 6.2, method: 'actual' as const, confidence: 'high' },
    };
    expect(buildSpecLine(measured)).toContain('0–60 mph 6.2 s');
  });
});

describe('typicalOf', () => {
  it('keeps acronyms in a class name', () => {
    expect(typicalOf('Compact SUV')).toBe('a typical compact SUV');
  });
});

describe('formatMoneyRange', () => {
  it('rounds large figures to thousands and keeps small ones to the hundred', () => {
    expect(formatMoneyRange(29000, 39000)).toBe('$29k–$39k');
    expect(formatMoneyRange(5420, 6080)).toBe('$5,400–$6,100');
    expect(formatMoneyRange(34000, 34000)).toBe('$34k');
  });
});
