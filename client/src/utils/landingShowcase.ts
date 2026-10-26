import type { CarSpecs, SearchQuery } from '../types/car.types';
import { hasNumericValue } from './dataValue';
import { displayModelLabel } from './trimLabel';
import { LATEST_FULL_MODEL_YEAR } from '@carinfo/config/model-years';

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

/**
 * Last model year's cars: the newest year's often lack their own photo and
 * have power figures estimated until their records catch up.
 */
export const HERO_PREVIEW_QUERY: SearchQuery = {
  filters: {
    make: ['Toyota', 'Honda', 'Ford'],
    year: { min: LATEST_FULL_MODEL_YEAR - 1, max: LATEST_FULL_MODEL_YEAR - 1 },
  },
  sort: { field: 'year', order: 'desc' },
  limit: 60,
  offset: 0,
};

export function pickHeroPreviewCar(results: CarSpecs[]): CarSpecs | null {
  // What a car page holds, shown whole: its own year's photo, its crash stars
  // and figures from the records rather than estimates.
  const fullness = (c: CarSpecs) =>
    (c.photo ? (c.photo.otherYear ? 2 : 4) : 0) +
    ((c.safetyRating?.overall ?? 0) > 0 ? 2 : 0) +
    (hasNumericValue(c.engine.horsepower) && c.provenance?.['engine.horsepower'] !== 'estimated'
      ? 1
      : 0);
  // Among the fullest, one of the names most people know first.
  const known = (c: CarSpecs) => {
    const at = HERO_PREVIEW_PRIORITY.findIndex(
      (target) =>
        c.make === target.make &&
        displayModelLabel(c).toLowerCase().includes(target.model.toLowerCase()),
    );
    return at === -1 ? HERO_PREVIEW_PRIORITY.length : at;
  };
  return (
    results
      .filter(isLandingShowcaseEligible)
      .map((car, order) => ({ car, order }))
      .sort(
        (a, b) =>
          fullness(b.car) - fullness(a.car) || known(a.car) - known(b.car) || a.order - b.order,
      )
      .at(0)?.car ?? null
  );
}
