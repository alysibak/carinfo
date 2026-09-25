import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getRegionalAssumptions, type RegionId } from '@carinfo/config/regional-assumptions';

/** Same union the API accepts; defined once in server/src/config. */
export type ClientRegionId = RegionId;

interface RegionStore {
  region: ClientRegionId;
  setRegion: (region: ClientRegionId) => void;
}

export const REGION_OPTIONS: { id: ClientRegionId; label: string }[] = [
  { id: 'ontario', label: 'Ontario' },
  { id: 'british-columbia', label: 'B.C.' },
];

/** The chosen region's full name ("British Columbia"), for prose. */
export function regionName(region: ClientRegionId): string {
  return getRegionalAssumptions(region).label;
}

export const useRegionStore = create<RegionStore>()(
  persist(
    (set) => ({
      region: 'ontario',
      setRegion: (region) => set({ region }),
    }),
    { name: 'carinfo-region' },
  ),
);
