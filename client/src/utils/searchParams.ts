import type { CarFilter, SearchQuery } from '../types/car.types';
import { bodyStyleLabel } from './bodyStyleLabel';
import { formatFuelTypeLabel } from './fuelDisplay';
import { filterFieldHasValue, isElectricOnlyBrowse } from './filterState';
import { rangeKm } from './efficiency';

const PAGE_SIZE = 36;

function joinList(values?: string[]): string | undefined {
  return values?.length ? values.join(',') : undefined;
}

function splitList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const list = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
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
  if (isElectricOnlyBrowse(filters)) {
    return { field: 'range', order: 'desc' };
  }
  return { field: 'year', order: 'desc' };
}

/**
 * Default one-per-model collapse.
 * Browse stays dense (on); a chosen model shows its years. Typed text is left
 * to the server, which knows whether it named a model: "honda civic" shows
 * years, "cheap truck" one row per model. Counting words here showed the 2016,
 * 2017, 2018 and 2019 Frontier in turn for "cheap truck". The toggle and
 * onePerModel URL param override it.
 */
export function defaultCollapseByModel(
  queryText?: string,
  filters?: CarFilter,
): NonNullable<SearchQuery['collapseByModel']> {
  if (filters?.model?.length) return false;
  return queryText?.trim() ? 'auto' : true;
}

export function hasActiveSearch(params: URLSearchParams): boolean {
  if (params.get('q')) return true;
  const filterKeys = [
    'make',
    'model',
    'body',
    'fuel',
    'drive',
    'trans',
    'country',
    'yearMin',
    'yearMax',
    'priceMin',
    'priceMax',
    'mpgMin',
    'mpgMax',
    'dispMin',
    'dispMax',
    'hpMin',
    'hpMax',
    'nhtsaMin',
    'rows',
    'rangeMin',
    'recalls',
    'stolen',
    'fcw',
    'weightMin',
    'weightMax',
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

  const hpMin = numParam(params.get('hpMin'));
  const hpMax = numParam(params.get('hpMax'));
  if (hpMin != null || hpMax != null) filters.horsepower = { min: hpMin, max: hpMax };

  const nhtsaMin = numParam(params.get('nhtsaMin'));
  if (nhtsaMin != null) filters.safety = { min: nhtsaMin };

  const rows = params.get('rows');
  if (rows === '3') filters.threeRow = true;
  else if (rows === '2') filters.threeRow = false;

  const rangeMin = numParam(params.get('rangeMin'));
  if (rangeMin != null) filters.rangeMiles = { min: rangeMin };

  // The records: no recall in Canada, the most-stolen list, collision warning.
  if (params.get('recalls') === 'none') filters.noRecalls = true;
  const stolen = params.get('stolen');
  if (stolen === 'no') filters.theftListed = false;
  else if (stolen === 'yes') filters.theftListed = true;
  if (params.get('fcw') === 'standard') filters.safetyTech = { features: ['fcw'], standard: true };

  const weightMin = numParam(params.get('weightMin'));
  const weightMax = numParam(params.get('weightMax'));
  if (weightMin != null || weightMax != null) {
    filters.curbWeightKg = { min: weightMin, max: weightMax };
  }

  const hasFilters = Object.values(filters).some(filterFieldHasValue);

  const sortField =
    params.get('sort') ??
    defaultSortForQuery(params.get('q') ?? undefined, hasFilters ? filters : {}).field;

  const qText = params.get('q')?.trim() || undefined;
  const resolvedFilters = hasFilters ? filters : {};
  const onePer = params.get('onePerModel');
  const collapseByModel =
    onePer === '0' ? false : onePer === '1' ? true : defaultCollapseByModel(qText, resolvedFilters);

  return {
    page,
    query: {
      query: qText,
      filters: resolvedFilters,
      sort: {
        field: sortField,
        order: sortOrder as 'asc' | 'desc',
      },
      collapseByModel,
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

  // Always persist sort so Year / Price / etc. survive URL sync (esp. when a text query is active).
  if (query.sort?.field) {
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
  if (f.horsepower?.min != null) params.set('hpMin', String(f.horsepower.min));
  if (f.horsepower?.max != null) params.set('hpMax', String(f.horsepower.max));
  if (f.safety?.min != null) params.set('nhtsaMin', String(f.safety.min));
  if (f.threeRow != null) params.set('rows', f.threeRow ? '3' : '2');
  if (f.rangeMiles?.min != null) params.set('rangeMin', String(f.rangeMiles.min));
  if (f.noRecalls) params.set('recalls', 'none');
  if (f.theftListed != null) params.set('stolen', f.theftListed ? 'yes' : 'no');
  if (isFcwStandard(f)) params.set('fcw', 'standard');
  if (f.curbWeightKg?.min != null) params.set('weightMin', String(f.curbWeightKg.min));
  if (f.curbWeightKg?.max != null) params.set('weightMax', String(f.curbWeightKg.max));
  // Only persist when it differs from the dynamic default so heuristic can
  // adapt as q changes (e.g. "mazda" → dense, "mazda 3" → years).
  const collapseDefault = defaultCollapseByModel(query.query, query.filters);
  if (query.collapseByModel === false && collapseDefault !== false) {
    params.set('onePerModel', '0');
  } else if (query.collapseByModel === true && collapseDefault !== true) {
    params.set('onePerModel', '1');
  }

  return params;
}

/** The one safety-feature filter the panel offers: collision warning standard. */
export function isFcwStandard(filters: CarFilter = {}): boolean {
  const tech = filters.safetyTech;
  return !!tech?.standard && tech.features.length === 1 && tech.features[0] === 'fcw';
}

export function describeActiveFilters(filters: CarFilter = {}): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];

  filters.make?.forEach((m) => chips.push({ key: `make-${m}`, label: m }));
  filters.model?.forEach((m) => chips.push({ key: `model-${m}`, label: m }));
  filters.bodyStyle?.forEach((b) => chips.push({ key: `body-${b}`, label: bodyStyleLabel(b) }));
  // Every fuel but hydrogen (the First car situation's) is one chip, not five.
  const fuels = filters.fuelType ?? [];
  if (fuels.length >= 4 && !fuels.includes('hydrogen')) {
    chips.push({ key: 'fuel-all', label: 'Any fuel but hydrogen' });
  } else {
    fuels.forEach((f) => chips.push({ key: `fuel-${f}`, label: formatFuelTypeLabel(f) }));
  }
  filters.driveType?.forEach((d) => chips.push({ key: `drive-${d}`, label: d }));
  filters.transmission?.forEach((t) =>
    chips.push({ key: `trans-${t}`, label: t === 'cvt' ? 'CVT' : bodyStyleLabel(t) }),
  );
  filters.countryOfOrigin?.forEach((c) => chips.push({ key: `country-${c}`, label: c }));

  if (filters.year?.min != null || filters.year?.max != null) {
    const { min, max } = filters.year;
    chips.push({
      key: 'year',
      label:
        min != null && max != null
          ? min === max
            ? `${min}`
            : `${min}–${max}`
          : min != null
            ? `${min} or newer`
            : `${max} or older`,
    });
  }
  if (filters.price?.min != null || filters.price?.max != null) {
    const { min, max } = filters.price;
    let label: string;
    if (min != null && max != null) {
      label = `$${(min / 1000).toFixed(0)}k-$${(max / 1000).toFixed(0)}k`;
    } else if (max != null) {
      label = `Under $${(max / 1000).toFixed(0)}k`;
    } else {
      label = `$${(min! / 1000).toFixed(0)}k+`;
    }
    chips.push({ key: 'price', label });
  }
  if (filters.fuelEconomy?.min != null) {
    // In L/100 km like the filter that set it; the API keeps EPA's MPG.
    const min = filters.fuelEconomy.min;
    chips.push({
      key: 'mpg',
      // As the car pages round it: a 25 mpg car shows 9.4, and is in.
      label: min >= 100 ? `${min}+ MPGe` : `${(235.215 / min).toFixed(1)} L/100 km or less`,
    });
  }
  if (filters.displacement?.min != null || filters.displacement?.max != null) {
    chips.push({ key: 'disp', label: 'Engine size filter' });
  }
  if (filters.horsepower?.min != null || filters.horsepower?.max != null) {
    const { min, max } = filters.horsepower;
    chips.push({
      key: 'hp',
      label:
        min != null && max != null
          ? `${min}–${max} hp`
          : min != null
            ? `${min}+ hp`
            : `${max} hp or less`,
    });
  }
  if (filters.safety?.min != null) {
    chips.push({
      key: 'nhtsa',
      label:
        filters.safety.min >= 5 ? '5 crash-test stars' : `${filters.safety.min}+ crash-test stars`,
    });
  }
  if (filters.threeRow != null) {
    chips.push({ key: 'rows', label: filters.threeRow ? 'Three rows' : 'Two rows' });
  }
  if (filters.rangeMiles?.min != null) {
    chips.push({ key: 'range', label: `${rangeKm(filters.rangeMiles.min)}+ km range` });
  }
  if (filters.safetyTech?.features.length) {
    chips.push({
      key: 'tech',
      label: isFcwStandard(filters) ? 'Collision warning standard' : 'Safety features',
    });
  }
  if (filters.noRecalls) chips.push({ key: 'recalls', label: 'No recalls in Canada' });
  if (filters.curbWeightKg?.min != null || filters.curbWeightKg?.max != null) {
    const { min, max } = filters.curbWeightKg;
    const kg = (n: number) => `${n.toLocaleString('en-CA')} kg`;
    chips.push({
      key: 'weight',
      label:
        min != null && max != null
          ? `${kg(min)} to ${kg(max)}`
          : min != null
            ? `${kg(min)} or heavier`
            : `${kg(max!)} or lighter`,
    });
  }
  if (filters.theftListed != null) {
    chips.push({
      key: 'stolen',
      label: filters.theftListed ? 'On the most-stolen list' : 'Not on the most-stolen list',
    });
  }

  return chips;
}

/** Remove one chip from filters. Returns a new CarFilter. */
export function removeActiveFilterChip(filters: CarFilter, chipKey: string): CarFilter {
  const next: CarFilter = { ...filters };

  const dropFromList = (field: keyof CarFilter, value: string) => {
    const list = next[field];
    if (!Array.isArray(list)) return;
    const filtered = list.filter((v) => v !== value);
    if (filtered.length) (next as Record<string, unknown>)[field] = filtered;
    else delete (next as Record<string, unknown>)[field];
  };

  if (chipKey.startsWith('make-')) dropFromList('make', chipKey.slice(5));
  else if (chipKey.startsWith('model-')) dropFromList('model', chipKey.slice(6));
  else if (chipKey.startsWith('body-')) dropFromList('bodyStyle', chipKey.slice(5));
  else if (chipKey === 'fuel-all') delete next.fuelType;
  else if (chipKey.startsWith('fuel-')) dropFromList('fuelType', chipKey.slice(5));
  else if (chipKey.startsWith('drive-')) dropFromList('driveType', chipKey.slice(6));
  else if (chipKey.startsWith('trans-')) dropFromList('transmission', chipKey.slice(6));
  else if (chipKey.startsWith('country-')) dropFromList('countryOfOrigin', chipKey.slice(8));
  else if (chipKey === 'year') delete next.year;
  else if (chipKey === 'price') delete next.price;
  else if (chipKey === 'mpg') delete next.fuelEconomy;
  else if (chipKey === 'disp') delete next.displacement;
  else if (chipKey === 'hp') delete next.horsepower;
  else if (chipKey === 'nhtsa') delete next.safety;
  else if (chipKey === 'rows') delete next.threeRow;
  else if (chipKey === 'range') delete next.rangeMiles;
  else if (chipKey === 'tech') delete next.safetyTech;
  else if (chipKey === 'recalls') delete next.noRecalls;
  else if (chipKey === 'stolen') delete next.theftListed;
  else if (chipKey === 'weight') delete next.curbWeightKg;

  return next;
}

/** Tokens the search API reads as model years: 2019, 199 (the 1990s), 19 and 20. */
const YEAR_TOKEN = /^(19|20)\d{0,2}$/;

/** The typed query without its year tokens: "1985 corvette" → "corvette". */
export function withoutYearTokens(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .filter((token) => !YEAR_TOKEN.test(token))
    .join(' ');
}
