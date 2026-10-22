import { describe, expect, it } from 'vitest';
import {
  defaultCollapseByModel,
  hasActiveSearch,
  removeActiveFilterChip,
  describeActiveFilters,
  paramsToSearchQuery,
  searchQueryToParams,
  withoutYearTokens,
} from './searchParams';
import type { CarFilter } from '../types/car.types';

describe('defaultCollapseByModel', () => {
  it('defaults on for empty browse', () => {
    expect(defaultCollapseByModel('')).toBe(true);
    expect(defaultCollapseByModel(undefined)).toBe(true);
  });

  it('leaves typed words to the server, which knows whether they name a model', () => {
    // One row per model for "mazda" or "cheap truck", the years of "mazda 3".
    expect(defaultCollapseByModel('mazda')).toBe('auto');
    expect(defaultCollapseByModel('mazda 3')).toBe('auto');
    expect(defaultCollapseByModel('cheap truck')).toBe('auto');
  });

  it('defaults off when model filter is set', () => {
    expect(defaultCollapseByModel('mazda', { model: ['3'] })).toBe(false);
  });
});

describe('onePerModel URL params', () => {
  it('uses the default when onePerModel is absent', () => {
    expect(paramsToSearchQuery(new URLSearchParams('q=mazda')).query.collapseByModel).toBe('auto');
    expect(paramsToSearchQuery(new URLSearchParams('')).query.collapseByModel).toBe(true);
  });

  it('honors explicit onePerModel override', () => {
    expect(
      paramsToSearchQuery(new URLSearchParams('q=mazda+3&onePerModel=1')).query.collapseByModel,
    ).toBe(true);
    expect(
      paramsToSearchQuery(new URLSearchParams('q=mazda&onePerModel=0')).query.collapseByModel,
    ).toBe(false);
  });

  it('only writes onePerModel when it differs from the default', () => {
    const decided = searchQueryToParams(
      { query: 'mazda 3', collapseByModel: 'auto', sort: { field: 'relevance', order: 'desc' } },
      1,
    );
    expect(decided.get('onePerModel')).toBeNull();

    const forceYears = searchQueryToParams(
      { query: 'mazda', collapseByModel: false, sort: { field: 'relevance', order: 'desc' } },
      1,
    );
    expect(forceYears.get('onePerModel')).toBe('0');

    const forceCollapse = searchQueryToParams(
      { query: 'mazda 3', collapseByModel: true, sort: { field: 'relevance', order: 'desc' } },
      1,
    );
    expect(forceCollapse.get('onePerModel')).toBe('1');
  });
});

describe('removeActiveFilterChip', () => {
  it('removes one make from a multi-make filter', () => {
    const filters: CarFilter = { make: ['Toyota', 'Honda'] };
    expect(removeActiveFilterChip(filters, 'make-Toyota')).toEqual({ make: ['Honda'] });
  });

  it('drops empty array fields', () => {
    const filters: CarFilter = { make: ['Toyota'], bodyStyle: ['sedan'] };
    expect(removeActiveFilterChip(filters, 'make-Toyota')).toEqual({ bodyStyle: ['sedan'] });
  });

  it('clears range chips', () => {
    const filters: CarFilter = { year: { min: 2020, max: 2024 }, horsepower: { min: 250 } };
    expect(removeActiveFilterChip(filters, 'year')).toEqual({ horsepower: { min: 250 } });
    expect(removeActiveFilterChip(filters, 'hp')).toEqual({ year: { min: 2020, max: 2024 } });
  });

  it('describeActiveFilters includes horsepower chips', () => {
    const chips = describeActiveFilters({ horsepower: { min: 300 } });
    expect(chips.some((c) => c.key === 'hp' && c.label.includes('300'))).toBe(true);
  });

  it('names the record filters the way the page does', () => {
    const chips = describeActiveFilters({
      bodyStyle: ['suv'],
      transmission: ['manual'],
      safety: { min: 5 },
      threeRow: true,
      rangeMiles: { min: 248.5 },
      fuelEconomy: { min: 35 },
    });
    expect(chips.map((c) => c.label)).toEqual([
      'SUV',
      'Manual',
      '6.7 L/100 km or less',
      '5 crash-test stars',
      'Three rows',
      '400+ km range',
    ]);
    expect(removeActiveFilterChip({ safety: { min: 5 }, threeRow: true }, 'nhtsa')).toEqual({
      threeRow: true,
    });
  });
});

describe('new filters in the URL', () => {
  it('round-trips NHTSA stars, rows and EV range', () => {
    const params = searchQueryToParams(
      { filters: { safety: { min: 5 }, threeRow: true, rangeMiles: { min: 248.5 } } },
      1,
    );
    expect(params.get('nhtsaMin')).toBe('5');
    expect(params.get('rows')).toBe('3');
    expect(params.get('rangeMin')).toBe('248.5');
    expect(hasActiveSearch(params)).toBe(true);
    const { query } = paramsToSearchQuery(params);
    expect(query.filters).toMatchObject({
      safety: { min: 5 },
      threeRow: true,
      rangeMiles: { min: 248.5 },
    });
  });

  it('round-trips the records: no recalls, the most-stolen list, collision warning', () => {
    const filters: CarFilter = {
      noRecalls: true,
      theftListed: false,
      safetyTech: { features: ['fcw'], standard: true },
    };
    const params = searchQueryToParams({ filters }, 1);
    expect(params.get('recalls')).toBe('none');
    expect(params.get('stolen')).toBe('no');
    expect(params.get('fcw')).toBe('standard');
    expect(hasActiveSearch(params)).toBe(true);
    expect(paramsToSearchQuery(params).query.filters).toEqual(filters);
    expect(describeActiveFilters(filters).map((c) => c.label)).toEqual([
      'Collision warning standard',
      'No recalls in Canada',
      'Not on the most-stolen list',
    ]);
    expect(removeActiveFilterChip(filters, 'recalls')).toEqual({
      theftListed: false,
      safetyTech: { features: ['fcw'], standard: true },
    });
    expect(removeActiveFilterChip(filters, 'tech')).toEqual({
      noRecalls: true,
      theftListed: false,
    });
    expect(removeActiveFilterChip(filters, 'stolen')).not.toHaveProperty('theftListed');
  });

  it('says years, power and fuels the way a person would', () => {
    const labels = (filters: CarFilter) => describeActiveFilters(filters).map((c) => c.label);
    expect(labels({ year: { min: 2015 } })).toEqual(['2015 or newer']);
    expect(labels({ year: { min: 2019, max: 2023 } })).toEqual(['2019–2023']);
    expect(labels({ horsepower: { max: 250 } })).toEqual(['250 hp or less']);
    const fuels = ['gasoline', 'diesel', 'hybrid', 'plug-in hybrid', 'electric'];
    expect(labels({ fuelType: fuels })).toEqual(['Any fuel but hydrogen']);
    expect(removeActiveFilterChip({ fuelType: fuels }, 'fuel-all')).toEqual({});
    expect(labels({ fuelType: ['hybrid', 'electric'] })).toEqual(['Hybrid', 'Electric']);
  });

  it('round-trips a curb-weight floor, the one the First car situation sets', () => {
    const params = searchQueryToParams({ filters: { curbWeightKg: { min: 1248 } } }, 1);
    expect(params.get('weightMin')).toBe('1248');
    expect(paramsToSearchQuery(params).query.filters?.curbWeightKg).toEqual({
      min: 1248,
      max: undefined,
    });
    expect(describeActiveFilters({ curbWeightKg: { min: 1248 } })[0].label).toBe(
      '1,248 kg or heavier',
    );
    expect(removeActiveFilterChip({ curbWeightKg: { min: 1248 } }, 'weight')).toEqual({});
  });

  it('round-trips a model picked from the make, and shows its years', () => {
    const params = searchQueryToParams(
      { filters: { make: ['Honda'], modelLine: ['Honda Civic'] } },
      1,
    );
    expect(params.get('line')).toBe('Honda Civic');
    const { query } = paramsToSearchQuery(params);
    expect(query.filters?.modelLine).toEqual(['Honda Civic']);
    expect(query.collapseByModel).toBe(false);
    expect(describeActiveFilters({ modelLine: ['Honda Civic'] })).toEqual([
      { key: 'line-Honda Civic', label: 'Honda Civic' },
    ]);
    expect(
      removeActiveFilterChip({ make: ['Honda'], modelLine: ['Honda Civic'] }, 'line-Honda Civic'),
    ).toEqual({ make: ['Honda'] });
  });

  it('keeps a two-row filter, which is false rather than absent', () => {
    const params = searchQueryToParams({ filters: { threeRow: false } }, 1);
    expect(params.get('rows')).toBe('2');
    expect(paramsToSearchQuery(params).query.filters?.threeRow).toBe(false);
  });
});

describe('withoutYearTokens', () => {
  it('drops the tokens the API reads as years', () => {
    expect(withoutYearTokens('1985 corvette')).toBe('corvette');
    expect(withoutYearTokens('  corvette 198  ')).toBe('corvette');
    expect(withoutYearTokens('20 honda civic')).toBe('honda civic');
    expect(withoutYearTokens('1985')).toBe('');
  });

  it('keeps model names that merely contain digits', () => {
    expect(withoutYearTokens('chrysler 300')).toBe('chrysler 300');
    expect(withoutYearTokens('bmw 330i 2010')).toBe('bmw 330i');
    expect(withoutYearTokens('mazda3')).toBe('mazda3');
  });
});
