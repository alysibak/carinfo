import type { CarSpecs } from '../types/car.types';
import { DISPLAY_CURRENCY } from './currency';
import { usesMpge } from './fuelDisplay';

export {
  isFuelCellVehicle,
  usesMpge,
  formatFuelTypeLabel,
  formatFuelBadge,
  formatPowertrainLabel,
  formatEngineSystem,
} from './fuelDisplay';

export function efficiencyUnit(car: CarSpecs): 'MPG' | 'MPGe' {
  return usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG';
}

/**
 * An annual fuel/energy cost for display. Takes the figure the server computed
 * for the viewer's cost region (the dashboard's `ownership.annualCost.energy`)
 * rather than working one out here: this file used to carry its own copy of
 * the cost engine, fixed to the default region, so choosing B.C. changed the
 * "Cost to keep" section while the glance row and spec list kept Ontario prices.
 */
export function formatAnnualEnergyCost(annualCad: number | null | undefined): string | null {
  if (annualCad == null || !(annualCad > 0)) return null;
  return `$${Math.round(annualCad).toLocaleString()} ${DISPLAY_CURRENCY}/yr (est.)`;
}

export function annualFuelCostDetail(
  car: CarSpecs,
  annualCad: number | null | undefined,
): string | undefined {
  const formatted = formatAnnualEnergyCost(annualCad);
  if (formatted) return formatted;
  if (car.engine.fuelType === 'hydrogen') {
    return 'H₂ cost not rated by EPA; varies by station';
  }
  return undefined;
}
