import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CarSpecs } from '../types/car.types';
import * as accountApi from '../services/accountApi';
import { isGarageLimitError } from '../services/accountApi';

// Defined once, alongside the server's enforcement of it. Re-exported so the
// existing `from '../stores/garageStore'` imports keep working.
import { FREE_GARAGE_LIMIT } from '@carinfo/types/account.types';
export { FREE_GARAGE_LIMIT };

type AddResult =
  { ok: true } | { ok: false; reason: 'duplicate' | 'limit'; limit?: number; message?: string };

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

/**
 * Bumped on sign-out. A sync that started under an earlier generation discards
 * its result: otherwise a sync still in flight when someone signs out would
 * land afterwards and write that account's garage back into the store — on a
 * shared device, the next person would see it.
 */
let syncGeneration = 0;

/** Put `car` back at (or near) the index it was removed from. */
function reinsert(cars: CarSpecs[], car: CarSpecs, index: number): CarSpecs[] {
  if (cars.some((c) => c.id === car.id)) return cars;
  const next = [...cars];
  next.splice(Math.min(index, next.length), 0, car);
  return next;
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

      detachCloud: () => {
        syncGeneration += 1;
        set({
          syncMode: 'local',
          plan: 'free',
          garageLimit: FREE_GARAGE_LIMIT,
          lastSyncError: null,
        });
      },

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
                limit: error.body.limit ?? FREE_GARAGE_LIMIT,
                message: error.body.error,
              };
            }
            set({
              lastSyncError:
                'Could not sync garage to your account. Saved on this device only for now.',
            });
          }
        }

        return { ok: true };
      },

      remove: async (carId) => {
        const before = get().cars;
        const index = before.findIndex((c) => c.id === carId);
        if (index === -1) return;
        const removed = before[index];
        set({ cars: before.filter((c) => c.id !== carId), lastSyncError: null });
        if (get().syncMode === 'cloud') {
          try {
            await accountApi.removeMyGarageItem(carId);
          } catch {
            // Put back only this car. Restoring the whole earlier snapshot would
            // undo any add or remove that happened while this request was in
            // flight — resurrecting one car or dropping another.
            set({
              cars: reinsert(get().cars, removed, index),
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
            // Keep anything added since, and restore what the clear removed.
            const added = get().cars.filter((c) => !prev.some((p) => p.id === c.id));
            set({
              cars: [...prev, ...added],
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
        const generation = syncGeneration;
        const stale = () => generation !== syncGeneration;
        const localIds = get().cars.map((c) => c.id);
        try {
          // Pull server first to know plan limits, then merge local → server
          const remote = await accountApi.getMyGarage();
          if (stale()) return;
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
          if (stale()) return;
          const cars =
            saved.cars && saved.cars.length > 0
              ? saved.cars
              : capped
                  .map(
                    (id) =>
                      get().cars.find((c) => c.id === id) || remote.cars?.find((c) => c.id === id),
                  )
                  .filter((c): c is CarSpecs => c != null);

          // Prefer server-hydrated cars; fall back to local specs for any missing
          const byId = new Map<string, CarSpecs>();
          for (const c of get().cars) byId.set(c.id, c);
          if (remote.cars) for (const c of remote.cars) byId.set(c.id, c);
          if (saved.cars) for (const c of saved.cars) byId.set(c.id, c);
          const ordered = saved.ids
            .map((id) => byId.get(id))
            .filter((c): c is CarSpecs => c != null);

          // Cars that did not fit under the free cap exist only on this device.
          // Keep them here rather than discarding them: replacing local state
          // with the capped cloud list used to delete them for good, while the
          // message told the user that upgrading would keep them.
          const synced = ordered.length > 0 ? ordered : cars;
          const syncedIds = new Set(synced.map((c) => c.id));
          const cutByCap = new Set(mergedIds.slice(capped.length));
          const deviceOnly = get().cars.filter((c) => cutByCap.has(c.id) && !syncedIds.has(c.id));
          const overflow = deviceOnly.length;

          set({
            cars: [...synced, ...deviceOnly],
            plan: saved.plan,
            garageLimit: saved.garageLimit,
            syncMode: 'cloud',
            lastSyncError:
              overflow > 0
                ? `${overflow} vehicle${overflow === 1 ? ' is' : 's are'} saved on this device only (free plan limit is ${limit}). Upgrade to Pro to sync ${overflow === 1 ? 'it' : 'them'} to your account.`
                : null,
          });
        } catch (error) {
          if (stale()) return;
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

/** Test seam: forget the in-memory sync generation between tests. */
export function __resetGarageSyncForTests(): void {
  syncGeneration = 0;
}
