import { describe, expect, it } from 'vitest';
import { removeActiveFilterChip, describeActiveFilters } from './searchParams';
import type { CarFilter } from '../types/car.types';

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
