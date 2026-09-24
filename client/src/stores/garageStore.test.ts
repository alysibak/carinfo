import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { HttpError } from '../services/http';
import type * as AccountApi from '../services/accountApi';

// Network calls are mocked; the error classifier is the real one, so these
// tests pin the contract between the store and what the API actually throws.
vi.mock('../services/accountApi', async (importOriginal) => ({
  ...(await importOriginal<typeof AccountApi>()),
  addMyGarageItem: vi.fn(),
  removeMyGarageItem: vi.fn(),
  putMyGarage: vi.fn(),
  getMyGarage: vi.fn(),
}));

const accountApi = await import('../services/accountApi');
const { useGarageStore, __resetGarageSyncForTests, FREE_GARAGE_LIMIT } =
  await import('./garageStore');

const api = vi.mocked(accountApi);

function car(id: string): CarSpecs {
  return {
    id,
    make: 'Toyota',
    model: id,
    year: 2022,
    provenance: {},
    engine: { fuelType: 'gasoline' },
    fuelEconomy: { city: 30, highway: 38, combined: 33 },
    transmission: { type: 'automatic' },
    driveType: 'FWD',
    bodyStyle: 'sedan',
  };
}

const ids = () => useGarageStore.getState().cars.map((c) => c.id);

/** A promise the test resolves or rejects by hand, to interleave requests. */
function deferred<T = unknown>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.resetAllMocks();
  __resetGarageSyncForTests();
  useGarageStore.setState({
    cars: [],
    syncMode: 'local',
    plan: 'free',
    garageLimit: FREE_GARAGE_LIMIT,
    lastSyncError: null,
  });
});

describe('local garage', () => {
  it('adds, rejects duplicates and enforces the free cap', async () => {
    expect(await useGarageStore.getState().add(car('a'))).toEqual({ ok: true });
    expect(await useGarageStore.getState().add(car('a'))).toMatchObject({
      ok: false,
      reason: 'duplicate',
    });

    useGarageStore.setState({
      cars: Array.from({ length: FREE_GARAGE_LIMIT }, (_, i) => car(`c${i}`)),
    });
    expect(await useGarageStore.getState().add(car('x'))).toMatchObject({
      ok: false,
      reason: 'limit',
    });
  });

  it('never calls the API while local', async () => {
    await useGarageStore.getState().add(car('a'));
    await useGarageStore.getState().remove('a');
    expect(api.addMyGarageItem).not.toHaveBeenCalled();
    expect(api.removeMyGarageItem).not.toHaveBeenCalled();
  });
});

describe('cloud garage', () => {
  beforeEach(() => {
    useGarageStore.setState({ syncMode: 'cloud' });
  });

  it('rolls back an add the server rejects', async () => {
    api.addMyGarageItem.mockRejectedValueOnce(new Error('offline'));
    await useGarageStore.getState().add(car('a'));
    expect(ids()).toEqual([]);
    expect(useGarageStore.getState().lastSyncError).toMatch(/could not sync/i);
  });

  it('surfaces the server’s cap as a limit result', async () => {
    api.addMyGarageItem.mockRejectedValueOnce(
      new HttpError('Free plan allows up to 10', 403, {
        success: false,
        code: 'GARAGE_LIMIT',
        limit: 10,
        error: 'Free plan allows up to 10',
      }),
    );
    const result = await useGarageStore.getState().add(car('a'));
    expect(result).toEqual({
      ok: false,
      reason: 'limit',
      limit: 10,
      message: 'Free plan allows up to 10',
    });
    expect(ids()).toEqual([]);
  });

  it('restores only the car whose removal failed', async () => {
    // Regression: the rollback restored the whole pre-removal snapshot, so a
    // concurrent removal was undone (B resurrected) along with the failed one.
    useGarageStore.setState({ cars: [car('a'), car('b'), car('c')] });
    const removeA = deferred();
    api.removeMyGarageItem
      .mockImplementationOnce(() => removeA.promise as Promise<never>)
      .mockResolvedValueOnce(undefined as never);

    const pendingA = useGarageStore.getState().remove('a');
    await useGarageStore.getState().remove('b'); // succeeds
    removeA.reject(new Error('network'));
    await pendingA;

    expect(ids()).toEqual(['a', 'c']); // a restored in place, b stays removed
  });

  it('does not drop a car added while a removal was in flight', async () => {
    useGarageStore.setState({ cars: [car('a')] });
    const removeA = deferred();
    api.removeMyGarageItem.mockImplementationOnce(() => removeA.promise as Promise<never>);
    api.addMyGarageItem.mockResolvedValueOnce({
      ids: ['c'],
      plan: 'free',
      freeGarageLimit: 10,
      garageLimit: 10,
    });

    const pendingA = useGarageStore.getState().remove('a');
    await useGarageStore.getState().add(car('c'));
    removeA.reject(new Error('network'));
    await pendingA;

    expect(new Set(ids())).toEqual(new Set(['a', 'c']));
  });

  it('keeps later additions when a clear fails', async () => {
    useGarageStore.setState({ cars: [car('a'), car('b')] });
    const clearCall = deferred();
    api.putMyGarage.mockImplementationOnce(() => clearCall.promise as Promise<never>);
    api.addMyGarageItem.mockResolvedValueOnce({
      ids: ['c'],
      plan: 'free',
      freeGarageLimit: 10,
      garageLimit: 10,
    });

    const pendingClear = useGarageStore.getState().clear();
    await useGarageStore.getState().add(car('c'));
    clearCall.reject(new Error('network'));
    await pendingClear;

    expect(new Set(ids())).toEqual(new Set(['a', 'b', 'c']));
  });
});

describe('syncFromCloud', () => {
  it('merges device and account garages', async () => {
    useGarageStore.setState({ cars: [car('local')] });
    api.getMyGarage.mockResolvedValueOnce({
      ids: ['remote'],
      cars: [car('remote')],
      plan: 'free',
      freeGarageLimit: 10,
      garageLimit: 10,
    });
    api.putMyGarage.mockResolvedValueOnce({
      ids: ['remote', 'local'],
      cars: [car('remote'), car('local')],
      plan: 'free',
      freeGarageLimit: 10,
      garageLimit: 10,
    });

    await useGarageStore.getState().syncFromCloud();

    expect(api.putMyGarage).toHaveBeenCalledWith(['remote', 'local']);
    expect(ids()).toEqual(['remote', 'local']);
    expect(useGarageStore.getState().syncMode).toBe('cloud');
  });

  it('keeps device-only cars that did not fit under the free cap', async () => {
    // Regression: 5 account + 7 device cars capped to 10 used to replace local
    // state with the 10 synced — deleting 2 cars that existed nowhere else.
    const remote = Array.from({ length: 5 }, (_, i) => car(`r${i}`));
    const local = Array.from({ length: 7 }, (_, i) => car(`l${i}`));
    useGarageStore.setState({ cars: local });

    api.getMyGarage.mockResolvedValueOnce({
      ids: remote.map((c) => c.id),
      cars: remote,
      plan: 'free',
      freeGarageLimit: 10,
      garageLimit: 10,
    });
    api.putMyGarage.mockImplementationOnce(async (sent: string[]) => {
      const all = [...remote, ...local];
      return {
        ids: sent,
        cars: sent.map((id) => all.find((c) => c.id === id)!),
        plan: 'free',
        freeGarageLimit: 10,
        garageLimit: 10,
      };
    });

    await useGarageStore.getState().syncFromCloud();

    expect(api.putMyGarage).toHaveBeenCalledWith(expect.arrayContaining(['r0', 'l0']));
    expect((api.putMyGarage.mock.calls[0][0] as string[]).length).toBe(10);
    expect(ids()).toHaveLength(12); // nothing lost
    expect(ids()).toEqual(expect.arrayContaining(['l5', 'l6']));
    expect(useGarageStore.getState().lastSyncError).toMatch(
      /2 vehicles are saved on this device only/,
    );
  });

  it('discards a sync that finishes after sign-out', async () => {
    // Regression: a sync in flight at sign-out landed afterwards and wrote the
    // signed-out account's garage back into the store.
    const remote = deferred<Awaited<ReturnType<typeof accountApi.getMyGarage>>>();
    api.getMyGarage.mockImplementationOnce(() => remote.promise);

    const pending = useGarageStore.getState().syncFromCloud();
    useGarageStore.getState().detachCloud(); // user signs out
    remote.resolve({
      ids: ['private'],
      cars: [car('private')],
      plan: 'pro',
      freeGarageLimit: 10,
      garageLimit: null,
    });
    await pending;

    expect(ids()).toEqual([]);
    expect(useGarageStore.getState()).toMatchObject({ syncMode: 'local', plan: 'free' });
    expect(api.putMyGarage).not.toHaveBeenCalled();
  });

  it('falls back to local mode when the account is unreachable', async () => {
    useGarageStore.setState({ cars: [car('a')] });
    api.getMyGarage.mockRejectedValueOnce(new Error('503'));
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});

    await useGarageStore.getState().syncFromCloud();

    expect(useGarageStore.getState().syncMode).toBe('local');
    expect(ids()).toEqual(['a']);
  });
});
