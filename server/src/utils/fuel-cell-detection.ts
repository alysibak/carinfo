import type { CarSpecs } from '../types/car.types.js';

const FCEV_NAME_RE =
  /\b(fuel\s*cell|fcv|fcev|mirai|nexo)\b/i;

/** True when EPA/model signals a hydrogen fuel-cell vehicle (FCEV), not gasoline or BEV. */
export function isFuelCellVehicle(car: CarSpecs): boolean {
  if (car.engine.fuelType === 'hydrogen') return true;

  const key = `${car.make} ${car.model} ${car.trim ?? ''}`;
  if (FCEV_NAME_RE.test(key)) return true;

  const ft = (car.engine.fuelType ?? '').toLowerCase();
  if (ft.includes('hydrogen') || ft.includes('fuel cell')) return true;

  const mpge = car.fuelEconomy.combined ?? 0;
  const hasEvRange = (car.epa?.rangeMiles ?? 0) > 0;
  const hasKwh = car.epa?.kWhPer100Mi != null && car.epa.kWhPer100Mi > 0;

  // Zero tailpipe CO₂ + MPGe efficiency + no battery signature → FCEV (e.g. Tucson Fuel Cell @ 50 MPGe).
  if (
    car.epa?.co2 === 0 &&
    mpge > 0 &&
    !hasEvRange &&
    !hasKwh &&
    ft !== 'electric' &&
    ft !== 'plug-in hybrid'
  ) {
    return true;
  }

  return false;
}
