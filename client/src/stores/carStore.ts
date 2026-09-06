import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CarSpecs, SearchQuery, SearchResults } from '../types/car.types';
import * as api from '../services/api';
import { MAX_COMPARE } from '../utils/compareIds';

export type CompareAddResult =
  | { ok: true; swappedOut?: CarSpecs }
  | { ok: false; reason: 'duplicate' | 'limit'; message: string };

interface CarStore {
  // Search state
  searchResults: SearchResults | null;
  searchQuery: SearchQuery;
  isSearching: boolean;
  searchError: string | null;

  // Comparison state
  comparedCars: CarSpecs[];
  maxCompared: number;

  // Available filters
  availableMakes: string[];
  availableModels: string[];

  // Actions
  setSearchQuery: (query: SearchQuery) => void;
  performSearch: () => Promise<void>;
  addCarToComparison: (car: CarSpecs) => CompareAddResult;
  /** Add, or if full, replace the oldest compare slot. */
  addOrReplaceOldestInComparison: (car: CarSpecs) => CompareAddResult;
  replaceComparison: (cars: CarSpecs[]) => void;
  removeCarFromComparison: (carId: string) => void;
  clearComparison: () => void;
  loadMakes: () => Promise<void>;
  loadModels: (make: string) => Promise<void>;
}

export const useCarStore = create<CarStore>()(
  persist(
    (set, get) => ({
      // Initial state
      searchResults: null,
      searchQuery: {
        query: '',
        filters: {},
        sort: { field: 'year', order: 'desc' },
        collapseByModel: true,
        limit: 36,
        offset: 0,
      },
      isSearching: false,
      searchError: null,
      comparedCars: [],
      maxCompared: MAX_COMPARE,
      availableMakes: [],
      availableModels: [],

      // Actions
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      performSearch: async () => {
        set({ isSearching: true, searchError: null });
        try {
          const results = await api.searchCars(get().searchQuery);
          set({ searchResults: results, isSearching: false, searchError: null });
        } catch (error) {
          console.error('Search failed:', error);
          set({ isSearching: false, searchError: 'Search failed. Please try again.' });
        }
      },

      addCarToComparison: (car) => {
        const { comparedCars, maxCompared } = get();
        if (comparedCars.some((c) => c.id === car.id)) {
          return { ok: false, reason: 'duplicate', message: 'Already in compare' };
        }
        if (comparedCars.length >= maxCompared) {
          return {
            ok: false,
            reason: 'limit',
            message: `You can compare up to ${maxCompared} vehicles at once. Remove one first.`,
          };
        }
        set({ comparedCars: [...comparedCars, car] });
        return { ok: true };
      },

      addOrReplaceOldestInComparison: (car) => {
        const { comparedCars, maxCompared } = get();
        if (comparedCars.some((c) => c.id === car.id)) {
          return { ok: false, reason: 'duplicate', message: 'Already in compare' };
        }
        if (comparedCars.length < maxCompared) {
          set({ comparedCars: [...comparedCars, car] });
          return { ok: true };
        }
        const [oldest, ...rest] = comparedCars;
        set({ comparedCars: [...rest, car] });
        return { ok: true, swappedOut: oldest };
      },

      replaceComparison: (cars) => {
        const seen = new Set<string>();
        const next: CarSpecs[] = [];
        for (const car of cars) {
          if (seen.has(car.id)) continue;
          seen.add(car.id);
          next.push(car);
          if (next.length >= get().maxCompared) break;
        }
        set({ comparedCars: next });
      },

      removeCarFromComparison: (carId) => {
        set({
          comparedCars: get().comparedCars.filter((car) => car.id !== carId),
        });
      },

      clearComparison: () => {
        set({ comparedCars: [] });
      },

      loadMakes: async () => {
        try {
          const makes = await api.getMakes();
          set({ availableMakes: makes });
        } catch (error) {
          console.error('Failed to load makes:', error);
        }
      },

      loadModels: async (make) => {
        try {
          const models = await api.getModelsByMake(make);
          set({ availableModels: models });
        } catch (error) {
          console.error('Failed to load models:', error);
        }
      },
    }),
    {
      name: 'carinfo-compare',
      // Only the comparison survives a reload — search results and filters are
      // re-fetched from the URL on every visit.
      partialize: (state) => ({ comparedCars: state.comparedCars }),
    },
  ),
);
