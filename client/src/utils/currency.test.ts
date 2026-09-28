import { describe, expect, it } from 'vitest';
import { currencyMethodologyNote, currencySectionNote } from './currency';

describe('currency notes', () => {
  it('name the region they describe', () => {
    expect(currencySectionNote('British Columbia')).toMatch(
      /^Estimates in CAD for British Columbia, from our cost model rather than quotes/,
    );
    expect(currencyMethodologyNote('Ontario')).toContain('built for Ontario drivers');
  });
});
