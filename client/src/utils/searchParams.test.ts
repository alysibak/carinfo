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
  it('defaults on for make-only and empty browse', () => {
    expect(defaultCollapseByModel('mazda')).toBe(true);
    expect(defaultCollapseByModel('')).toBe(true);
    expect(defaultCollapseByModel(undefined)).toBe(true);
  });

  it('defaults off for specific model queries so years show', () => {
    expect(defaultCollapseByModel('mazda 3')).toBe(false);
    expect(defaultCollapseByModel('honda civic')).toBe(false);
    expect(defaultCollapseByModel('2024 mazda 3')).toBe(false);
  });

  it('defaults off when model filter is set', () => {
    expect(defaultCollapseByModel('mazda', { model: ['3'] })).toBe(false);
  });
});

describe('onePerModel URL params', () => {
  it('uses heuristic when onePerModel is absent', () => {
    expect(paramsToSearchQuery(new URLSearchParams('q=mazda')).query.collapseByModel).toBe(true);
    expect(paramsToSearchQuery(new URLSearchParams('q=mazda+3')).query.collapseByModel).toBe(false);
  });

  it('honors explicit onePerModel override', () => {
    expect(
      paramsToSearchQuery(new URLSearchParams('q=mazda+3&onePerModel=1')).query.collapseByModel,
    ).toBe(true);
    expect(
      paramsToSearchQuery(new URLSearchParams('q=mazda&onePerModel=0')).query.collapseByModel,
    ).toBe(false);
  });

  it('only writes onePerModel when it differs from the heuristic', () => {
    const modelYears = searchQueryToParams(
      { query: 'mazda 3', collapseByModel: false, sort: { field: 'relevance', order: 'desc' } },
      1,
    );
    expect(modelYears.get('onePerModel')).toBeNull();

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
      'Under 6.7 L/100 km',
      'NHTSA 5 stars',
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
