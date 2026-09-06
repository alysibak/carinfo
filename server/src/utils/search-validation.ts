import type { SearchQuery } from '../types/car.types.js';

function asStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === 'string');
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function asRange(obj: unknown): { min?: number; max?: number } | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const o = obj as Record<string, unknown>;
  const min = asNumber(o.min);
  const max = asNumber(o.max);
  if (min == null && max == null) return undefined;
  return { min, max };
}

const SORT_FIELDS = new Set(['make', 'model', 'year', 'horsepower', 'price', 'fuelEconomy', 'range', 'evScore', 'relevance']);

/**
 * Coerce and validate a search request body. Invalid filter shapes are dropped
 * rather than crashing .map() on non-arrays.
 */
export function normalizeSearchQuery(body: unknown): SearchQuery {
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const filtersRaw = raw.filters && typeof raw.filters === 'object'
    ? (raw.filters as Record<string, unknown>)
    : undefined;

  const query: SearchQuery = {
    query: typeof raw.query === 'string' ? raw.query : undefined,
    limit: asNumber(raw.limit),
    offset: asNumber(raw.offset),
    collapseByModel: raw.collapseByModel === true || raw.collapseByModel === '1' || undefined,
  };

  if (filtersRaw) {
    query.filters = {
      make: asStringArray(filtersRaw.make),
      model: asStringArray(filtersRaw.model),
      bodyStyle: asStringArray(filtersRaw.bodyStyle),
      fuelType: asStringArray(filtersRaw.fuelType),
      transmission: asStringArray(filtersRaw.transmission),
      driveType: asStringArray(filtersRaw.driveType),
      countryOfOrigin: asStringArray(filtersRaw.countryOfOrigin),
      year: asRange(filtersRaw.year),
      horsepower: asRange(filtersRaw.horsepower),
      displacement: asRange(filtersRaw.displacement),
      fuelEconomy: asRange(filtersRaw.fuelEconomy),
      price: asRange(filtersRaw.price),
    };
  }

  if (raw.sort && typeof raw.sort === 'object') {
    const s = raw.sort as Record<string, unknown>;
    const field = typeof s.field === 'string' && SORT_FIELDS.has(s.field) ? s.field : undefined;
    const order = s.order === 'asc' || s.order === 'desc' ? s.order : undefined;
    if (field && order) {
      query.sort = { field: field as NonNullable<SearchQuery['sort']>['field'], order };
    }
  }

  return query;
}
