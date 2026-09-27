import type { FuelType } from '../../src/types/car.types.js';

/** The EPA vehicles.csv columns that decide a powertrain's fuel type. */
export interface EpaFuelFields {
  model?: string;
  fuelType?: string;
  fuelType1?: string;
  atvType?: string;
  /** Engine notes: "SIDI; Mild Hybrid", "Mild Hybrid; eTorque". */
  eng_dscr?: string;
  /** The hybrid motor and pack: "48V Li-Ion", "259V Li-Ion", "216V Ni-MH". */
  evMotor?: string;
}

/**
 * A mild hybrid: EPA files it under atvType "Hybrid" and says "Mild Hybrid"
 * in its engine notes. The 12-48 V motor assists the engine and restarts it,
 * but never drives the car, so it runs on gasoline like any other: an Audi S8
 * at 16 MPG, a Ram eTorque, a BMW 330i, 778 records in all, were "hybrids".
 * EPA also calls the Lexus UX 250h "Mild Hybrid"; its 216 V Ni-MH pack is a
 * full hybrid's, and it stays one.
 */
export function isEpaMildHybrid(row: EpaFuelFields): boolean {
  const atv = (row.atvType || '').toLowerCase();
  if (!atv.includes('hybrid') || atv.includes('plug-in')) return false;
  if (!/\bmild hybrid\b/i.test(row.eng_dscr ?? '')) return false;
  return !/ni-?mh/i.test(row.evMotor ?? '');
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
  if (isEpaMildHybrid(row)) return ft.includes('diesel') ? 'diesel' : 'gasoline';
  if (atv.includes('hybrid') || ft.includes('hybrid')) return 'hybrid';
  if (ft.includes('diesel')) return 'diesel';
  if (atv === 'cng' || ft === 'cng') return 'natural gas';
  return 'gasoline';
}
