import type { CollectionRankBy } from '../config/collections';
import type { CarSpecs } from '../types/car.types';
import { efficiencyOf, rangeKm } from './efficiency';

/**
 * The record beside each shortlist pick, the one its list ranks on (see
 * calculateCollectionScore): fuel use for the fuel lists, EPA range for the
 * EV list, rated power for the work list, the NHTSA rating for the family,
 * recall and luxury lists, curb weight for the lightest-first list. Beside
 * each pick used to be its estimated price.
 */
export function rankedFigure(
  car: CarSpecs,
  rankBy: CollectionRankBy = 'best-value',
): string | null {
  const fuelUse = efficiencyOf(car)?.text ?? null;
  const stars = car.safetyRating?.overall;
  switch (rankBy) {
    case 'range':
      return car.epa?.rangeMiles ? `${rangeKm(car.epa.rangeMiles)} km range` : fuelUse;
    case 'fun':
    case 'capability':
      return car.engine.horsepower ? `${car.engine.horsepower} hp` : fuelUse;
    case 'luxury':
      return stars && stars > 0
        ? `NHTSA ${stars}/5`
        : car.engine.horsepower
          ? `${car.engine.horsepower} hp`
          : fuelUse;
    case 'daily-driver':
      return stars && stars > 0 ? `NHTSA ${stars}/5` : fuelUse;
    case 'lightest': {
      const kg = car.size?.curbWeightKg[0];
      return kg ? `${kg.toLocaleString('en-CA')} kg` : fuelUse;
    }
    case 'best-value':
    case 'efficiency':
      return fuelUse;
  }
}
