import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../services/api';
import { dashboardKey, modelKey, prefetchForPath, takePrefetched } from './prefetch';

vi.mock('../services/api', () => ({
  getCarDashboard: vi.fn(() => Promise.resolve({ car: { photo: undefined } })),
  getModelOverview: vi.fn(() => Promise.resolve({ lead: { photo: undefined } })),
}));

describe('prefetchForPath', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts a car page’s request once, for the page to take once', async () => {
    prefetchForPath('/car/honda-civic-2022');
    prefetchForPath('/car/honda-civic-2022');
    expect(api.getCarDashboard).toHaveBeenCalledTimes(1);
    expect(api.getCarDashboard).toHaveBeenCalledWith('honda-civic-2022', 'ontario');

    const taken = takePrefetched(dashboardKey('honda-civic-2022', 'ontario'));
    await expect(taken).resolves.toEqual({ car: { photo: undefined } });
    // A later visit asks afresh.
    expect(takePrefetched(dashboardKey('honda-civic-2022', 'ontario'))).toBeUndefined();
  });

  it('starts a model page’s request', () => {
    prefetchForPath('/models/honda/civic');
    expect(api.getModelOverview).toHaveBeenCalledWith('honda', 'civic');
    expect(takePrefetched(modelKey('honda', 'civic'))).toBeDefined();
  });

  it('leaves other pages, and a malformed address, to themselves', () => {
    prefetchForPath('/home');
    prefetchForPath('/car/honda-civic-2022/checklist');
    expect(() => prefetchForPath('/car/%E0%A4%A')).not.toThrow();
    expect(api.getCarDashboard).not.toHaveBeenCalled();
    expect(api.getModelOverview).not.toHaveBeenCalled();
  });
});
