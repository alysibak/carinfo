import type { CollectionRankBy } from '../config/collections';
import type { CarSpecs } from '../types/car.types';
import { t } from '../i18n';
import { fmtNumber } from '../i18n/format';
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
      return car.epa?.rangeMiles
        ? t('{km} km range', { km: rangeKm(car.epa.rangeMiles) })
        : fuelUse;
    case 'fun':
    case 'capability':
      return car.engine.horsepower ? t('{hp} hp', { hp: car.engine.horsepower }) : fuelUse;
    case 'luxury':
      return stars && stars > 0
        ? t('NHTSA {stars}/5', { stars })
        : car.engine.horsepower
          ? t('{hp} hp', { hp: car.engine.horsepower })
          : fuelUse;
    case 'daily-driver':
      return stars && stars > 0 ? t('NHTSA {stars}/5', { stars }) : fuelUse;
    case 'lightest': {
      const kg = car.size?.curbWeightKg[0];
      return kg ? t('{kg} kg', { kg: fmtNumber(kg) }) : fuelUse;
    }
    case 'best-value':
    case 'efficiency':
      return fuelUse;
  }
}
