import { describe, expect, it } from 'vitest';
import { normalizeSearchQuery, parseSearchQueryString } from '../utils/search-validation.js';

describe('search-validation', () => {
  it('reads one row per model, per year, or the server’s choice', () => {
    expect(normalizeSearchQuery({ collapseByModel: true }).collapseByModel).toBe(true);
    expect(normalizeSearchQuery({ collapseByModel: false }).collapseByModel).toBe(false);
    expect(normalizeSearchQuery({ collapseByModel: 'auto' }).collapseByModel).toBe('auto');
    expect(normalizeSearchQuery({ collapseByModel: 'yes' }).collapseByModel).toBeUndefined();
    expect(parseSearchQueryString({ collapse: 'auto' }).collapseByModel).toBe('auto');
  });

  it('drops invalid filter shapes instead of crashing', () => {
    const query = normalizeSearchQuery({
      filters: {
        make: 'Toyota',
        fuelType: 42,
        year: 'not-a-range',
      },
      sort: { field: 'not-a-field', order: 'sideways' },
    });
    expect(query.filters?.make).toBeUndefined();
    expect(query.filters?.fuelType).toBeUndefined();
    expect(query.filters?.year).toBeUndefined();
    expect(query.sort).toBeUndefined();
  });

  it('preserves valid filters and sort', () => {
    const query = normalizeSearchQuery({
      query: '2024 camry',
      limit: 25,
      offset: 0,
      filters: {
        make: ['Toyota'],
        fuelType: ['gasoline', 'hybrid'],
        year: { min: 2020, max: 2024 },
        price: { min: 15000, max: 35000 },
      },
      sort: { field: 'price', order: 'asc' },
    });
    expect(query.query).toBe('2024 camry');
    expect(query.limit).toBe(25);
    expect(query.filters?.make).toEqual(['Toyota']);
    expect(query.filters?.fuelType).toEqual(['gasoline', 'hybrid']);
    expect(query.filters?.year).toEqual({ min: 2020, max: 2024 });
    expect(query.sort).toEqual({ field: 'price', order: 'asc' });
  });

  it('keeps the filters the search page sends beyond the basics', () => {
    const query = normalizeSearchQuery({
      filters: {
        safety: { min: 5 },
        horsepower: { min: 250, max: 399 },
        transmission: ['manual'],
        threeRow: true,
        rangeMiles: { min: 249 },
      },
    });
    expect(query.filters).toMatchObject({
      safety: { min: 5 },
      horsepower: { min: 250, max: 399 },
      transmission: ['manual'],
      threeRow: true,
      rangeMiles: { min: 249 },
    });
  });
});
