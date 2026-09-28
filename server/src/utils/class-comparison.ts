import type { Car, ClassComparison } from '../types/car.types.js';
import {
  COMPETITIVE_SET_LABELS,
  competitiveSets,
  primaryCompetitiveSet,
  type CompetitiveSet,
} from './competitive-sets.js';
import { correctedKWhPer100Mi, estimateMarketValue } from './ownership-economics.js';
import { unvaluedReason } from './unvalued.js';

const KM_PER_MILE = 1.609344;
/** A median over fewer rival model lines than this says little about a class. */
const MIN_MODELS = 3;
/** Rivals are drawn from this many model years either side of the car. */
const YEAR_WINDOW = 1;

type Metric = 'fuel' | 'annualCost' | 'value' | 'horsepower';

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isElectric(car: Car): boolean {
  return car.engine.fuelType === 'electric';
}

/** Combined fuel use: L/100 km for anything burning fuel, kWh/100 km for EVs. */
function fuelUse(car: Car): number | undefined {
  const ft = car.engine.fuelType;
  if (ft === 'hydrogen') return undefined;
  if (ft === 'electric') {
    const kWhPerMi = correctedKWhPer100Mi(car);
    if (kWhPerMi && kWhPerMi > 0) return kWhPerMi / KM_PER_MILE;
    const mpge = car.fuelEconomy.combined;
    return mpge && mpge > 0 ? 3370 / (mpge * KM_PER_MILE) : undefined;
  }
  // A plug-in hybrid's combined figure is its gas-mode rating.
  const mpg = car.fuelEconomy.combined;
  return mpg && mpg > 0 ? 235.215 / mpg : undefined;
}

function metricOf(car: Car, metric: Metric): number | undefined {
  switch (metric) {
    case 'fuel':
      return fuelUse(car);
    case 'annualCost':
      return car.runningCostCad && car.runningCostCad > 0 ? car.runningCostCad : undefined;
    case 'value': {
      if (unvaluedReason(car)) return undefined;
      const mid = estimateMarketValue(car).mid;
      return mid > 0 ? mid : undefined;
    }
    case 'horsepower':
      return car.engine.horsepower && car.engine.horsepower > 0 ? car.engine.horsepower : undefined;
  }
}

let indexed: { corpus: readonly Car[]; bySet: Map<CompetitiveSet, Car[]> } | null = null;

/** Cars by competitive set, built once per corpus. */
function carsBySet(corpus: readonly Car[]): Map<CompetitiveSet, Car[]> {
  if (indexed?.corpus === corpus) return indexed.bySet;
  const bySet = new Map<CompetitiveSet, Car[]>();
  for (const car of corpus) {
    for (const set of competitiveSets(car)) {
      const list = bySet.get(set);
      if (list) list.push(car);
      else bySet.set(set, [car]);
    }
  }
  indexed = { corpus, bySet };
  return bySet;
}

function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/**
 * The car against the rivals in its class (see ClassComparison). Undefined
 * for a car with no class, or a class with too few rivals in those years.
 */
export function compareWithClass(
  car: Car,
  corpus: readonly Car[],
  /** The model line a car belongs to; the search's one-per-model key. */
  lineOf: (car: Car) => string,
): ClassComparison | undefined {
  const set = primaryCompetitiveSet(car);
  if (!set) return undefined;
  const ownLine = lineOf(car);
  const years = { min: car.year - YEAR_WINDOW, max: car.year + YEAR_WINDOW };

  // Rival model lines in the window, each with its configurations.
  const lines = new Map<string, Car[]>();
  for (const rival of carsBySet(corpus).get(set) ?? []) {
    if (rival.year < years.min || rival.year > years.max) continue;
    const line = lineOf(rival);
    if (line === ownLine) continue;
    const list = lines.get(line);
    if (list) list.push(rival);
    else lines.set(line, [rival]);
  }
  if (lines.size < MIN_MODELS) return undefined;

  const classMedian = (metric: Metric, keep: (rival: Car) => boolean = () => true) => {
    const perLine: number[] = [];
    for (const configs of lines.values()) {
      const values = configs
        .filter(keep)
        .map((rival) => metricOf(rival, metric))
        .filter((v): v is number => v != null);
      if (values.length) perLine.push(median(values));
    }
    return perLine.length >= MIN_MODELS
      ? { median: median(perLine), models: perLine.length }
      : undefined;
  };

  const comparison: ClassComparison = {
    className: COMPETITIVE_SET_LABELS[set],
    models: lines.size,
    years,
  };

  const carFuel = fuelUse(car);
  if (carFuel != null) {
    // Litres and kilowatt-hours do not compare: EVs against EVs, the rest against the rest.
    const electric = isElectric(car);
    const fuel = classMedian('fuel', (rival) => isElectric(rival) === electric);
    if (fuel) {
      comparison.fuel = {
        unit: electric ? 'kWh/100 km' : 'L/100 km',
        car: round(carFuel, 1),
        median: round(fuel.median, 1),
        models: fuel.models,
      };
    }
  }

  for (const metric of ['annualCost', 'value', 'horsepower'] as const) {
    const mine = metricOf(car, metric);
    if (mine == null) continue;
    const stat = classMedian(metric);
    if (stat) {
      comparison[metric] = {
        car: Math.round(mine),
        median: Math.round(stat.median),
        models: stat.models,
      };
    }
  }

  return comparison;
}
