import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchNhtsaSafety, parseStar } from './nhtsa-safety.js';

const fetchMock = vi.fn<typeof fetch>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseStar', () => {
  it('reads star counts and treats unrated as absent', () => {
    expect(parseStar('5')).toBe(5);
    expect(parseStar('Not Rated')).toBeUndefined();
    expect(parseStar('N/A')).toBeUndefined();
    expect(parseStar(undefined)).toBeUndefined();
  });
});

describe('fetchNhtsaSafety', () => {
  it('looks up the first rated variant and returns its stars', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ Results: [{ VehicleId: 17001 }, { VehicleId: 17002 }] }))
      .mockResolvedValueOnce(
        json({
          Results: [
            {
              OverallRating: '5',
              OverallFrontCrashRating: '4',
              OverallSideCrashRating: '5',
              RolloverRating: 'Not Rated',
            },
          ],
        }),
      );

    await expect(fetchNhtsaSafety('Land Rover', 'Range Rover', 2022)).resolves.toEqual({
      overall: 5,
      frontal: 4,
      side: 5,
      rollover: undefined,
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.nhtsa.gov/SafetyRatings/modelyear/2022/make/Land%20Rover/model/Range%20Rover',
      'https://api.nhtsa.gov/SafetyRatings/VehicleId/17001',
    ]);
  });

  it('is undefined for a model NHTSA has not rated', async () => {
    fetchMock.mockResolvedValueOnce(json({ Count: 0, Results: [] }));
    await expect(fetchNhtsaSafety('Lotus', 'Emira', 2024)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('is undefined when every rating is unrated', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ Results: [{ VehicleId: 1 }] }))
      .mockResolvedValueOnce(json({ Results: [{ OverallRating: 'Not Rated' }] }));
    await expect(fetchNhtsaSafety('Fiat', '500', 2019)).resolves.toBeUndefined();
  });

  it('fails loudly on an upstream error rather than recording "unrated"', async () => {
    fetchMock.mockResolvedValueOnce(json({ Message: 'Too many requests' }, 429));
    await expect(fetchNhtsaSafety('Honda', 'Civic', 2022)).rejects.toThrow(/answered 429/);
  });
});
