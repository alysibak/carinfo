import { describe, expect, it } from 'vitest';
import {
  defaultCollapseByModel,
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
