import { describe, expect, it } from 'vitest';
import { describeSearchInterpretation } from './searchInterpretation';

describe('describeSearchInterpretation', () => {
  it('says nothing when the search read nothing in', () => {
    expect(describeSearchInterpretation(undefined)).toEqual([]);
    expect(describeSearchInterpretation({})).toEqual([]);
  });

  it('names the trim words set aside, the price limit and the order', () => {
    expect(
      describeSearchInterpretation({
        ignored: ['trd', 'pro'],
        price: { max: 30000 },
        cheapestFirst: true,
        cheapestFrom: 2016,
      }),
    ).toEqual([
      'EPA records no trim levels, so “trd pro” was left out of the search.',
      'Estimated value under $30,000.',
      'Cheapest first by estimated value, model years 2016 and newer.',
    ]);
    expect(describeSearchInterpretation({ price: { min: 20000, max: 40000 } })).toEqual([
      'Estimated value $20,000 to $40,000.',
    ]);
  });
});
