import { create } from 'zustand';
import type { CarSpecs, SearchQuery, SearchResults } from '../types/car.types';
import * as api from '../services/api';

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
  addCarToComparison: (car: CarSpecs) => void;
  removeCarFromComparison: (carId: string) => void;
  clearComparison: () => void;
  loadMakes: () => Promise<void>;
  loadModels: (make: string) => Promise<void>;
}

export const useCarStore = create<CarStore>((set, get) => ({
  // Initial state
  searchResults: null,
  searchQuery: {
    query: '',
    filters: {},
    sort: { field: 'year', order: 'desc' },
    limit: 50,
    offset: 0,
  },
  isSearching: false,
  searchError: null,
  comparedCars: [],
  maxCompared: 5,
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
    if (comparedCars.length >= maxCompared) {
      alert(`You can only compare up to ${maxCompared} cars at once`);
      return;
    }
    if (comparedCars.some((c) => c.id === car.id)) {
      return; // Already in comparison
    }
    set({ comparedCars: [...comparedCars, car] });
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
}));
