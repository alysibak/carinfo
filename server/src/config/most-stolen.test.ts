import { describe, expect, it } from 'vitest';
import { getAllCars, modelLineKey } from '../services/car.service.js';
import { MOST_STOLEN, theftRankOf } from './most-stolen.js';

describe('Canada’s most stolen vehicles', () => {
  it('ranks one to ten, each model once', () => {
    expect(MOST_STOLEN.models.map((m) => m.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const lines = MOST_STOLEN.models.flatMap((m) => m.lines);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('places a model line, both brands of one entry, and nothing else', () => {
    expect(theftRankOf('toyota|rav4')).toMatchObject({ rank: 1, of: 10, year: 2024 });
    expect(theftRankOf('gmc|sierra')).toEqual(theftRankOf('chevrolet|silverado'));
    expect(theftRankOf('dodge|ram')?.rank).toBe(2);
    // Équité's Silverado and F-150 are not their electric versions.
    expect(theftRankOf('chevrolet|silverado ev')).toBeUndefined();
    expect(theftRankOf('ford|f-150 lightning')).toBeUndefined();
    expect(theftRankOf('toyota|grand highlander')).toBeUndefined();
  });

  it('names model lines the site has', () => {
    const lines = new Set(getAllCars().map(modelLineKey));
    for (const line of MOST_STOLEN.models.flatMap((m) => m.lines)) {
      expect(lines.has(line), line).toBe(true);
    }
  });
});
