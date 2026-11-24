import { useMemo } from 'react';
import {
  getRegionalAssumptions,
  type RegionalAssumptions,
  type RegionId,
} from '@carinfo/config/regional-assumptions';
import { plausibleAnnualKm, useRegionStore } from '../stores/regionStore';

/**
 * The region's prices on the visitor's own yearly distance, when they gave
 * one: every fuel and running cost on the site is worked out from this.
 * What is typical for the region (a listing's odometer) stays the region's.
 */
export function costAssumptions(region: RegionId, ownKm: number | null): RegionalAssumptions {
  const regional = getRegionalAssumptions(region);
  return plausibleAnnualKm(ownKm) ? { ...regional, annualKm: ownKm } : regional;
}

/** The same for a component, following the visitor's region and distance. */
export function useCostAssumptions(): RegionalAssumptions {
  const region = useRegionStore((s) => s.region);
  const ownKm = useRegionStore((s) => s.annualKm);
  return useMemo(() => costAssumptions(region, ownKm), [region, ownKm]);
}
