import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { RegionId } from '@carinfo/config/regional-assumptions';

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

export const useRegionStore = create<RegionStore>()(
  persist(
    (set) => ({
      region: 'ontario',
      setRegion: (region) => set({ region }),
    }),
    { name: 'carinfo-region' },
  ),
);
