import type { CarSpecs, SearchQuery } from '../types/car.types';
import { hasNumericValue } from './dataValue';
import { displayModelLabel } from './trimLabel';

/** Vehicles shown on the landing page must have complete headline stats — no "Not on file". */
export function isLandingShowcaseEligible(car: CarSpecs): boolean {
  if ((car.price?.msrp ?? 0) <= 0) return false;
  if ((car.fuelEconomy?.combined ?? 0) <= 0) return false;

  const hasSafety = (car.safetyRating?.overall ?? 0) > 0;
  const hasPower = hasNumericValue(car.engine.horsepower);
  if (!hasSafety && !hasPower) return false;

  const label = displayModelLabel(car);
  if (!label || label.includes('(')) return false;

  return true;
}

export function pickFirstEligible(
  results: CarSpecs[],
  insight: ShowcaseQuery['insight'],
  exclude: Set<string> = new Set(),
): CarSpecs | null {
  const sorted =
    insight === 'safety'
      ? [...results].sort((a, b) => (b.safetyRating?.overall ?? 0) - (a.safetyRating?.overall ?? 0))
      : results;

  for (const car of sorted) {
    if (exclude.has(car.id)) continue;
    if (!isLandingShowcaseEligible(car)) continue;
    if (insight === 'safety' && !(car.safetyRating?.overall ?? 0)) continue;
    if (insight === 'safety' && car.provenance?.safetyRating !== 'nhtsa') continue;
    if (insight === 'safety' && car.year > 2024) continue;
    exclude.add(car.id);
    return car;
  }
  return null;
}

export interface ShowcaseQuery {
  insight: 'fuel' | 'ownership' | 'safety';
  query: SearchQuery;
}

export const OWNERSHIP_SHOWCASE_PRIORITY: { make: string; model: string }[] = [
  { make: 'Honda', model: 'Accord' },
  { make: 'Toyota', model: 'Corolla' },
  { make: 'Mazda', model: 'Mazda3' },
  { make: 'Hyundai', model: 'Elantra' },
  { make: 'Subaru', model: 'Outback' },
  { make: 'Ford', model: 'Escape' },
];

export const OWNERSHIP_SHOWCASE_QUERY: SearchQuery = {
  filters: {
    year: { min: 2014, max: 2020 },
    fuelType: ['gasoline', 'hybrid'],
    price: { min: 8000, max: 35000 },
    fuelEconomy: { min: 24 },
  },
  sort: { field: 'year', order: 'desc' },
  limit: 40,
  offset: 0,
};

export function isOwnershipShowcaseCandidate(car: CarSpecs): boolean {
  if ((car.price?.msrp ?? 0) <= 0 || (car.fuelEconomy?.combined ?? 0) <= 0) return false;
  if ((car.price?.msrp ?? 0) < 5000) return false;
  if (car.engine.fuelType === 'electric' || car.engine.fuelType === 'plug-in hybrid') return false;
  const label = displayModelLabel(car);
  if (!label || label.includes('(')) return false;
  return true;
}

export function rankOwnershipCandidates(results: CarSpecs[]): CarSpecs[] {
  const ranked: CarSpecs[] = [];
  for (const target of OWNERSHIP_SHOWCASE_PRIORITY) {
    const match = results.find(
      (c) =>
        c.make === target.make &&
        displayModelLabel(c).toLowerCase().includes(target.model.toLowerCase()),
    );
    if (match && !ranked.some((r) => r.id === match.id)) ranked.push(match);
  }
  for (const c of results) {
    if (!ranked.some((r) => r.id === c.id) && isOwnershipShowcaseCandidate(c)) ranked.push(c);
  }
  return ranked;
}

/** Recognizable vehicles for the hero dossier preview — first match with complete data wins. */
export const HERO_PREVIEW_PRIORITY: { make: string; model: string }[] = [
  { make: 'Toyota', model: 'Camry' },
  { make: 'Honda', model: 'Civic' },
  { make: 'Honda', model: 'Accord' },
  { make: 'Toyota', model: 'RAV4' },
  { make: 'Ford', model: 'F-150' },
];

export const HERO_PREVIEW_QUERY: SearchQuery = {
  filters: {
    make: ['Toyota', 'Honda', 'Ford'],
    year: { min: 2020 },
  },
  sort: { field: 'year', order: 'desc' },
  limit: 40,
  offset: 0,
};

export function pickHeroPreviewCar(results: CarSpecs[]): CarSpecs | null {
  for (const target of HERO_PREVIEW_PRIORITY) {
    const match = results.find(
      (c) =>
        c.make === target.make &&
        displayModelLabel(c).toLowerCase().includes(target.model.toLowerCase()) &&
        isLandingShowcaseEligible(c),
    );
    if (match) return match;
  }
  return results.find((c) => isLandingShowcaseEligible(c)) ?? null;
}

export const SHOWCASE_QUERIES: ShowcaseQuery[] = [
  {
    insight: 'fuel',
    query: {
      filters: { fuelEconomy: { min: 45 }, fuelType: ['gasoline', 'hybrid'] },
      sort: { field: 'fuelEconomy', order: 'desc' },
      limit: 25,
      offset: 0,
    },
  },
  {
    insight: 'safety',
    query: {
      filters: { year: { min: 2018, max: 2024 }, bodyStyle: ['sedan', 'suv'] },
      sort: { field: 'year', order: 'desc' },
      limit: 40,
      offset: 0,
    },
  },
];

export const DOSSIER_EXAMPLE_QUERIES: { question: string; query: SearchQuery }[] = [
  {
    question: 'How much will this car cost me to fuel in Ontario this year?',
    query: {
      filters: { make: ['Toyota'], model: ['Camry'], year: { min: 2022 } },
      sort: { field: 'year', order: 'desc' },
      limit: 5,
      offset: 0,
    },
  },
  {
    question: "Is this vehicle's EPA fuel economy good for its class?",
    query: {
      filters: { make: ['Honda'], model: ['Civic'], fuelEconomy: { min: 30 } },
      sort: { field: 'fuelEconomy', order: 'desc' },
      limit: 5,
      offset: 0,
    },
  },
  {
    question: "What did NHTSA say about this car's safety?",
    query: {
      filters: { make: ['Subaru'], model: ['Outback'], year: { min: 2020 } },
      sort: { field: 'year', order: 'desc' },
      limit: 10,
      offset: 0,
    },
  },
  {
    question: 'What is this car worth in Ontario today?',
    query: {
      filters: { make: ['Ford'], model: ['F-150'], year: { min: 2019 } },
      sort: { field: 'year', order: 'desc' },
      limit: 5,
      offset: 0,
    },
  },
];

export function pickDossierExample(results: CarSpecs[]): CarSpecs | null {
  const withSafety = results.find(
    (c) => isLandingShowcaseEligible(c) || ((c.price?.msrp ?? 0) > 0 && (c.fuelEconomy?.combined ?? 0) > 0),
  );
  return withSafety ?? results[0] ?? null;
}
