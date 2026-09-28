import { useCallback, useState } from 'react';
import type { CarCardLayout } from '../components/CarCard';

const STORAGE_KEY = 'carinfo-results-view';

/**
 * Grid or list for search results, remembered on this device. Phones start
 * on the list: at about 90 px a row instead of 300 px a card, thirty Civics
 * no longer take eleven thousand pixels of scrolling.
 */
export function useResultsView(): [CarCardLayout, (view: CarCardLayout) => void] {
  const [view, setView] = useState<CarCardLayout>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'grid' || stored === 'list') return stored;
    } catch {
      /* storage blocked: fall through to the screen-size default */
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(max-width: 767px)').matches ? 'list' : 'grid';
    }
    return 'grid';
  });

  const choose = useCallback((next: CarCardLayout) => {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the choice just lasts for this visit */
    }
  }, []);

  return [view, choose];
}
