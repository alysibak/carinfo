import { describe, expect, it } from 'vitest';
import { currencyMethodologyNote, currencySectionNote } from './currency';

describe('currency notes', () => {
  it('name the region they describe', () => {
    expect(currencySectionNote('British Columbia')).toMatch(
      /^All figures are British Columbia-baseline model estimates in CAD, not live listing quotes\./,
    );
    expect(currencyMethodologyNote('Ontario')).toContain('built for Ontario drivers');
  });
});
