import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CarSpecs } from '../types/car.types';
import { bodyStyleLabel } from '../utils/bodyStyleLabel';
import {
  displayConfigSubtitle,
  displayVehicleTitle,
  formatTransmissionLabel,
} from '../utils/trimLabel';

/** A car page someone opened: enough to name it and link back, nothing more. */
export interface RecentCar {
  id: string;
  /** "2022 Honda Civic". */
  title: string;
  /** What sets the version apart: "Sedan · CVT · FWD". */
  detail: string | null;
}

/** The newest few; older ones drop off. */
export const MAX_RECENT = 8;

interface RecentStore {
  cars: RecentCar[];
  /** Puts the car first, once. */
  record: (car: RecentCar) => void;
  clear: () => void;
}

/**
 * The car pages opened on this device, newest first, so someone can pick up
 * where they left off. Kept in this browser's storage only; never sent.
 */
export const useRecentStore = create<RecentStore>()(
  persist(
    (set) => ({
      cars: [],
      record: (car) =>
        set((state) => ({
          cars: [car, ...state.cars.filter((c) => c.id !== car.id)].slice(0, MAX_RECENT),
        })),
      clear: () => set({ cars: [] }),
    }),
    { name: 'carinfo-recent', version: 1 },
  ),
);

/** A car as the recent list keeps it: its title, and what sets the version apart. */
export function recentEntry(car: CarSpecs): RecentCar {
  const gearbox = car.transmission?.type ? formatTransmissionLabel(car.transmission) : null;
  const config = displayConfigSubtitle(car);
  // The configuration can name the gearbox too ("20-inch wheels · Automatic"): once is enough.
  const seen = new Set<string>();
  const parts = [
    config ?? (car.bodyStyle ? bodyStyleLabel(car.bodyStyle) : null),
    gearbox,
    car.driveType,
  ]
    .flatMap((part) => (part ? part.split(' · ') : []))
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return { id: car.id, title: displayVehicleTitle(car), detail: parts.join(' · ') || null };
}
