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
    collapseByModel:
      raw.collapseByModel === true || raw.collapseByModel === '1'
        ? true
        : raw.collapseByModel === false || raw.collapseByModel === '0'
          ? false
          : undefined,
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

// ─── Query-string form ────────────────────────────────────────────────────────
// GET /api/cars/search?q=…&make=toyota,honda&priceMin=20000&sort=price:asc
//
// A GET mirror of the POST body above. Worth having for two reasons: CDNs cache
// GET and not POST, and a search becomes a URL you can link, bookmark and share.

function csv(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function range(min: unknown, max: unknown): { min?: number; max?: number } | undefined {
  const lo = num(min);
  const hi = num(max);
  if (lo == null && hi == null) return undefined;
  return { min: lo, max: hi };
}

/** Coerce Express's `req.query` into the same SearchQuery shape as the POST body. */
export function parseSearchQueryString(q: Record<string, unknown>): SearchQuery {
  const query: SearchQuery = {
    query: typeof q.q === 'string' && q.q.trim() ? q.q.trim() : undefined,
    limit: num(q.limit),
    offset: num(q.offset),
  };

  if (q.collapse === '1' || q.collapse === 'true') query.collapseByModel = true;
  else if (q.collapse === '0' || q.collapse === 'false') query.collapseByModel = false;

  const filters = {
    make: csv(q.make),
    model: csv(q.model),
    bodyStyle: csv(q.bodyStyle),
    fuelType: csv(q.fuelType),
    transmission: csv(q.transmission),
    driveType: csv(q.driveType),
    countryOfOrigin: csv(q.country),
    year: range(q.yearMin, q.yearMax),
    horsepower: range(q.hpMin, q.hpMax),
    displacement: range(q.dispMin, q.dispMax),
    fuelEconomy: range(q.mpgMin, q.mpgMax),
    price: range(q.priceMin, q.priceMax),
  };
  if (Object.values(filters).some((v) => v !== undefined)) {
    query.filters = filters;
  }

  // `sort=price:asc` — one param instead of two, so links stay readable.
  if (typeof q.sort === 'string') {
    const [field, order = 'desc'] = q.sort.split(':');
    if (SORT_FIELDS.has(field) && (order === 'asc' || order === 'desc')) {
      query.sort = { field: field as NonNullable<SearchQuery['sort']>['field'], order };
    }
  }

  return query;
}
