import type { CarFilter } from '../types/car.types';

type ListKey = 'bodyStyle' | 'fuelType' | 'driveType' | 'transmission';

export interface QuickFilter {
  id: string;
  label: string;
  isOn: (filters: CarFilter) => boolean;
  toggle: (filters: CarFilter) => CarFilter;
}

function listToggle(id: string, label: string, key: ListKey, value: string): QuickFilter {
  return {
    id,
    label,
    isOn: (filters) => !!filters[key]?.includes(value),
    toggle: (filters) => {
      const current = filters[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const out: CarFilter = { ...filters, [key]: next };
      if (next.length === 0) delete out[key];
      return out;
    },
  };
}

function rangeToggle(
  id: string,
  label: string,
  key: 'year' | 'safety',
  range: { min?: number; max?: number },
): QuickFilter {
  const matches = (filters: CarFilter) =>
    filters[key]?.min === range.min && filters[key]?.max === range.max;
  return {
    id,
    label,
    isOn: matches,
    toggle: (filters) => {
      const out: CarFilter = { ...filters, [key]: range };
      if (matches(filters)) delete out[key];
      return out;
    },
  };
}

/**
 * The filters people reach for most, one tap each, in the bar that stays
 * under the search box on a phone. The full set is one tap further, in the
 * filter sheet; on a phone it used to be a "Show" link above the results
 * that scrolled away with them.
 */
export const QUICK_FILTERS: QuickFilter[] = [
  listToggle('suv', 'SUV', 'bodyStyle', 'suv'),
  listToggle('sedan', 'Sedan', 'bodyStyle', 'sedan'),
  listToggle('truck', 'Pickup', 'bodyStyle', 'truck'),
  listToggle('hybrid', 'Hybrid', 'fuelType', 'hybrid'),
  listToggle('electric', 'Electric', 'fuelType', 'electric'),
  rangeToggle('nhtsa-5', 'NHTSA 5 stars', 'safety', { min: 5 }),
  listToggle('awd', 'AWD', 'driveType', 'AWD'),
  rangeToggle('recent', '2020+', 'year', { min: 2020 }),
  {
    id: 'three-row',
    label: 'Three rows',
    isOn: (filters) => filters.threeRow === true,
    toggle: (filters) => {
      const out: CarFilter = { ...filters, threeRow: true };
      if (filters.threeRow === true) delete out.threeRow;
      return out;
    },
  },
  listToggle('manual', 'Manual', 'transmission', 'manual'),
];
