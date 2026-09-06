import type { CarSpecs } from '../types/car.types';

export type CollectionRankBy = 'best-value' | 'daily-driver';

/**
 * Rank shortlists on on-file specs only — no brand “reliability” tables.
 * Prefer efficiency, safety when present, newer years, and lower estimated value.
 */
export function calculateCollectionScore(car: CarSpecs, rankBy: CollectionRankBy): number {
  const price = car.price?.msrp || 50000;
  const mpg = car.fuelEconomy.combined || 20;
  const safety = car.safetyRating?.overall && car.safetyRating.overall > 0
    ? car.safetyRating.overall
    : 3;
  const yearBoost = Math.max(0, car.year - 2005) / 20;

  if (rankBy === 'daily-driver') {
    return mpg * (1 + yearBoost * 0.15) * (safety / 3);
  }

  return (mpg * safety * (1 + yearBoost * 0.1)) / (price / 10000);
}

/** Keep the highest-scoring trim per make+model. */
export function dedupeByModel(
  cars: CarSpecs[],
  scoreFn: (car: CarSpecs) => number,
): CarSpecs[] {
  const best = new Map<string, CarSpecs>();

  for (const car of cars) {
    const key = `${car.make}|${car.model}`.toLowerCase();
    const existing = best.get(key);
    if (!existing || scoreFn(car) > scoreFn(existing)) {
      best.set(key, car);
    }
  }

  return Array.from(best.values());
}
