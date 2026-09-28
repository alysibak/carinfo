import { describe, expect, it } from 'vitest';
import type { CarDashboard } from '../types/car.types';
import { buildDecisionStats, buildSpecLine, typicalOf } from './decisionStats';
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
  buildDecisionStats(dashboard).find((s) => s.id === id);

describe('buildDecisionStats', () => {
  it('leads with value, yearly cost, fuel use and safety', () => {
    expect(buildDecisionStats(trustDashboard).map((s) => s.id)).toEqual([
      'value',
      'cost',
      'fuel',
      'safety',
    ]);
  });

  it('gives fuel use in L/100 km with the EPA mpg beneath', () => {
    expect(byId(trustDashboard, 'fuel')).toMatchObject({
      value: '7.1',
      unit: 'L/100 km',
      detail: '33 mpg combined',
    });
  });

  it('sets each figure against a typical car of its class', () => {
    const dashboard = withClass({
      fuel: { unit: 'L/100 km', car: 7.1, median: 8.4, models: 12 },
      annualCost: { car: 3200, median: 3600, models: 12 },
      value: { car: 28000, median: 27000, models: 12 },
    });
    expect(byId(dashboard, 'fuel')?.comparison).toEqual({
      text: '1.3 L/100 km less than a typical midsize car',
      tone: 'better',
    });
    expect(byId(dashboard, 'cost')?.comparison).toEqual({
      text: '11% less than a typical midsize car',
      tone: 'better',
    });
    // A price is neither good nor bad: a within-5% difference is "about the same".
    expect(byId(dashboard, 'value')?.comparison).toEqual({
      text: 'About the same as a typical midsize car',
      tone: 'neutral',
    });
  });

  it('marks a thirstier or costlier car against its class', () => {
    const dashboard = withClass({
      fuel: { unit: 'L/100 km', car: 9.5, median: 8.4, models: 12 },
      annualCost: { car: 4200, median: 3600, models: 12 },
    });
    expect(byId(dashboard, 'fuel')?.comparison?.tone).toBe('worse');
    expect(byId(dashboard, 'cost')?.comparison).toEqual({
      text: '17% more than a typical midsize car',
      tone: 'worse',
    });
  });

  it('says plainly when NHTSA has not rated the car', () => {
    expect(byId(sparseDashboard, 'safety')).toMatchObject({ value: 'Not rated', missing: true });
  });

  it('leaves out a value and cost it does not have', () => {
    expect(buildDecisionStats(sparseDashboard).map((s) => s.id)).toEqual(['fuel', 'safety']);
  });

  it('leads a car the site does not value with its power and engine', () => {
    const collector: CarDashboard = {
      ...trustDashboard,
      ownership: {
        ...trustDashboard.ownership,
        unvalued: { kind: 'collector', label: 'Collector car', note: '' },
      },
    };
    expect(buildDecisionStats(collector).map((s) => s.id)).toEqual([
      'power',
      'engine',
      'fuel',
      'safety',
    ]);
  });

  it('gives an EV its range in km and its energy use', () => {
    const ev: CarDashboard = {
      ...trustDashboard,
      car: {
        ...trustDashboard.car,
        engine: { fuelType: 'electric', horsepower: 300 },
        fuelEconomy: { city: 130, highway: 110, combined: 120 },
      },
      evCharge: { rangeMiles: 330, kWhPer100Mi: 28 },
    };
    const stats = buildDecisionStats(ev);
    expect(stats.map((s) => s.id)).toEqual(['value', 'cost', 'range', 'energy', 'safety']);
    expect(stats.find((s) => s.id === 'range')).toMatchObject({ value: '531', unit: 'km' });
    expect(stats.find((s) => s.id === 'energy')).toMatchObject({
      value: '17.4',
      unit: 'kWh/100 km',
    });
  });
});

describe('buildSpecLine', () => {
  it('lists power, engine, gearbox, drive and acceleration', () => {
    expect(buildSpecLine(trustDashboard)).toEqual([
      '203 hp',
      '1.8L I4',
      '8-Speed Automatic',
      'FWD',
      '0–60 mph ~7.5 s',
    ]);
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
