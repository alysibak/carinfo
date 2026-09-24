import type { FuelType } from '../../src/types/car.types.js';

/** The EPA vehicles.csv columns that decide a powertrain's fuel type. */
export interface EpaFuelFields {
  model?: string;
  fuelType?: string;
  fuelType1?: string;
  atvType?: string;
}

/**
 * Map an EPA row to our fuel type.
 *
 * Order matters: EPA's combined `fuelType` string names every fuel a vehicle
 * can use ("Premium Gas or Electricity" is a plug-in hybrid, not an EV), so
 * the alternative-technology type (`atvType`) is consulted first.
 *
 * Dedicated natural-gas vehicles (atvType "CNG": the Civic GX / Civic Natural
 * Gas, CNG Crown Victorias, vans and pickups) used to fall through to
 * "gasoline". Bi-fuel vehicles ("Gasoline or natural gas", "Gasoline or
 * propane") and flex-fuel (E85) vehicles stay gasoline: their EPA economy
 * figures are for gasoline.
 */
export function mapEpaFuelType(row: EpaFuelFields): FuelType {
  const atv = (row.atvType || '').toLowerCase();
  const ft = (row.fuelType || row.fuelType1 || '').toLowerCase();
  const model = (row.model || '').toLowerCase();
  if (
    atv.includes('fcv') ||
    ft.includes('hydrogen') ||
    model.includes('fuel cell') ||
    model.includes('mirai') ||
    model.includes('nexo')
  ) {
    return 'hydrogen';
  }
  // PHEV before electricity — "Premium Gas or Electricity" contains "electricity".
  if (atv.includes('plug-in hybrid') || atv.includes('phev')) return 'plug-in hybrid';
  if (atv === 'ev' || ft.includes('electricity')) return 'electric';
  if (atv.includes('hybrid') || ft.includes('hybrid')) return 'hybrid';
  if (ft.includes('diesel')) return 'diesel';
  if (atv === 'cng' || ft === 'cng') return 'natural gas';
  return 'gasoline';
}
