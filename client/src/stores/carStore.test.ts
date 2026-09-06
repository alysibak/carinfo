import { beforeEach, describe, expect, it } from 'vitest';
import { useCarStore } from './carStore';
import { sparseDashboard } from '../test/fixtures';
import type { CarSpecs } from '../types/car.types';

function carWithId(id: string): CarSpecs {
  return { ...sparseDashboard.car, id };
}

describe('carStore compare', () => {
  beforeEach(() => {
    useCarStore.setState({ comparedCars: [] });
  });

  it('adds until full, then swaps the oldest', () => {
    const store = useCarStore.getState();
    for (let i = 0; i < 5; i++) {
      const res = store.addOrReplaceOldestInComparison(carWithId(`c${i}`));
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.swappedOut).toBeUndefined();
    }
    expect(useCarStore.getState().comparedCars.map((c) => c.id)).toEqual([
      'c0',
      'c1',
      'c2',
      'c3',
      'c4',
    ]);

    const swap = useCarStore.getState().addOrReplaceOldestInComparison(carWithId('c5'));
    expect(swap.ok).toBe(true);
    if (swap.ok) {
      expect(swap.swappedOut?.id).toBe('c0');
    }
    expect(useCarStore.getState().comparedCars.map((c) => c.id)).toEqual([
      'c1',
      'c2',
      'c3',
      'c4',
      'c5',
    ]);
  });

  it('rejects duplicates without swapping', () => {
    useCarStore.getState().addOrReplaceOldestInComparison(carWithId('a'));
    const res = useCarStore.getState().addOrReplaceOldestInComparison(carWithId('a'));
    expect(res).toEqual({ ok: false, reason: 'duplicate', message: 'Already in compare' });
  });
});
