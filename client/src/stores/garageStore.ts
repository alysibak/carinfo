import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CarSpecs } from '../types/car.types';
import * as accountApi from '../services/accountApi';
import { isGarageLimitError } from '../services/accountApi';

export const FREE_GARAGE_LIMIT = 10;

type AddResult =
  | { ok: true }
  | { ok: false; reason: 'duplicate' | 'limit'; limit?: number; message?: string };

interface GarageStore {
  cars: CarSpecs[];
  syncMode: 'local' | 'cloud';
  plan: 'free' | 'pro';
  garageLimit: number | null;
  lastSyncError: string | null;
  add: (car: CarSpecs) => AddResult | Promise<AddResult>;
  remove: (carId: string) => void | Promise<void>;
  clear: () => void | Promise<void>;
  mergeMany: (cars: CarSpecs[]) => void;
  setSyncMode: (mode: 'local' | 'cloud') => void;
  setPlan: (plan: 'free' | 'pro', garageLimit: number | null) => void;
  /** Merge local IDs into cloud, then replace local with server garage. */
  syncFromCloud: () => Promise<void>;
  /** Drop cloud mode after sign-out (keep local cars). */
  detachCloud: () => void;
}

function effectiveLimit(plan: 'free' | 'pro', garageLimit: number | null): number | null {
  if (plan === 'pro') return null;
  return garageLimit ?? FREE_GARAGE_LIMIT;
}

export const useGarageStore = create<GarageStore>()(
  persist(
    (set, get) => ({
      cars: [],
      syncMode: 'local',
      plan: 'free',
      garageLimit: FREE_GARAGE_LIMIT,
      lastSyncError: null,

      setSyncMode: (mode) => set({ syncMode: mode }),

      setPlan: (plan, garageLimit) => set({ plan, garageLimit }),

      detachCloud: () =>
        set({
          syncMode: 'local',
          plan: 'free',
          garageLimit: FREE_GARAGE_LIMIT,
          lastSyncError: null,
        }),

      add: async (car) => {
        const state = get();
        if (state.cars.some((c) => c.id === car.id)) {
          return { ok: false, reason: 'duplicate' };
        }

        const limit = effectiveLimit(state.plan, state.garageLimit);
        if (limit != null && state.cars.length >= limit) {
          return {
            ok: false,
            reason: 'limit',
            limit,
            message: `Free plan allows up to ${limit} saved vehicles. Upgrade to Pro for an unlimited garage.`,
          };
        }

        // Optimistic local update
        set({ cars: [...state.cars, car], lastSyncError: null });

        if (state.syncMode === 'cloud') {
          try {
            const res = await accountApi.addMyGarageItem(car.id);
            set({
              plan: res.plan,
              garageLimit: res.garageLimit,
            });
          } catch (error) {
            // Roll back optimistic add
            set({ cars: get().cars.filter((c) => c.id !== car.id) });
            if (isGarageLimitError(error)) {
              return {
                ok: false,
                reason: 'limit',
                limit: error.response.data.limit ?? FREE_GARAGE_LIMIT,
                message: error.response.data.error,
              };
            }
            set({
              lastSyncError: 'Could not sync garage to your account. Saved on this device only for now.',
            });
          }
        }

        return { ok: true };
      },

      remove: async (carId) => {
        const prev = get().cars;
        set({ cars: prev.filter((c) => c.id !== carId), lastSyncError: null });
        if (get().syncMode === 'cloud') {
          try {
            await accountApi.removeMyGarageItem(carId);
          } catch {
            set({
              cars: prev,
              lastSyncError: 'Could not sync removal. Try again when online.',
            });
          }
        }
      },

      clear: async () => {
        const prev = get().cars;
        set({ cars: [], lastSyncError: null });
        if (get().syncMode === 'cloud') {
          try {
            await accountApi.putMyGarage([]);
          } catch {
            set({
              cars: prev,
              lastSyncError: 'Could not clear cloud garage. Try again when online.',
            });
          }
        }
      },

      mergeMany: (incoming) => {
        const byId = new Map(get().cars.map((c) => [c.id, c]));
        for (const car of incoming) byId.set(car.id, car);
        set({ cars: Array.from(byId.values()) });
      },

      syncFromCloud: async () => {
        const localIds = get().cars.map((c) => c.id);
        try {
          // Pull server first to know plan limits, then merge local → server
          const remote = await accountApi.getMyGarage();
          set({
            plan: remote.plan,
            garageLimit: remote.garageLimit,
            syncMode: 'cloud',
          });

          const mergedIds = Array.from(new Set([...remote.ids, ...localIds]));
          const limit = effectiveLimit(remote.plan, remote.garageLimit);
          const capped =
            limit != null && mergedIds.length > limit ? mergedIds.slice(0, limit) : mergedIds;

          const saved = await accountApi.putMyGarage(capped);
          const cars =
            saved.cars && saved.cars.length > 0
              ? saved.cars
              : capped
                  .map((id) => get().cars.find((c) => c.id === id) || remote.cars?.find((c) => c.id === id))
                  .filter((c): c is CarSpecs => c != null);

          // Prefer server-hydrated cars; fall back to local specs for any missing
          const byId = new Map<string, CarSpecs>();
          for (const c of get().cars) byId.set(c.id, c);
          if (remote.cars) for (const c of remote.cars) byId.set(c.id, c);
          if (saved.cars) for (const c of saved.cars) byId.set(c.id, c);
          const ordered = saved.ids.map((id) => byId.get(id)).filter((c): c is CarSpecs => c != null);

          set({
            cars: ordered.length > 0 ? ordered : cars,
            plan: saved.plan,
            garageLimit: saved.garageLimit,
            syncMode: 'cloud',
            lastSyncError:
              limit != null && mergedIds.length > limit
                ? `Synced ${limit} of ${mergedIds.length} vehicles (free plan limit). Upgrade to Pro to keep them all.`
                : null,
          });
        } catch (error) {
          console.error('[garage] syncFromCloud failed:', error);
          set({
            lastSyncError: 'Could not sync with your account. Using this device for now.',
            syncMode: 'local',
          });
        }
      },
    }),
    {
      name: 'dreamGarage',
      partialize: (state) => ({ cars: state.cars }),
    },
  ),
);
