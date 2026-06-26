import type { CarDashboard, CarSpecs } from '../types/car.types';
import {
  formatCurrencyRangeOrFallback,
  formatOrFallback,
  hasNumericValue,
} from './dataValue';
import { annualFuelCostDetail, efficiencyUnit } from './fuelLabels';
import { formatEngineForDetail } from './dataValue';
import { phevModes } from './epaContent';

export type GlanceMetricId = 'power' | 'engine' | 'value' | 'mpg' | 'range' | 'running' | 'safety';

export interface GlanceMetric {
  id: GlanceMetricId;
  label: string;
  value: string;
  detail?: string;
  verified?: boolean;
  estimated?: boolean;
  /** Trust chip source — when set, overrides the legacy `verified` → EPA mapping. */
  trustSource?: 'epa' | 'nhtsa' | 'estimated' | 'curated';
  /** True when the metric slot is shown but data is absent from the dataset. */
  unavailable?: boolean;
}

type Profile = 'ev' | 'performance' | 'efficient' | 'standard';

/** Marques where the car's character (not its running cost) is the headline. */
const PERFORMANCE_MARQUES = new Set([
  'Porsche', 'Ferrari', 'Lamborghini', 'Aston Martin', 'McLaren', 'Maserati',
  'Bentley', 'Rolls-Royce', 'Lotus', 'Alfa Romeo', 'Jaguar', 'Dodge',
]);

/** Plain engine descriptor from the fields EPA actually carries (displacement + layout). */
function engineCharacter(car: CarSpecs): string | null {
  const label = formatEngineForDetail(car.engine);
  return label === 'Not on file' ? null : label;
}

function profileOf(car: CarSpecs, estValueMid: number | undefined): Profile {
  const ft = car.engine.fuelType;
  if (ft === 'electric' || ft === 'hydrogen') return 'ev';

  const isSporty = car.bodyStyle === 'coupe' || car.bodyStyle === 'convertible';
  const bigEngine = (car.engine.displacement ?? 0) >= 5 || (car.engine.cylinders ?? 0) >= 8;
  const marque = PERFORMANCE_MARQUES.has(car.make);
  const pricey = (estValueMid ?? 0) >= 80000;
  if (isSporty || bigEngine || marque || pricey) return 'performance';

  const mpg = car.fuelEconomy.combined ?? 0;
  if (ft === 'hybrid' || ft === 'plug-in hybrid' || mpg >= 40) return 'efficient';

  return 'standard';
}

/** What to lead with, by car character. Specs first; value/cost backfill only. */
const PROFILE_PRIORITY: Record<Profile, GlanceMetricId[]> = {
  ev: ['range', 'mpg', 'power', 'engine', 'safety'],
  performance: ['power', 'engine', 'mpg', 'safety'],
  efficient: ['mpg', 'power', 'engine', 'safety'],
  standard: ['power', 'engine', 'mpg', 'safety'],
};

/** Backfill order — technical specs before money metrics. */
const FILL_ORDER: GlanceMetricId[] = ['power', 'engine', 'mpg', 'range', 'safety', 'value', 'running'];

function buildMpgMetric(car: CarSpecs): GlanceMetric | null {
  if (!hasNumericValue(car.fuelEconomy.combined)) return null;

  const modes = phevModes(car);
  if (modes && car.engine.fuelType === 'plug-in hybrid') {
    // PHEVs have two modes — a single blended MPG misleads. Lead with honest gas MPG.
    const detail =
      modes.electricRangeMi != null
        ? `+${modes.electricRangeMi} mi electric`
        : annualFuelCostDetail(car) || undefined;
    return {
      id: 'mpg',
      label: 'Gas-mode MPG',
      value: formatOrFallback(car.fuelEconomy.combined),
      detail,
      trustSource: 'epa',
    };
  }

  return {
    id: 'mpg',
    label: `Combined ${efficiencyUnit(car)}`,
    value: formatOrFallback(car.fuelEconomy.combined),
    detail: annualFuelCostDetail(car) || undefined,
    trustSource: 'epa',
  };
}

/**
 * Pick the at-a-glance metrics that best fit a given car, ordered by what a
 * shopper for *that kind of car* cares about first. Returns up to four cells.
 */
export function buildGlanceMetrics(dashboard: CarDashboard): { cells: GlanceMetric[]; note: string | null } {
  const { car, ownership, evCharge, annualRunningCost } = dashboard;
  const { marketValue } = ownership;

  const candidates: Partial<Record<GlanceMetricId, GlanceMetric>> = {};

  const engine = engineCharacter(car);
  if (engine) {
    candidates.engine = {
      id: 'engine',
      label: 'Engine',
      value: engine,
      detail: car.driveType ? `${car.driveType} drivetrain` : undefined,
      trustSource: 'epa',
    };
  }

  if (hasNumericValue(car.engine.horsepower)) {
    const hpProv = car.provenance?.['engine.horsepower'];
    candidates.power = {
      id: 'power',
      label: 'Horsepower',
      value: `${car.engine.horsepower} hp`,
      detail:
        hpProv === 'estimated'
          ? 'Manufacturer-rated motor output'
          : hpProv === 'curated'
            ? 'EPA test-car rated hp'
            : engine ?? (car.driveType ? `${car.driveType} drivetrain` : undefined),
      trustSource: hpProv === 'estimated' ? 'estimated' : hpProv === 'curated' ? 'curated' : undefined,
    };
  }

  if (hasNumericValue(marketValue.low) && hasNumericValue(marketValue.high)) {
    candidates.value = {
      id: 'value',
      label: 'Est. value',
      value: formatCurrencyRangeOrFallback(marketValue.low, marketValue.high),
      detail: 'Model estimate',
      estimated: true,
    };
  }

  const mpgMetric = buildMpgMetric(car);
  if (mpgMetric) candidates.mpg = mpgMetric;

  const rangeMi = evCharge?.rangeMiles ?? car.epa?.rangeMiles;
  if (hasNumericValue(rangeMi)) {
    candidates.range = {
      id: 'range',
      label: 'EPA range',
      value: `${Math.round(rangeMi!)} mi`,
      detail: 'on a full charge',
      trustSource: 'epa',
    };
  }

  if (annualRunningCost && hasNumericValue(annualRunningCost.mid)) {
    candidates.running = {
      id: 'running',
      label: 'Running cost',
      value: formatCurrencyRangeOrFallback(annualRunningCost.low, annualRunningCost.high),
      detail: 'all-in per year',
      estimated: true,
    };
  }

  if (hasNumericValue(car.safetyRating?.overall, { allowZero: false })) {
    candidates.safety = {
      id: 'safety',
      label: 'Safety',
      value: `${car.safetyRating!.overall}/5 stars`,
      detail: 'NHTSA crash test',
      trustSource: 'nhtsa',
    };
  }

  const profile = profileOf(car, marketValue.mid);
  const order = PROFILE_PRIORITY[profile];

  const cells: GlanceMetric[] = [];
  const used = new Set<GlanceMetricId>();
  const pushIf = (id: GlanceMetricId) => {
    if (used.has(id) || cells.length >= 4) return;
    if (candidates[id]) {
      cells.push(candidates[id]!);
      used.add(id);
    }
  };

  for (const id of order) pushIf(id);
  if (cells.length < 3) {
    for (const id of FILL_ORDER) pushIf(id);
  }

  return { cells, note: null };
}
