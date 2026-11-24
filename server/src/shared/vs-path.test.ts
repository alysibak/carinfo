import { describe, expect, it } from 'vitest';
import { modelSlug, vsPath, vsSplits, vsTitle } from './vs-path.js';

describe('vs addresses', () => {
  it('joins two model pages in the words people search with', () => {
    expect(modelSlug('/models/honda/cr-v')).toBe('honda-cr-v');
    expect(vsPath('/models/toyota/rav4', '/models/honda/cr-v')).toBe(
      '/compare/toyota-rav4-vs-honda-cr-v',
    );
  });

  it('tries every place a pair can split, for names with "vs" in them', () => {
    expect(vsSplits('A-vs-B-vs-C')).toEqual([
      ['a', 'b-vs-c'],
      ['a-vs-b', 'c'],
    ]);
    expect(vsSplits('toyota-rav4')).toEqual([]);
    expect(vsSplits('-vs-honda-civic')).toEqual([]);
  });

  it('titles the page with the year both are shown in', () => {
    expect(vsTitle({ label: 'Toyota RAV4 vs Honda CR-V', year: 2026 })).toBe(
      'Toyota RAV4 vs Honda CR-V (2026)',
    );
    expect(vsTitle({ label: 'Tesla Model 3 vs Honda Element', year: null })).toBe(
      'Tesla Model 3 vs Honda Element',
    );
  });
});
