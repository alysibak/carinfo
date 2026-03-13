import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CarSpecs } from '../types/car.types';

interface GarageStore {
  cars: CarSpecs[];
  add: (car: CarSpecs) => { ok: true } | { ok: false; reason: 'duplicate' };
  remove: (carId: string) => void;
  clear: () => void;
  mergeMany: (cars: CarSpecs[]) => void;
}

export const useGarageStore = create<GarageStore>()(
  persist(
    (set, get) => ({
      cars: [],
      add: (car) => {
        const existing = get().cars;
        if (existing.some((c) => c.id === car.id)) {
          return { ok: false, reason: 'duplicate' };
        }
        set({ cars: [...existing, car] });
        return { ok: true };
      },
      remove: (carId) => {
        set({ cars: get().cars.filter((c) => c.id !== carId) });
      },
      clear: () => set({ cars: [] }),
      mergeMany: (incoming) => {
        const byId = new Map(get().cars.map((c) => [c.id, c]));
        for (const car of incoming) byId.set(car.id, car);
        set({ cars: Array.from(byId.values()) });
      },
    }),
    {
      name: 'dreamGarage',
      partialize: (state) => ({ cars: state.cars }),
    },
  ),
);

