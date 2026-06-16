import type { CarFilter, SearchQuery } from '../types/car.types';
import { formatFuelTypeLabel } from './fuelDisplay';

const PAGE_SIZE = 36;

function joinList(values?: string[]): string | undefined {
  return values?.length ? values.join(',') : undefined;
}

function splitList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const list = value.split(',').map((v) => v.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

function numParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function getDefaultPageSize() {
  return PAGE_SIZE;
}

/** Default sort when none is set in the URL or query object. */
export function defaultSortForQuery(
  query?: string,
  filters?: CarFilter,
): { field: string; order: 'asc' | 'desc' } {
  if (query?.trim()) return { field: 'relevance', order: 'desc' };
  const fuel = filters?.fuelType;
  if (fuel?.length === 1 && fuel[0] === 'electric') {
    return { field: 'evScore', order: 'desc' };
  }
  return { field: 'year', order: 'desc' };
}

export function hasActiveSearch(params: URLSearchParams): boolean {
  if (params.get('q')) return true;
  const filterKeys = [
    'make', 'model', 'body', 'fuel', 'drive', 'trans', 'country',
    'yearMin', 'yearMax', 'priceMin', 'priceMax', 'mpgMin', 'mpgMax',
    'dispMin', 'dispMax',
  ];
  return filterKeys.some((k) => params.get(k));
}

export function paramsToSearchQuery(params: URLSearchParams): { query: SearchQuery; page: number } {
  const page = Math.max(1, numParam(params.get('page')) ?? 1);
  const sortOrder = params.get('order') === 'asc' ? 'asc' : 'desc';

  const filters: CarFilter = {
    make: splitList(params.get('make')),
    model: splitList(params.get('model')),
    bodyStyle: splitList(params.get('body')),
    fuelType: splitList(params.get('fuel')),
    driveType: splitList(params.get('drive')),
    transmission: splitList(params.get('trans')),
    countryOfOrigin: splitList(params.get('country')),
  };

  const yearMin = numParam(params.get('yearMin'));
  const yearMax = numParam(params.get('yearMax'));
  if (yearMin != null || yearMax != null) filters.year = { min: yearMin, max: yearMax };

  const priceMin = numParam(params.get('priceMin'));
  const priceMax = numParam(params.get('priceMax'));
  if (priceMin != null || priceMax != null) filters.price = { min: priceMin, max: priceMax };

  const mpgMin = numParam(params.get('mpgMin'));
  const mpgMax = numParam(params.get('mpgMax'));
  if (mpgMin != null || mpgMax != null) filters.fuelEconomy = { min: mpgMin, max: mpgMax };

  const dispMin = numParam(params.get('dispMin'));
  const dispMax = numParam(params.get('dispMax'));
  if (dispMin != null || dispMax != null) filters.displacement = { min: dispMin, max: dispMax };

  const hasFilters = Object.values(filters).some((v) => {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return (v as { min?: number; max?: number }).min != null || (v as { min?: number; max?: number }).max != null;
  });

  const sortField =
    params.get('sort') ??
    defaultSortForQuery(params.get('q') ?? undefined, hasFilters ? filters : {}).field;

  return {
    page,
    query: {
      query: params.get('q')?.trim() || undefined,
      filters: hasFilters ? filters : {},
      sort: {
        field: sortField,
        order: sortOrder as 'asc' | 'desc',
      },
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    },
  };
}

export function searchQueryToParams(query: SearchQuery, page: number): URLSearchParams {
  const params = new URLSearchParams();
  const f = query.filters ?? {};

  if (query.query?.trim()) params.set('q', query.query.trim());
  if (page > 1) params.set('page', String(page));

  if (query.sort?.field && query.sort.field !== 'year') {
    params.set('sort', query.sort.field);
  }
  if (query.sort?.order === 'asc') params.set('order', 'asc');

  const make = joinList(f.make);
  if (make) params.set('make', make);
  const model = joinList(f.model);
  if (model) params.set('model', model);
  const body = joinList(f.bodyStyle);
  if (body) params.set('body', body);
  const fuel = joinList(f.fuelType);
  if (fuel) params.set('fuel', fuel);
  const drive = joinList(f.driveType);
  if (drive) params.set('drive', drive);
  const trans = joinList(f.transmission);
  if (trans) params.set('trans', trans);
  const country = joinList(f.countryOfOrigin);
  if (country) params.set('country', country);

  if (f.year?.min != null) params.set('yearMin', String(f.year.min));
  if (f.year?.max != null) params.set('yearMax', String(f.year.max));
  if (f.price?.min != null) params.set('priceMin', String(f.price.min));
  if (f.price?.max != null) params.set('priceMax', String(f.price.max));
  if (f.fuelEconomy?.min != null) params.set('mpgMin', String(f.fuelEconomy.min));
  if (f.fuelEconomy?.max != null) params.set('mpgMax', String(f.fuelEconomy.max));
  if (f.displacement?.min != null) params.set('dispMin', String(f.displacement.min));
  if (f.displacement?.max != null) params.set('dispMax', String(f.displacement.max));

  return params;
}

export function describeActiveFilters(filters: CarFilter = {}): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];

  filters.make?.forEach((m) => chips.push({ key: `make-${m}`, label: m }));
  filters.model?.forEach((m) => chips.push({ key: `model-${m}`, label: m }));
  filters.bodyStyle?.forEach((b) => chips.push({ key: `body-${b}`, label: b }));
  filters.fuelType?.forEach((f) => chips.push({ key: `fuel-${f}`, label: formatFuelTypeLabel(f) }));
  filters.driveType?.forEach((d) => chips.push({ key: `drive-${d}`, label: d }));
  filters.transmission?.forEach((t) => chips.push({ key: `trans-${t}`, label: t }));
  filters.countryOfOrigin?.forEach((c) => chips.push({ key: `country-${c}`, label: c }));

  if (filters.year?.min != null || filters.year?.max != null) {
    const { min, max } = filters.year;
    chips.push({
      key: 'year',
      label: min != null && max != null && min === max ? `${min}` : `${min ?? '…'}–${max ?? '…'}`,
    });
  }
  if (filters.price?.min != null || filters.price?.max != null) {
    const { min, max } = filters.price;
    chips.push({
      key: 'price',
      label: `$${((min ?? 0) / 1000).toFixed(0)}k–$${max != null ? (max / 1000).toFixed(0) : '∞'}k`,
    });
  }
  if (filters.fuelEconomy?.min != null) {
    const unit = filters.fuelEconomy.min >= 100 ? 'MPGe' : 'MPG';
    chips.push({ key: 'mpg', label: `${filters.fuelEconomy.min}+ ${unit}` });
  }
  if (filters.displacement?.min != null || filters.displacement?.max != null) {
    chips.push({ key: 'disp', label: 'Engine size filter' });
  }

  return chips;
}
