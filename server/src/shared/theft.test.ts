import { describe, expect, it } from 'vitest';
import { ordinal, theftPlace, theftSentence } from './theft.js';

const theft = (rank: number) => ({
  rank,
  of: 10,
  model: 'Toyota RAV4',
  year: 2024,
  url: 'https://www.equiteassociation.com/top-10-most-stolen-vehicles',
});

describe('theft', () => {
  it('names the first as the most stolen, the rest by place', () => {
    expect(theftPlace(theft(1))).toBe('the most stolen vehicle in Canada in 2024');
    expect(theftPlace(theft(2))).toBe('the 2nd most stolen vehicle in Canada in 2024');
    expect(theftSentence(theft(1))).toBe(
      'The Toyota RAV4 was the most stolen vehicle in Canada in 2024, by Équité Association’s count.',
    );
  });

  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '101st',
      '111th',
    ]);
  });
});
