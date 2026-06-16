import type { CarSpecs } from '../types/car.types';
import { DISPLAY_CURRENCY } from './currency';
import { usesMpge } from './fuelDisplay';
import {
  EPA_ANNUAL_MILES,
  getRegionalAssumptions,
  mpgToLPer100Km,
  mpgeToKwhPer100Km,
} from '@carinfo/config/regional-assumptions';

const REGION = getRegionalAssumptions();

export { isFuelCellVehicle, usesMpge, formatFuelTypeLabel, formatFuelBadge, formatPowertrainLabel, formatEngineSystem } from './fuelDisplay';

export function efficiencyUnit(car: CarSpecs): 'MPG' | 'MPGe' {
  return usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG';
}

function gasolineAnnualCostCad(mpg: number): number {
  return Math.round((REGION.annualKm / 100) * mpgToLPer100Km(mpg) * REGION.gasPriceCadPerL);
}

function electricAnnualCostCad(mpge: number): number {
  return Math.round((REGION.annualKm / 100) * mpgeToKwhPer100Km(mpge) * REGION.electricityRateCadPerKwh);
}

function estimatedAnnualFuelCostCad(car: CarSpecs): number | null {
  const mpg = car.fuelEconomy.combined ?? 0;
  const ft = car.engine.fuelType;

  if (ft === 'hydrogen') {
    const epaUsd = car.epa?.annualFuelCost;
    if (epaUsd != null && epaUsd > 0) {
      const epaCad = epaUsd * REGION.cadUsdExchangeRate;
      return Math.round(epaCad * (REGION.annualKm / (EPA_ANNUAL_MILES * 1.609344)));
    }
    return null;
  }

  if (ft === 'electric' && mpg > 0) return electricAnnualCostCad(mpg);

  if (ft === 'plug-in hybrid' && mpg > 0) {
    const gasMpg = car.epa?.phev?.gasMpg ?? mpg;
    const electricMpge = car.epa?.phev?.electricMpge ?? mpg;
    const gas = gasolineAnnualCostCad(gasMpg) * REGION.phev.gasMileFraction;
    const electric = electricAnnualCostCad(electricMpge) * REGION.phev.electricMileFraction;
    return Math.round(gas + electric);
  }

  if (mpg > 0) return gasolineAnnualCostCad(mpg);

  const epaUsd = car.epa?.annualFuelCost;
  if (epaUsd != null && epaUsd > 0) {
    const epaCad = epaUsd * REGION.cadUsdExchangeRate;
    return Math.round(epaCad * (REGION.annualKm / (EPA_ANNUAL_MILES * 1.609344)));
  }

  return null;
}

export function annualFuelCostDetail(car: CarSpecs): string | undefined {
  if (car.engine.fuelType === 'hydrogen') {
    const cost = estimatedAnnualFuelCostCad(car);
    if (cost != null && cost > 0) {
      return `$${cost.toLocaleString()} ${DISPLAY_CURRENCY}/yr fuel (est.)`;
    }
    return 'H₂ cost not rated by EPA — varies by station';
  }

  const cost = estimatedAnnualFuelCostCad(car);
  if (cost != null && cost > 0) {
    return `$${cost.toLocaleString()} ${DISPLAY_CURRENCY}/yr fuel (est.)`;
  }
  return undefined;
}
