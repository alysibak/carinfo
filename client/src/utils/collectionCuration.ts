import type { CarSpecs } from '../types/car.types';
import { calculateReliabilityScore } from './marketIntelligence';

export type CollectionRankBy = 'best-value' | 'daily-driver';

export function calculateCollectionScore(car: CarSpecs, rankBy: CollectionRankBy): number {
  const price = car.price?.msrp || 50000;
  const mpg = car.fuelEconomy.combined || 20;
  const safety = car.safetyRating?.overall || 3;
  const reliability = calculateReliabilityScore(car) / 20;

  if (rankBy === 'daily-driver') {
    return mpg * reliability * ((car.dimensions?.length ?? 180) / 100);
  }

  return (reliability * mpg * safety) / (price / 10000);
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
