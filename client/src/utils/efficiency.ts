import type { CarSpecs } from '../types/car.types';

const KM_PER_MILE = 1.609344;
/** Miles in 100 km: hydrogen's "MPGe" is miles per kilogram. */
const MILES_PER_100KM = 100 / KM_PER_MILE;

export type EfficiencyUnit = 'L/100 km' | 'kWh/100 km' | 'kg/100 km';

export interface Efficiency {
  /** In `unit`; lower is better for every unit. */
  value: number;
  unit: EfficiencyUnit;
  /** "7.6 L/100 km". */
  text: string;
  /** The EPA figure it comes from, for readers who think in it: "31 mpg". */
  epa: string;
  /** What the figure is: "Fuel use", "Energy use", "Gas-mode fuel use", "Hydrogen use". */
  label: string;
}

type Basis = 'combined' | 'city' | 'highway';

/**
 * A car's efficiency the way Canadian shoppers read it: litres per 100 km for
 * anything burning fuel, kWh per 100 km for EVs, kg per 100 km for hydrogen.
 * The EPA's miles-per-gallon figure rides along as the secondary line; it used
 * to be the headline everywhere, with L/100 km in small print.
 */
export function efficiencyOf(
  car: Pick<CarSpecs, 'engine' | 'fuelEconomy' | 'epa'>,
  basis: Basis = 'combined',
): Efficiency | null {
  const rating = car.fuelEconomy[basis];
  const fuel = car.engine.fuelType;

  if (fuel === 'electric') {
    // EPA's measured consumption beats a conversion from MPGe when it is on file.
    const kWhPerMi = basis === 'combined' ? car.epa?.kWhPer100Mi : undefined;
    const value =
      kWhPerMi && kWhPerMi > 0
        ? kWhPerMi / KM_PER_MILE
        : rating && rating > 0
          ? 3370 / (rating * KM_PER_MILE)
          : null;
    if (value == null) return null;
    return {
      value: round1(value),
      unit: 'kWh/100 km',
      text: `${round1(value).toFixed(1)} kWh/100 km`,
      epa: rating && rating > 0 ? `${Math.round(rating)} MPGe` : '',
      label: 'Energy use',
    };
  }

  if (!rating || rating <= 0) return null;

  if (fuel === 'hydrogen') {
    const value = MILES_PER_100KM / rating;
    return {
      value: Math.round(value * 100) / 100,
      unit: 'kg/100 km',
      text: `${value.toFixed(2)} kg/100 km`,
      epa: `${Math.round(rating)} MPGe`,
      label: 'Hydrogen use',
    };
  }

  const value = round1(235.215 / rating);
  return {
    value,
    unit: 'L/100 km',
    text: `${value.toFixed(1)} L/100 km`,
    epa: `${Math.round(rating)} mpg`,
    // A plug-in hybrid's combined rating is its gas-mode figure.
    label: fuel === 'plug-in hybrid' ? 'Gas-mode fuel use' : 'Fuel use',
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** EPA range in kilometres, from the miles EPA publishes. */
export function rangeKm(miles: number): number {
  return Math.round(miles * KM_PER_MILE);
}
