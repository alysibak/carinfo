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
