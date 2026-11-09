import type { CarFilter, CarSpecs, SearchInterpretation } from '../types/car.types';
import { efficiencyOf, rangeKm } from './efficiency';
import { formatMoneyShort } from './money';
import { t } from '../i18n';

const isAwd = (drive?: string) => drive === 'AWD' || drive === '4WD';

/**
 * Why a result is in the list, in the searcher's own terms: each limit the
 * search set, and this car's figure against it ("Under $40k", "6.1 L/100 km",
 * "AWD"). A result list used to say nothing about why a car was there, so a
 * reader could not tell a close match from a loose one. At most three.
 */
export function matchReasons(
  car: CarSpecs,
  filters: CarFilter | undefined,
  interpretation: SearchInterpretation | undefined,
): string[] {
  const reasons: string[] = [];
  const value = car.price?.msrp;

  const price = interpretation?.price ?? filters?.price;
  if (price && value != null && value > 0) {
    if (price.max != null && value <= price.max) {
      reasons.push(t('Under {price}', { price: formatMoneyShort(price.max) }));
    } else if (price.min != null && value >= price.min) {
      reasons.push(t('Over {price}', { price: formatMoneyShort(price.min) }));
    }
  }

  if (interpretation?.threeRow || filters?.threeRow === true) reasons.push(t('Three rows'));
  else if (interpretation?.twoRow || filters?.threeRow === false) reasons.push(t('Two rows'));
  if (interpretation?.twoSeater || filters?.twoSeater) reasons.push(t('Two seats'));

  const wantsAwd =
    interpretation?.snow || (filters?.driveType?.length && filters.driveType.every(isAwd));
  if (wantsAwd && isAwd(car.driveType)) reasons.push(car.driveType!);

  const fuelBound = interpretation?.fuelEconomy ?? filters?.fuelEconomy;
  if (fuelBound && (fuelBound.min != null || fuelBound.max != null)) {
    const efficiency = efficiencyOf(car, fuelBound.basis ?? 'combined');
    if (efficiency) {
      reasons.push(fuelBound.basis ? `${efficiency.text} ${fuelBound.basis}` : efficiency.text);
    }
  }

  const hpBound = interpretation?.horsepower ?? filters?.horsepower;
  if (hpBound?.min != null && car.engine.horsepower)
    reasons.push(t('{hp} hp', { hp: car.engine.horsepower }));

  const minRange = interpretation?.minRangeMiles ?? filters?.rangeMiles?.min;
  if (minRange != null && car.epa?.rangeMiles)
    reasons.push(t('{km} km range', { km: rangeKm(car.epa.rangeMiles) }));

  const position = interpretation?.enginePosition ?? filters?.enginePosition;
  if (position === 'mid') reasons.push(t('Mid-engine'));
  else if (position === 'rear') reasons.push(t('Rear-engine'));

  const doors = interpretation?.doors ?? filters?.doors;
  if (doors) reasons.push(t('{doors} doors', { doors }));

  if (interpretation?.similarTo)
    reasons.push(t('A rival of the {label}', { label: interpretation.similarTo.label }));

  return reasons.slice(0, 3);
}
