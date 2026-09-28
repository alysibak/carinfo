import type { CollectionRankBy } from '../config/collections';
import type { CarSpecs } from '../types/car.types';
import { efficiencyOf, rangeKm } from './efficiency';

/**
 * The record beside each shortlist pick, the one its list ranks on (see
 * calculateCollectionScore): fuel use for the fuel lists, EPA range for the
 * EV list, rated power for the fun and work lists, the NHTSA rating for the
 * family lists. The luxury list ranks newest first, so it shows rated power.
 * Beside each pick used to be its estimated price.
 */
export function rankedFigure(
  car: CarSpecs,
  rankBy: CollectionRankBy = 'best-value',
): string | null {
  const fuelUse = efficiencyOf(car)?.text ?? null;
  switch (rankBy) {
    case 'range':
      return car.epa?.rangeMiles ? `${rangeKm(car.epa.rangeMiles)} km range` : fuelUse;
    case 'fun':
    case 'capability':
    case 'luxury':
      return car.engine.horsepower ? `${car.engine.horsepower} hp` : fuelUse;
    case 'daily-driver': {
      const stars = car.safetyRating?.overall;
      return stars && stars > 0 ? `NHTSA ${stars}/5` : fuelUse;
    }
    case 'best-value':
    case 'efficiency':
      return fuelUse;
  }
}
