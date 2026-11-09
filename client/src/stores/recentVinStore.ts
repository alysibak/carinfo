import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VinDecodeResult } from '../services/api';

/** A VIN looked up on this device, with what it decoded as to know it by. */
export interface RecentVin {
  vin: string;
  /** "2003 Honda Accord", as the decoder gave it; null when it named nothing. */
  title: string | null;
}

/** The newest few: a lot walked in an afternoon, not a record. */
export const MAX_RECENT_VINS = 6;

interface RecentVinStore {
  vins: RecentVin[];
  /** Puts the VIN first, once. */
  record: (entry: RecentVin) => void;
  clear: () => void;
}

/**
 * The VINs looked up on this device, newest first: someone walking a lot,
 * scanning one car after another, goes back to any of them with a tap. Kept in
 * this browser's storage only; never sent.
 */
export const useRecentVinStore = create<RecentVinStore>()(
  persist(
    (set) => ({
      vins: [],
      record: (entry) =>
        set((state) => ({
          vins: [entry, ...state.vins.filter((v) => v.vin !== entry.vin)].slice(0, MAX_RECENT_VINS),
        })),
      clear: () => set({ vins: [] }),
    }),
    { name: 'carinfo-recent-vins', version: 1 },
  ),
);

/** A decoded VIN as the recent list keeps it. */
export function recentVinEntry(result: VinDecodeResult): RecentVin {
  const title = [result.year, result.make, result.model].filter(Boolean).join(' ');
  return { vin: result.vin, title: title || null };
}
