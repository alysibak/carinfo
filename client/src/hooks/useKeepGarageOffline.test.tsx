import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeepGarageOffline } from './useKeepGarageOffline';
import { savedCarUrls } from '../services/api';
import { useGarageStore } from '../stores/garageStore';
import { useRegionStore } from '../stores/regionStore';
import * as keep from '../utils/keepOffline';
import { trustDashboard } from '../test/fixtures';

function Keeper() {
  useKeepGarageOffline();
  return null;
}

describe('saved cars kept for no signal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.spyOn(keep, 'keepGarageOffline').mockImplementation(() => {});
    useRegionStore.setState({ region: 'ontario', annualKm: null });
    useGarageStore.setState({ cars: [{ ...trustDashboard.car, id: 'rav4 2026' }] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('names each car’s page data and records as the browser asks for them', () => {
    expect(savedCarUrls('rav4 2026', 'ontario', null)).toEqual([
      '/api/cars/rav4%202026/dashboard?region=ontario',
      '/api/cars/rav4%202026/records',
    ]);
    expect(savedCarUrls('x', 'quebec', 25000)[0]).toBe(
      '/api/cars/x/dashboard?region=quebec&km=25000',
    );
  });

  it('tells the worker once the list settles, and not again until it changes', () => {
    const { rerender } = render(<Keeper />);
    vi.advanceTimersByTime(1500);
    expect(keep.keepGarageOffline).toHaveBeenCalledTimes(1);
    expect(keep.keepGarageOffline).toHaveBeenLastCalledWith(
      savedCarUrls('rav4 2026', 'ontario', null),
    );

    rerender(<Keeper />);
    vi.advanceTimersByTime(1500);
    expect(keep.keepGarageOffline).toHaveBeenCalledTimes(1);

    useRegionStore.setState({ annualKm: 30000 });
    rerender(<Keeper />);
    vi.advanceTimersByTime(1500);
    expect(keep.keepGarageOffline).toHaveBeenCalledTimes(2);
    expect(keep.keepGarageOffline).toHaveBeenLastCalledWith(
      savedCarUrls('rav4 2026', 'ontario', 30000),
    );
  });
});
