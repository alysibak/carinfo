import { useCallback, useEffect, useState } from 'react';
import { fetchAllCars, invalidateAllCarsCache } from '../services/api';
import type { CarSpecs } from '../types/car.types';

export function useAllCars() {
  const [cars, setCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => {
    invalidateAllCarsCache();
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAllCars()
      .then((results) => {
        if (!cancelled) {
          setCars(results);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load all cars:', err);
          setError('Unable to load vehicle database');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { cars, loading, error, refetch };
}
