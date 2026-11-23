import { mpgToLPer100Km } from '@carinfo/config/regional-assumptions';
import { intlLocale, t, tp } from '../i18n';
import type { CarSpecs } from '../types/car.types';
import { displayModelLabel } from './trimLabel';
import {
  PAYBACK_HORIZON_YEARS,
  paybackYears,
  roundedYears,
  SAVING_YEARS,
  type FuelSaving,
} from './payback';

const dollars = (amount: number) => '$' + Math.round(amount).toLocaleString('en-CA');

/** A hybrid's name says so: EPA files Honda's as plain "CR-V", like the gasoline one. */
function named(car: CarSpecs): string {
  const label = displayModelLabel(car);
  return car.engine.fuelType === 'hybrid' && !/hybrid/i.test(label)
    ? t('{model} hybrid', { model: label })
    : label;
}
const litres = (car: CarSpecs) => {
  const mpg = car.fuelEconomy?.combined;
  return mpg && mpg > 0 ? mpgToLPer100Km(mpg).toFixed(1) : null;
};

/**
 * "The RAV4 Hybrid would save about $420 a year on fuel over this one in
 * Ontario (5.7 against 7.8 L/100 km): $2,100 over 5 years."
 */
export function savingSentence(
  saving: FuelSaving,
  region: string,
  /** The car whose page this is; null in Compare, where neither is "this one". */
  onPage: CarSpecs | null,
): string {
  const vars = {
    efficient: named(saving.efficient),
    base: named(saving.base),
    saving: dollars(saving.yearlySaving),
    total: dollars(saving.yearlySaving * SAVING_YEARS),
    years: SAVING_YEARS,
    region,
  };
  const efficientL = litres(saving.efficient);
  const baseL = litres(saving.base);
  const usage =
    efficientL && baseL ? ` (${t('{a} against {b} L/100 km', { a: efficientL, b: baseL })})` : '';
  if (onPage?.id === saving.base.id)
    return t(
      'The {efficient} would save about {saving} a year on fuel over this one in {region}{usage}: {total} over {years} years.',
      { ...vars, usage },
    );
  if (onPage?.id === saving.efficient.id)
    return t(
      'This one saves about {saving} a year on fuel over the {base} in {region}{usage}: {total} over {years} years.',
      { ...vars, usage },
    );
  return t(
    'The {efficient} costs about {saving} a year less to fuel than the {base} in {region}{usage}: {total} over {years} years.',
    { ...vars, usage },
  );
}

/** "At $3,000 more, it pays for itself in about 7 years." */
export function paybackSentence(priceGap: number, yearlySaving: number): string {
  const years = paybackYears(priceGap, yearlySaving);
  const gap = dollars(priceGap);
  if (years === 0) return t('At no extra price, it pays for itself from the first tank.');
  if (years > PAYBACK_HORIZON_YEARS)
    return t('At {gap} more, it takes more than {horizon} years to pay for itself on fuel alone.', {
      gap,
      horizon: PAYBACK_HORIZON_YEARS,
    });
  const rounded = roundedYears(years);
  return tp(
    rounded,
    'At {gap} more, it pays for itself in about {years} year.',
    'At {gap} more, it pays for itself in about {years} years.',
    { gap, years: rounded.toLocaleString(intlLocale()) },
  );
}
