import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCarStore } from './carStore';
import * as api from '../services/api';
import { sparseDashboard } from '../test/fixtures';
import type { CarSpecs, SearchResults } from '../types/car.types';

vi.mock('../services/api', () => ({ searchCars: vi.fn() }));
const searchCars = vi.mocked(api.searchCars);

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

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const resultsFor = (query: string): SearchResults => ({
  results: [carWithId(query)],
  total: 1,
  hasMore: false,
});

/** Start a live search for `query`, as typing does. */
function search(query: string) {
  const { setSearchQuery, searchQuery, performSearch } = useCarStore.getState();
  setSearchQuery({ ...searchQuery, query });
  return performSearch();
}

describe('carStore search', () => {
  beforeEach(() => {
    searchCars.mockReset();
    useCarStore.setState({ searchResults: null, isSearching: false, searchError: null });
  });

  it('keeps the newest results when an older search answers last', async () => {
    // Regression: "toy" (broad, slow) answering after "toyota" overwrote it.
    const toy = deferred<SearchResults>();
    const toyota = deferred<SearchResults>();
    searchCars.mockReturnValueOnce(toy.promise).mockReturnValueOnce(toyota.promise);

    const first = search('toy');
    const second = search('toyota');
    toyota.resolve(resultsFor('toyota'));
    await second;
    toy.resolve(resultsFor('toy'));
    await first;

    const state = useCarStore.getState();
    expect(state.searchResults).toEqual(resultsFor('toyota'));
    expect(state.isSearching).toBe(false);
  });

  it('cancels the request it supersedes', async () => {
    searchCars.mockReturnValue(new Promise(() => {}));
    void search('toy');
    void search('toyota');
    const [firstSignal, secondSignal] = searchCars.mock.calls.map(([, options]) => options?.signal);
    expect(firstSignal?.aborted).toBe(true);
    expect(secondSignal?.aborted).toBe(false);
  });

  it('ignores the failure of a superseded search', async () => {
    const toy = deferred<SearchResults>();
    const toyota = deferred<SearchResults>();
    searchCars.mockReturnValueOnce(toy.promise).mockReturnValueOnce(toyota.promise);

    const first = search('toy');
    const second = search('toyota');
    toy.reject(new DOMException('superseded', 'AbortError'));
    await first;
    // The live search is still running and nothing has failed.
    expect(useCarStore.getState()).toMatchObject({ isSearching: true, searchError: null });

    toyota.resolve(resultsFor('toyota'));
    await second;
    expect(useCarStore.getState()).toMatchObject({
      isSearching: false,
      searchError: null,
      searchResults: resultsFor('toyota'),
    });
  });

  it('reports the failure of the current search', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    searchCars.mockRejectedValueOnce(new Error('offline'));
    await search('toyota');
    expect(useCarStore.getState()).toMatchObject({
      isSearching: false,
      searchError: 'Search failed. Please try again.',
    });
    spy.mockRestore();
  });
});
