import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { describeAnswers, quizReasons } from './quizReasons';

const prius = {
  id: 'prius',
  make: 'Toyota',
  model: 'Prius',
  year: 2023,
  engine: { fuelType: 'hybrid', horsepower: 194 },
  fuelEconomy: { city: 57, highway: 56, combined: 57 },
  bodyStyle: 'hatchback',
  price: { msrp: 30000, isEstimated: true },
  safetyRating: { overall: 5 },
} as unknown as CarSpecs;

describe('quizReasons', () => {
  it('answers a commuter who cares about fuel, in their budget', () => {
    expect(
      quizReasons(prius, { priority: 'mpg', usage: 'commute', minPrice: 20000, maxPrice: 35000 }),
    ).toEqual(['4.1 L/100 km: cheap to fuel every day', 'About $30k, inside your budget']);
  });

  it('puts the crash-test result first when safety comes first', () => {
    expect(
      quizReasons(prius, { priority: 'safety', usage: 'family', minPrice: 0, maxPrice: 999999 }),
    ).toEqual(['5/5 in NHTSA crash tests']);
  });
});

describe('describeAnswers', () => {
  it('says the answers the way a reader would', () => {
    expect(
      describeAnswers({ priority: 'mpg', usage: 'commute', minPrice: 20000, maxPrice: 35000 }),
    ).toBe('For a daily commute · fuel economy matters most · $20k–$35k');
    expect(describeAnswers({ priority: null, usage: null, minPrice: 0, maxPrice: 999999 })).toBe(
      'Any budget',
    );
  });
});
