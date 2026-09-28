import type { Car } from '../types/car.types.js';
import { COLLECTIONS, rankCollectionPicks } from '../shared/collections.js';
import { normalizeSearchQuery } from '../utils/search-validation.js';
import * as carService from './car.service.js';

/** The home page shows this many picks per shortlist. */
export const PREVIEW_SIZE = 3;

let cache: { version: string; previews: Record<string, Car[]> } | null = null;

/**
 * Each shortlist's first picks, found as its own page finds them (the same
 * search, one per model, the same ranking), so a preview never shows a car the
 * shortlist does not lead with. The corpus only changes on deploy, so this is
 * worked out once per data version.
 */
export function getCollectionPreviews(): Record<string, Car[]> {
  const version = carService.getDataVersion();
  if (cache?.version === version) return cache.previews;
  const previews: Record<string, Car[]> = {};
  for (const collection of Object.values(COLLECTIONS)) {
    const query = normalizeSearchQuery({
      ...collection.query,
      limit: 200,
      offset: 0,
      collapseByModel: true,
    });
    const { results } = carService.searchCars(query);
    previews[collection.id] = rankCollectionPicks(results, collection).slice(0, PREVIEW_SIZE);
  }
  cache = { version, previews };
  return previews;
}
