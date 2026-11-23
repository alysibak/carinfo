import { beforeEach, describe, expect, it } from 'vitest';
import type { VinDecodeResult } from '../services/api';
import { MAX_RECENT_VINS, recentVinEntry, useRecentVinStore } from './recentVinStore';

const VIN = '1HGCM82633A004352';

describe('useRecentVinStore', () => {
  beforeEach(() => useRecentVinStore.getState().clear());

  it('keeps the newest first, each VIN once', () => {
    const { record } = useRecentVinStore.getState();
    record({ vin: VIN, title: '2003 HONDA Accord' });
    record({ vin: '5YJ3E1EA7KF317283', title: '2019 TESLA Model 3' });
    record({ vin: VIN, title: '2003 HONDA Accord' });
    expect(useRecentVinStore.getState().vins.map((v) => v.vin)).toEqual([VIN, '5YJ3E1EA7KF317283']);
  });

  it('keeps only the newest few', () => {
    const { record } = useRecentVinStore.getState();
    for (let i = 0; i < MAX_RECENT_VINS + 3; i++) {
      record({ vin: `VIN${String(i).padStart(14, '0')}`, title: null });
    }
    expect(useRecentVinStore.getState().vins).toHaveLength(MAX_RECENT_VINS);
  });

  it('keeps a VIN saved with no connection first, to look up later', () => {
    const { record, keep } = useRecentVinStore.getState();
    record({ vin: VIN, title: '2003 HONDA Accord' });
    keep('5YJ3E1EA7KF317283');
    expect(useRecentVinStore.getState().vins).toEqual([
      { vin: '5YJ3E1EA7KF317283', title: null, pending: true },
      { vin: VIN, title: '2003 HONDA Accord' },
    ]);
  });

  it('does not set a VIN looked up before back to waiting', () => {
    const { record, keep } = useRecentVinStore.getState();
    record({ vin: VIN, title: '2003 HONDA Accord' });
    record({ vin: '5YJ3E1EA7KF317283', title: '2019 TESLA Model 3' });
    keep(VIN);
    expect(useRecentVinStore.getState().vins[0]).toEqual({ vin: VIN, title: '2003 HONDA Accord' });
  });

  it('names a saved VIN in its place once its lookup comes back', () => {
    const { record, keep, settle } = useRecentVinStore.getState();
    keep(VIN);
    record({ vin: '5YJ3E1EA7KF317283', title: '2019 TESLA Model 3' });
    settle(VIN, { title: '2003 HONDA Accord' });
    settle('5YJ3E1EA7KF317283', null);
    expect(useRecentVinStore.getState().vins).toEqual([
      { vin: '5YJ3E1EA7KF317283', title: '2019 TESLA Model 3' },
      { vin: VIN, title: '2003 HONDA Accord' },
    ]);
  });
});

describe('recentVinEntry', () => {
  const result = (fields: Partial<VinDecodeResult>): VinDecodeResult => ({
    vin: VIN,
    decodedClean: true,
    engine: {},
    ...fields,
  });

  it('names a VIN by its year, make and model', () => {
    expect(recentVinEntry(result({ year: 2003, make: 'HONDA', model: 'Accord' }))).toEqual({
      vin: VIN,
      title: '2003 HONDA Accord',
    });
  });

  it('names nothing when the decoder named nothing', () => {
    expect(recentVinEntry(result({})).title).toBeNull();
  });
});

describe('recentVinEntry and the car it matched', () => {
  it('keeps the car on CarInfo the VIN matched, so scanned cars can be compared', () => {
    const entry = recentVinEntry({
      vin: VIN,
      year: 2003,
      make: 'HONDA',
      model: 'Accord',
      decodedClean: true,
      engine: {},
      catalog: { cars: [{ id: 'accord-30-auto' }, { id: 'accord-24-auto' }] },
    } as unknown as VinDecodeResult);
    expect(entry).toEqual({ vin: VIN, title: '2003 HONDA Accord', carId: 'accord-30-auto' });
  });
});
