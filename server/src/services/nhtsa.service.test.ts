import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../app.js';
import { __resetVinCache, decodeVin } from './nhtsa.service.js';

const VIN = '1HGCM82633A004352';

const fetchMock = vi.fn<typeof fetch>();

function vpic(result: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify({ Count: 1, Results: [result] }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ACCORD = {
  ErrorCode: '0',
  ModelYear: '2003',
  Make: 'HONDA',
  Model: 'Accord',
  Trim: 'EX-V6',
  BodyClass: 'Coupe',
  EngineHP: '',
  EngineKW: '179',
  EngineCylinders: '6',
  DisplacementL: '3.0',
  Turbo: 'Not Applicable',
  PlantCountry: 'UNITED STATES (USA)',
};

beforeEach(() => {
  __resetVinCache();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('decodeVin', () => {
  it('maps vPIC fields, deriving horsepower from kW when NHTSA has no hp', async () => {
    fetchMock.mockResolvedValueOnce(vpic(ACCORD));
    const result = await decodeVin(` ${VIN.toLowerCase()} `);

    expect(result).toMatchObject({
      vin: VIN,
      decodedClean: true,
      year: 2003,
      make: 'HONDA',
      model: 'Accord',
      trim: 'EX-V6',
      engine: { hp: 240, hpFromKw: true, kw: 179, cylinders: 6, displacementL: 3 },
      plantCountry: 'UNITED STATES (USA)',
    });
    // "Not Applicable" is absence, not a value.
    expect(result.engine.turbo).toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${VIN}?format=json`,
    );
  });

  it('passes a model year hint through', async () => {
    fetchMock.mockResolvedValueOnce(vpic(ACCORD));
    await decodeVin(VIN, 2003);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/&modelyear=2003$/);
  });

  it('serves repeat decodes from cache', async () => {
    fetchMock.mockResolvedValueOnce(vpic(ACCORD));
    await decodeVin(VIN);
    await decodeVin(VIN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent decodes of the same VIN into one upstream call', async () => {
    fetchMock.mockResolvedValueOnce(vpic(ACCORD));
    const [a, b] = await Promise.all([decodeVin(VIN), decodeVin(VIN)]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects on an upstream error, and does not cache it', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Service Unavailable', { status: 503 }));
    await expect(decodeVin(VIN)).rejects.toThrow(/503/);

    fetchMock.mockResolvedValueOnce(vpic(ACCORD));
    await expect(decodeVin(VIN)).resolves.toMatchObject({ make: 'HONDA' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('bounds the upstream wait', async () => {
    fetchMock.mockResolvedValueOnce(vpic(ACCORD));
    await decodeVin(VIN);
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('GET /api/vin/:vin', () => {
  it('answers 502 with a readable message when NHTSA is down', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const res = await request(app).get(`/api/vin/${VIN}`);
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/NHTSA VIN service is unavailable/);
    spy.mockRestore();
  });

  it('accepts next model year as a hint, ignoring implausible ones', async () => {
    const next = new Date().getFullYear() + 1;
    fetchMock.mockImplementation(async () => vpic(ACCORD));

    await request(app).get(`/api/vin/${VIN}?year=${next}`);
    expect(String(fetchMock.mock.calls[0][0])).toContain(`&modelyear=${next}`);

    __resetVinCache();
    await request(app).get(`/api/vin/${VIN}?year=1970`);
    expect(String(fetchMock.mock.calls[1][0])).not.toContain('modelyear');
  });
});
