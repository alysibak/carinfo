import { useEffect } from 'react';
import { savedCarUrls } from '../services/api';
import { useGarageStore } from '../stores/garageStore';
import { useRegionStore } from '../stores/regionStore';
import { keepGarageOffline } from '../utils/keepOffline';

const SENT_KEY = 'carinfo-garage-kept';
/** Asked again after this long anyway, for new recalls on the cars kept. */
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Keeps the saved cars ready for no signal: when the list, the region or the
 * visitor's distance changes (or a week has passed), tells the service worker
 * which cars' data to hold. A moment after the change, once.
 */
export function useKeepGarageOffline(): void {
  const ids = useGarageStore((s) => s.cars.map((car) => car.id).join('\n'));
  const region = useRegionStore((s) => s.region);
  const ownKm = useRegionStore((s) => s.annualKm);

  useEffect(() => {
    const urls = ids ? ids.split('\n').flatMap((id) => savedCarUrls(id, region, ownKm)) : [];
    const key = urls.join(' ');
    const timer = setTimeout(() => {
      try {
        const sent = JSON.parse(localStorage.getItem(SENT_KEY) ?? 'null') as {
          key: string;
          at: number;
        } | null;
        if (sent?.key === key && Date.now() - sent.at < REFRESH_MS) return;
        localStorage.setItem(SENT_KEY, JSON.stringify({ key, at: Date.now() }));
      } catch {
        // Storage refused: ask anyway; the worker keeps no more than the list.
      }
      keepGarageOffline(urls);
    }, 1500);
    return () => clearTimeout(timer);
  }, [ids, region, ownKm]);
}
