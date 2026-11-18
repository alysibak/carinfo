import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * How the site looks on this device: dark (the default), light, or whichever
 * the device is set to; and standard or larger text. public/theme-init.js
 * applies the saved choice before the first paint; this keeps it applied.
 */
export type ThemeChoice = 'dark' | 'light' | 'system';
export type TextSize = 'standard' | 'large';

interface DisplayStore {
  theme: ThemeChoice;
  textSize: TextSize;
  setTheme: (theme: ThemeChoice) => void;
  setTextSize: (textSize: TextSize) => void;
}

export const useDisplayStore = create<DisplayStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      textSize: 'standard',
      setTheme: (theme) => set({ theme }),
      setTextSize: (textSize) => set({ textSize }),
    }),
    { name: 'carinfo-display' },
  ),
);

const lightQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

export function applyDisplay({ theme, textSize }: Pick<DisplayStore, 'theme' | 'textSize'>): void {
  if (typeof document === 'undefined') return;
  const light = theme === 'light' || (theme === 'system' && Boolean(lightQuery?.matches));
  const root = document.documentElement;
  if (light) root.dataset.theme = 'light';
  else delete root.dataset.theme;
  if (textSize === 'large') root.dataset.text = 'large';
  else delete root.dataset.text;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', light ? '#f4f4f6' : '#0c0c0e');
}

applyDisplay(useDisplayStore.getState());
useDisplayStore.subscribe(applyDisplay);
lightQuery?.addEventListener?.('change', () => applyDisplay(useDisplayStore.getState()));
