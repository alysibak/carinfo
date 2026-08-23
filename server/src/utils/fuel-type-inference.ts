import type { CarSpecs, FuelType } from '../types/car.types.js';
import { isFuelCellVehicle } from './fuel-cell-detection.js';

/** EPA rows that include "electricity" in fuelType string before PHEV check — runtime correction. */
const PHEV_NAME_RE =
  /\b(e-hybrid|ehybrid|plug-?in|phev|prime|energi|clarity|volt|i3 rex|t8\b|xdrive\d{2}e|recharge|4xe|e4|e-tron sportback phev)\b/i;

const BEV_NAME_RE = /\b(bolt ev|leaf|model [3sxy]|model y|i[34]\b|ioniq 5|ioniq 6|ev6|mach-e|id\.4|id4|kona electric|niro ev|e-golf|500e|i-miev|focus electric|spark ev|hummer ev|rivian|lucid air)\b/i;

/** Short EPA electric-only range (mi) — signature of PHEV mislabeled as BEV. */
const PHEV_RANGE_THRESHOLD_MI = 50;

/**
 * Infer corrected fuel type from EPA fields + naming patterns.
 * Used at normalization and in valuation (effectiveFuelType).
 */
export function inferEffectiveFuelType(car: CarSpecs): FuelType {
  if (isFuelCellVehicle(car)) return 'hydrogen';

  const stored = car.engine.fuelType;
  const key = `${car.make} ${car.model} ${car.trim ?? ''}`.toLowerCase();
  const range = car.epa?.rangeMiles ?? 0;
  const displacement = car.engine.displacement ?? 0;

  if (stored === 'plug-in hybrid' || stored === 'hybrid') return stored;
  if (stored === 'hydrogen' || stored === 'diesel' || stored === 'gasoline') return stored;

  // Explicit PHEV naming — safe to correct even without range.
  if (PHEV_NAME_RE.test(key)) return 'plug-in hybrid';

  // Legacy overrides (Volt, Prius Prime, etc.)
  if (
    key.includes('volt') ||
    key.includes('prius prime') ||
    key.includes('clarity') ||
    key.includes('i3 rex')
  ) {
    return 'plug-in hybrid';
  }

  if (stored !== 'electric') return stored;

  // Series / range-extender PHEVs (gas generator, electric drive) store gas-engine
  // displacement on EPA rows labeled "electric". Any meaningful displacement → PHEV.
  if (displacement >= 1.0) {
    return 'plug-in hybrid';
  }

  // Gas displacement + short electric range → PHEV mislabel.
  if (displacement >= 1.5 && range > 0 && range < PHEV_RANGE_THRESHOLD_MI) {
    return 'plug-in hybrid';
  }

  // Short range without displacement but strong PHEV model family (Porsche hybrids, Panamera, etc.)
  if (range > 0 && range < PHEV_RANGE_THRESHOLD_MI) {
    if (
      /\b(e-hybrid|s e-hybrid|tfsi e|t8|xdrive\d{2}e|recharge|4xe|outlander phev|wrangler 4xe)\b/i.test(key) ||
      (car.make === 'Porsche' && /hybrid|e-hybrid/i.test(`${car.model}`))
    ) {
      return 'plug-in hybrid';
    }
  }

  // Confirmed BEV name patterns — keep electric.
  if (BEV_NAME_RE.test(key) || car.make === 'Tesla') return 'electric';

  return stored;
}

export function isLikelyMisclassifiedPhev(car: CarSpecs): boolean {
  return car.engine.fuelType === 'electric' && inferEffectiveFuelType(car) === 'plug-in hybrid';
}
