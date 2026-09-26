/**
 * The one fuel/energy cost engine, shared by the server and the client.
 *
 * Code in `server/src/shared/` runs on both sides: the server imports it by
 * relative path, the client through the `@carinfo/shared` alias. Everything in
 * this directory must therefore stay pure — no Node APIs, no I/O, no imports
 * outside `config/`, `types/` and other pure utilities.
 *
 * Why it exists: the dossier's "5-year total" was computed on the server while
 * the "Custom TCO calculator" beneath it ran a separate client implementation,
 * and the two disagreed. The client copy had no hydrogen branch, so a
 * fuel-cell car fell through to gasoline math applied to its MPGe — a Toyota
 * Mirai came out around $1,100/yr when EPA's own figure implies roughly five
 * times that. It also invented 20 kWh/100 km for EVs with no efficiency data
 * and reported "$0/yr" for cars with no MPG, where the server said "unknown".
 */
import {
  EPA_ANNUAL_MILES,
  getRegionalAssumptions,
  mpgToLPer100Km,
  mpgeToKwhPer100Km,
  type RegionalAssumptions,
} from '../config/regional-assumptions.js';
import type { CarSpecs } from '../types/car.types.js';
import { inferEffectiveFuelType } from '../utils/fuel-type-inference.js';

const KM_PER_MILE = 1.609344;

/** The inputs a user can reasonably override in a what-if calculator. */
export interface EnergyPriceInputs {
  annualKm: number;
  gasPriceCadPerL: number;
  dieselPriceCadPerL: number;
  electricityRateCadPerKwh: number;
}

export type EnergyCostBasis =
  /** Litres/100 km from EPA MPG × the gas price. */
  | 'gasoline'
  /** Litres/100 km from EPA MPG × the diesel price. */
  | 'diesel'
  /** kWh/100 km from EPA MPGe × the electricity rate. */
  | 'electric'
  /** Separate gas and electric figures, weighted by the regional utility split. */
  | 'plug-in hybrid'
  /**
   * EPA's MPGe as miles per kilogram (a kilogram of hydrogen holds about a
   * gallon of gasoline's energy) × the region's posted hydrogen price.
   */
  | 'hydrogen'
  /**
   * EPA's own annual fuel cost, converted to CAD and scaled to the driving
   * distance. Used for hydrogen and compressed natural gas (whose prices are
   * not among the inputs, and for which we hold no regional price) and as a
   * last resort when a vehicle has no efficiency figure. It does not respond
   * to the gas or electricity price.
   */
  | 'epa-annual-cost';

export interface EnergyCostEstimate {
  annualCad: number;
  perKmCad: number;
  basis: EnergyCostBasis;
}

function round(n: number): number {
  return Math.round(n);
}

function gasolineAnnualCad(mpg: number, region: RegionalAssumptions): number {
  return (region.annualKm / 100) * mpgToLPer100Km(mpg) * region.gasPriceCadPerL;
}

/** EPA rates diesel economy per gallon of diesel, so this is the same arithmetic at the pump price for diesel. */
function dieselAnnualCad(mpg: number, region: RegionalAssumptions): number {
  return (region.annualKm / 100) * mpgToLPer100Km(mpg) * region.dieselPriceCadPerL;
}

function electricAnnualCad(mpge: number, region: RegionalAssumptions): number {
  return (region.annualKm / 100) * mpgeToKwhPer100Km(mpge) * region.electricityRateCadPerKwh;
}

function epaAnnualCostCad(car: CarSpecs, region: RegionalAssumptions): number | null {
  const usd = car.epa?.annualFuelCost;
  if (usd == null || usd <= 0) return null;
  // EPA's figure assumes EPA_ANNUAL_MILES; scale to this driver's distance.
  return usd * region.cadUsdExchangeRate * (region.annualKm / (EPA_ANNUAL_MILES * KM_PER_MILE));
}

/**
 * Annual fuel/energy cost in CAD, or null when the record does not carry
 * enough to say. Null is deliberate — "unknown" is an honest answer, a
 * fabricated default is not.
 *
 * Rounding matches the server's historical behavior exactly (each component is
 * rounded before PHEV weighting), so dashboard figures are unchanged by the
 * move into this module.
 */
export function estimateAnnualEnergyCost(
  car: CarSpecs,
  overrides: Partial<EnergyPriceInputs> = {},
  baseRegion: RegionalAssumptions = getRegionalAssumptions(),
): EnergyCostEstimate | null {
  const region: RegionalAssumptions = { ...baseRegion, ...overrides };
  if (!(region.annualKm > 0)) return null;

  const mpgRaw = car.fuelEconomy?.combined;
  const mpg = mpgRaw != null && Number.isFinite(mpgRaw) ? Math.round(mpgRaw) : 0;
  const fuelType = inferEffectiveFuelType(car);

  const result = (annual: number | null, basis: EnergyCostBasis): EnergyCostEstimate | null => {
    if (annual == null || !Number.isFinite(annual)) return null;
    const annualCad = round(annual);
    return { annualCad, perKmCad: annualCad / region.annualKm, basis };
  };

  if (fuelType === 'hydrogen' && region.hydrogenCadPerKg != null && mpg > 0) {
    const kgPerYear = region.annualKm / KM_PER_MILE / mpg;
    return result(kgPerYear * region.hydrogenCadPerKg, 'hydrogen');
  }

  // EPA leaves hydrogen unpriced (its figure is 0, read as unknown), so a
  // region with no posted price gets no energy cost rather than a free one.
  if (fuelType === 'hydrogen' || fuelType === 'natural gas') {
    return result(epaAnnualCostCad(car, region), 'epa-annual-cost');
  }

  if (fuelType === 'electric' && mpg > 0) {
    return result(electricAnnualCad(mpg, region), 'electric');
  }

  if (fuelType === 'plug-in hybrid' && mpg > 0) {
    const gasMpg = car.epa?.phev?.gasMpg ?? mpg;
    const electricMpge = car.epa?.phev?.electricMpge ?? mpg;
    const gas = round(gasolineAnnualCad(gasMpg, region)) * region.phev.gasMileFraction;
    const electric =
      round(electricAnnualCad(electricMpge, region)) * region.phev.electricMileFraction;
    return result(gas + electric, 'plug-in hybrid');
  }

  if (fuelType === 'diesel' && mpg > 0) {
    return result(dieselAnnualCad(mpg, region), 'diesel');
  }

  if (mpg > 0) {
    return result(gasolineAnnualCad(mpg, region), 'gasoline');
  }

  return result(epaAnnualCostCad(car, region), 'epa-annual-cost');
}
