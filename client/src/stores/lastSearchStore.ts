import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The last search that found cars on this device, to offer back on the home page. */
interface LastSearchStore {
  /** The search page's query string: "?q=rav4&fuel=hybrid". */
  search: string | null;
  /** What it was for, in words: "rav4 · Hybrid". */
  label: string | null;
  remember: (search: string, label: string) => void;
  forget: () => void;
}

export const useLastSearchStore = create<LastSearchStore>()(
  persist(
    (set) => ({
      search: null,
      label: null,
      remember: (search, label) => set({ search, label }),
      forget: () => set({ search: null, label: null }),
    }),
    { name: 'carinfo-last-search' },
  ),
);
