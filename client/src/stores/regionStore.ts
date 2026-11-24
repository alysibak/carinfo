import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { RegionId } from '@carinfo/config/regional-assumptions';
import { plausibleAnnualKm, REGION_NAMES } from '@carinfo/config/regions';
import { msg } from '../i18n';

/** Same union the API accepts; defined once in server/src/config. */
export type ClientRegionId = RegionId;

interface RegionStore {
  region: ClientRegionId;
  /** The visitor's own yearly distance, km; null for the region's average. */
  annualKm: number | null;
  setRegion: (region: ClientRegionId) => void;
  setAnnualKm: (km: number | null) => void;
}

export { plausibleAnnualKm };

export const REGION_OPTIONS: { id: ClientRegionId; label: string }[] = [
  { id: 'ontario', label: msg('Ontario') },
  { id: 'british-columbia', label: msg('B.C.') },
  { id: 'alberta', label: msg('Alberta') },
  { id: 'quebec', label: msg('Quebec') },
  { id: 'manitoba', label: msg('Manitoba') },
  { id: 'saskatchewan', label: msg('Saskatchewan') },
  { id: 'nova-scotia', label: msg('Nova Scotia') },
  { id: 'new-brunswick', label: msg('New Brunswick') },
  { id: 'prince-edward-island', label: msg('P.E.I.') },
  { id: 'newfoundland-and-labrador', label: msg('N.L.') },
];

/** The chosen region's full name ("British Columbia"), for prose. */
export function regionName(region: ClientRegionId): string {
  return REGION_NAMES[region] ?? REGION_NAMES.ontario;
}

export const useRegionStore = create<RegionStore>()(
  persist(
    (set) => ({
      region: 'ontario',
      annualKm: null,
      setRegion: (region) => set({ region }),
      setAnnualKm: (km) => set({ annualKm: plausibleAnnualKm(km) ? Math.round(km) : null }),
    }),
    { name: 'carinfo-region' },
  ),
);
