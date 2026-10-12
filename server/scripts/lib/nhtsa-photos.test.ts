import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NhtsaPhotoVehicle } from '../../src/utils/nhtsa-photos.js';
import { listYear, makeKey, pictureFile, serializePhotoFile } from './nhtsa-photos.js';

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Answers by path under /SafetyRatings: Results, or a status; a missing path is a 404. */
function serve(routes: Record<string, unknown>) {
  fetchMock.mockImplementation(async (input) => {
    const path = decodeURIComponent(
      new URL(String(input)).pathname.replace('/SafetyRatings', ''),
    ).toLowerCase();
    const hit = Object.entries(routes).find(([p]) => p.toLowerCase() === path);
    if (!hit) return json({}, 404);
    return typeof hit[1] === 'number' ? json({}, hit[1]) : json({ Results: hit[1] });
  });
}

const pacing = { intervalMs: 0, retryMs: [0, 0], refusedMs: [0] };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('pictureFile', () => {
  it('takes photos on NHTSA’s image host only', () => {
    expect(pictureFile('https://static.nhtsa.gov/images/vehicles/13416_st0640_046.png')).toBe(
      '13416_st0640_046.png',
    );
    expect(pictureFile('https://example.com/images/vehicles/13416_st0640_046.png')).toBeUndefined();
    expect(pictureFile('https://static.nhtsa.gov/images/vehicles/../x.png')).toBeUndefined();
    expect(pictureFile('https://static.nhtsa.gov/images/vehicles/a/b.png')).toBeUndefined();
    expect(pictureFile(undefined)).toBeUndefined();
  });
});

describe('listYear', () => {
  const routes = {
    '/modelyear/2020': [{ Make: 'ACURA' }, { Make: 'MERCEDES-BENZ' }, { Make: 'UNLISTED' }],
    '/modelyear/2020/make/ACURA': [{ Model: 'MDX' }],
    '/modelyear/2020/make/MERCEDES-BENZ': [{ Model: 'C-CLASS' }],
    '/modelyear/2020/make/ACURA/model/MDX': [
      { VehicleId: 1, VehicleDescription: '2020 Acura MDX SUV AWD' },
      { VehicleId: 2, VehicleDescription: '2020 Acura MDX SUV FWD' },
    ],
    '/modelyear/2020/make/MERCEDES-BENZ/model/C-CLASS': [
      { VehicleId: 3, VehicleDescription: '2020 Mercedes-Benz C-Class 4 DR RWD' },
    ],
    '/VehicleId/1': [
      { VehiclePicture: 'https://static.nhtsa.gov/images/vehicles/1_st0640_046.png' },
    ],
    '/VehicleId/2': [{ VehiclePicture: '' }],
    '/VehicleId/3': [
      { VehiclePicture: 'https://static.nhtsa.gov/images/vehicles/3_st0640_046.png' },
    ],
  };
  const makes = new Set(['acura', 'mercedesbenz']);

  it('lists the photo of each rated variant of the makes asked for', async () => {
    serve(routes);
    const listing = await listYear(2020, { makes, known: new Map(), pacing });
    expect(listing.failures).toEqual([]);
    expect(listing.withoutPhoto).toBe(1);
    expect(listing.vehicles).toEqual([
      {
        id: 1,
        year: 2020,
        make: 'ACURA',
        model: 'MDX',
        description: '2020 Acura MDX SUV AWD',
        picture: '1_st0640_046.png',
      },
      {
        id: 3,
        year: 2020,
        make: 'MERCEDES-BENZ',
        model: 'C-CLASS',
        description: '2020 Mercedes-Benz C-Class 4 DR RWD',
        picture: '3_st0640_046.png',
      },
    ]);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('UNLISTED'))).toBe(false);
  });

  it('does not ask again for a photo it has', async () => {
    serve(routes);
    const known = new Map<number, NhtsaPhotoVehicle>([
      [
        3,
        {
          id: 3,
          year: 2020,
          make: 'MERCEDES-BENZ',
          model: 'C-CLASS',
          description: 'as before',
          picture: '3.png',
        },
      ],
    ]);
    const listing = await listYear(2020, { makes, known, pacing });
    expect(listing.vehicles.find((v) => v.id === 3)?.description).toBe('as before');
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/VehicleId/3'))).toBe(false);
  });

  it('reports the requests that failed, after retrying them', async () => {
    serve({ ...routes, '/modelyear/2020/make/ACURA': 503 });
    const listing = await listYear(2020, { makes, known: new Map(), pacing });
    expect(listing.failures).toHaveLength(1);
    expect(listing.failures[0]).toContain('/make/ACURA');
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/make/ACURA')),
    ).toHaveLength(3);
    expect(listing.vehicles.map((v) => v.id)).toEqual([3]);
    expect(listing.refused).toBe(false);
  });

  it('takes a name NHTSA cannot look up as nothing listed, not a failure', async () => {
    serve({ ...routes, '/modelyear/2020/make/ACURA/model/MDX': 400 });
    const listing = await listYear(2020, { makes, known: new Map(), pacing });
    expect(listing.failures).toEqual([]);
    expect(listing.vehicles.map((v) => v.id)).toEqual([3]);
  });

  it('stops asking once NHTSA refuses, after waiting', async () => {
    serve({ ...routes, '/modelyear/2020/make/ACURA': 403 });
    const listing = await listYear(2020, { makes, known: new Map(), pacing, concurrency: 1 });
    expect(listing.refused).toBe(true);
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/make/ACURA')),
    ).toHaveLength(2);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/VehicleId/'))).toBe(false);
  });

  it('spaces its requests', async () => {
    serve(routes);
    const started = Date.now();
    await listYear(2020, { makes, known: new Map(), pacing: { ...pacing, intervalMs: 20 } });
    // Seven requests, 20 ms apart.
    expect(Date.now() - started).toBeGreaterThanOrEqual(6 * 20 - 5);
  });
});

describe('serializePhotoFile', () => {
  it('writes valid JSON, a vehicle to a line, in order', () => {
    const v = (id: number, year: number, make: string) => ({
      id,
      year,
      make,
      model: 'M',
      description: '',
      picture: `${id}.png`,
    });
    const text = serializePhotoFile({
      source: 's',
      years: { '2021': 'd', '2020': 'd' },
      vehicles: [v(2, 2021, 'A'), v(1, 2020, 'B'), v(3, 2020, 'A')],
    });
    const parsed = JSON.parse(text);
    expect(parsed.vehicles.map((x: { id: number }) => x.id)).toEqual([3, 1, 2]);
    expect(Object.keys(parsed.years)).toEqual(['2020', '2021']);
    expect(text.split('\n').filter((l) => l.includes('"picture"'))).toHaveLength(3);
    expect(
      JSON.parse(serializePhotoFile({ source: 's', years: {}, vehicles: [] })).vehicles,
    ).toEqual([]);
  });

  it('compares makes by letters and digits', () => {
    expect(makeKey('MERCEDES-BENZ')).toBe(makeKey('Mercedes-Benz'));
    expect(makeKey('LAND ROVER')).toBe('landrover');
  });
});
