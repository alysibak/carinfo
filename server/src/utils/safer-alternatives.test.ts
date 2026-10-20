import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { saferAlternatives } from './safer-alternatives.js';

const car = (id: string, overall?: number, fcw?: 'standard' | 'optional') =>
  ({
    id,
    year: 2018,
    make: 'Make',
    model: id,
    ...(overall ? { safetyRating: { overall } } : {}),
    ...(fcw ? { safetyTech: { fcw } } : {}),
  }) as Car;

const label = (c: Car) => `${c.year} ${c.model}`;

describe('saferAlternatives', () => {
  it('names rivals with more stars, or as many with collision warning standard', () => {
    const anchor = car('Cherokee', 4, 'optional');
    expect(
      saferAlternatives(
        anchor,
        [car('Tucson', 5), car('Rogue', 4, 'standard'), car('Escape', 4), car('Unrated')],
        label,
      ),
    ).toEqual([
      { id: 'Tucson', label: '2018 Tucson', reason: '5/5 overall (this one 4/5)' },
      {
        id: 'Rogue',
        label: '2018 Rogue',
        reason: '4/5 overall and forward collision warning standard',
      },
    ]);
    const five = car('CR-V', 5, 'optional');
    expect(saferAlternatives(five, [car('Tucson', 5, 'standard')], label)[0].reason).toBe(
      '5/5 overall and forward collision warning standard',
    );
  });

  it('says nothing of a car NHTSA did not rate', () => {
    expect(saferAlternatives(car('Unrated'), [car('Tucson', 5)], label)).toEqual([]);
  });
});
