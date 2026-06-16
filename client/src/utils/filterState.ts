import type { CarFilter, SearchQuery } from '../types/car.types';

export function filterFieldHasValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    const range = value as { min?: number; max?: number };
    return range.min != null || range.max != null;
  }
  return true;
}

export function countActiveFilterFields(filters: CarFilter = {}): number {
  return Object.values(filters).filter(filterFieldHasValue).length;
}

export function bucketMatches(
  active?: { min?: number; max?: number },
  bucket?: { min?: number; max?: number },
): boolean {
  if (!bucket) return false;
  if (bucket.min != null && active?.min !== bucket.min) return false;
  if (bucket.max != null && active?.max !== bucket.max) return false;
  if (bucket.min == null && active?.min != null) return false;
  if (bucket.max == null && active?.max != null) return false;
  return bucket.min != null || bucket.max != null;
}

function valuesMatch(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v) => b.includes(v));
  }
  if (typeof a === 'object' && typeof b === 'object' && a && b && !Array.isArray(a)) {
    const ar = a as { min?: number; max?: number };
    const br = b as { min?: number; max?: number };
    return ar.min === br.min && ar.max === br.max;
  }
  return a === b;
}

/** True only when active filters exactly match the expected set — no extras, no omissions. */
export function filtersMatchExactly(active: CarFilter = {}, expected: CarFilter = {}): boolean {
  const activeKeys = (Object.keys(active) as (keyof CarFilter)[]).filter((k) =>
    filterFieldHasValue(active[k]),
  );
  const expectedKeys = (Object.keys(expected) as (keyof CarFilter)[]).filter((k) =>
    filterFieldHasValue(expected[k]),
  );
  if (activeKeys.length !== expectedKeys.length) return false;
  return expectedKeys.every((key) => valuesMatch(active[key], expected[key]));
}

export function mergeFilterFields(base: CarFilter, overlay: CarFilter): CarFilter {
  return { ...base, ...overlay };
}

export function stripFilterFields(filters: CarFilter, fields: CarFilter): CarFilter {
  const next = { ...filters };
  for (const key of Object.keys(fields) as (keyof CarFilter)[]) {
    delete next[key];
  }
  return next;
}

export function isElectricOnlyBrowse(filters?: CarFilter): boolean {
  const fuel = filters?.fuelType;
  return fuel?.length === 1 && fuel[0] === 'electric';
}

export function sortForFilters(
  filters: CarFilter,
  textQuery?: string,
  currentSort?: SearchQuery['sort'],
): SearchQuery['sort'] {
  if (textQuery?.trim()) {
    return { field: 'relevance', order: 'desc' };
  }
  if (isElectricOnlyBrowse(filters)) {
    return { field: 'evScore', order: 'desc' };
  }
  if (currentSort?.field === 'evScore' || currentSort?.field === 'range') {
    return { field: 'year', order: 'desc' };
  }
  return currentSort ?? { field: 'year', order: 'desc' };
}

export function toggleRangeBucket(
  filters: CarFilter,
  key: 'price' | 'year' | 'fuelEconomy',
  bucketRange: { min?: number; max?: number } | undefined,
  activeBucketId: string | null,
  bucketId: string,
): CarFilter {
  return {
    ...filters,
    [key]: activeBucketId === bucketId ? undefined : bucketRange,
  };
}
