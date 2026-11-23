import { estimateAnnualEnergyCost } from '@carinfo/shared/energy-cost';
import { getRegionalAssumptions, type RegionId } from '@carinfo/config/regional-assumptions';
import type { CarSpecs } from '../types/car.types';

/**
 * What a thriftier car saves in fuel, and how fast that repays a price gap.
 * Prices are not ours to give: every list price on file is an estimate, and
 * a gasoline and a hybrid version often share one. So the saving comes from
 * EPA's fuel use at the visitor's prices, and the price gap from the reader,
 * as a dealer quotes it.
 */

/** Years the saving is counted over: about how long a buyer keeps a new car. */
export const SAVING_YEARS = 5;
/** Past this, most cars are sold before the fuel saved repays the gap. */
export const PAYBACK_HORIZON_YEARS = 15;

export interface FuelSaving {
  /** Cheaper to run. */
  efficient: CarSpecs;
  /** What it is weighed against. */
  base: CarSpecs;
  /** Fuel or electricity saved a year, at the region's prices and distance. */
  yearlySaving: number;
}

function annualEnergy(car: CarSpecs, region: RegionId): number | null {
  return estimateAnnualEnergyCost(car, {}, getRegionalAssumptions(region))?.annualCad ?? null;
}

/** Which of two cars costs less to fuel, and by how much a year; null under $50, the estimates' own error. */
export function fuelSavingBetween(a: CarSpecs, b: CarSpecs, region: RegionId): FuelSaving | null {
  const costA = annualEnergy(a, region);
  const costB = annualEnergy(b, region);
  if (costA == null || costB == null) return null;
  const yearlySaving = Math.abs(costA - costB);
  if (yearlySaving < 50) return null;
  return costA < costB
    ? { efficient: a, base: b, yearlySaving }
    : { efficient: b, base: a, yearlySaving };
}

const isHybrid = (car: CarSpecs) => car.engine.fuelType === 'hybrid';
const isGasoline = (car: CarSpecs) => car.engine.fuelType === 'gasoline' && !car.engine.mildHybrid;

/** Of these, the cheapest to fuel; those with the given drive first, where there are any. */
function thriftiest(cars: CarSpecs[], drive: string, region: RegionId): CarSpecs | undefined {
  const sameDrive = cars.filter((car) => car.driveType === drive);
  return (sameDrive.length ? sameDrive : cars)
    .map((car) => ({ car, cost: annualEnergy(car, region) }))
    .filter((row): row is { car: CarSpecs; cost: number } => row.cost != null)
    .sort((x, y) => x.cost - y.cost)[0]?.car;
}

/**
 * Hybrid or gas, on a model year with both, the same body: a gasoline
 * version against the year's thriftiest hybrid, or a hybrid against the
 * thriftiest gasoline version, each of the same drive where there is one.
 */
export function hybridSaving(
  car: CarSpecs,
  siblings: CarSpecs[],
  region: RegionId,
): FuelSaving | null {
  const others = siblings.filter(
    (other) => other.id !== car.id && other.bodyStyle === car.bodyStyle,
  );
  const pair = isGasoline(car)
    ? { base: car, efficient: thriftiest(others.filter(isHybrid), car.driveType, region) }
    : isHybrid(car)
      ? { efficient: car, base: thriftiest(others.filter(isGasoline), car.driveType, region) }
      : null;
  if (!pair?.efficient || !pair.base) return null;
  const saving = fuelSavingBetween(pair.efficient, pair.base, region);
  // Only where the hybrid is the thriftier one, as it should be.
  return saving && saving.efficient.id === pair.efficient.id ? saving : null;
}

/** Years for a yearly saving to repay a price gap; 0 where there is no gap. */
export function paybackYears(priceGap: number, yearlySaving: number): number {
  return priceGap <= 0 ? 0 : priceGap / yearlySaving;
}

/** Half years: the precision the estimates bear, never below half a year. */
export function roundedYears(years: number): number {
  return Math.max(0.5, Math.round(years * 2) / 2);
}
