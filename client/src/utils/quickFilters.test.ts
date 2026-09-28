import { describe, expect, it } from 'vitest';
import { QUICK_FILTERS } from './quickFilters';

const byId = (id: string) => QUICK_FILTERS.find((q) => q.id === id)!;

describe('QUICK_FILTERS', () => {
  it('adds to a list filter and takes away again, leaving the rest', () => {
    const suv = byId('suv');
    const on = suv.toggle({ bodyStyle: ['sedan'], make: ['Toyota'] });
    expect(on).toEqual({ bodyStyle: ['sedan', 'suv'], make: ['Toyota'] });
    expect(suv.isOn(on)).toBe(true);
    expect(suv.toggle(on)).toEqual({ bodyStyle: ['sedan'], make: ['Toyota'] });
    expect(suv.toggle({ bodyStyle: ['suv'] })).toEqual({});
  });

  it('sets and clears NHTSA stars and model years', () => {
    const nhtsa = byId('nhtsa-5');
    expect(nhtsa.toggle({})).toEqual({ safety: { min: 5 } });
    expect(nhtsa.isOn({ safety: { min: 4 } })).toBe(false);
    expect(nhtsa.toggle({ safety: { min: 5 } })).toEqual({});
    expect(byId('recent').toggle({ make: ['Kia'] })).toEqual({
      make: ['Kia'],
      year: { min: 2020 },
    });
  });

  it('asks for three rows, and a second tap drops the filter', () => {
    const rows = byId('three-row');
    expect(rows.toggle({})).toEqual({ threeRow: true });
    expect(rows.toggle({ threeRow: true })).toEqual({});
    expect(rows.isOn({ threeRow: false })).toBe(false);
  });
});
