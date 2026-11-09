import { describe, expect, it } from 'vitest';
import { FULL_YEAR_MIN_LISTINGS } from '../src/config/model-years.js';
import { modelYearsFor, withModelYears } from './update-model-years.js';

const cars = (counts: Record<number, number>) =>
  Object.entries(counts).flatMap(([year, count]) =>
    Array.from({ length: count }, () => ({ year: Number(year) })),
  );

describe('the model years the data calls for', () => {
  it('calls a year full once EPA lists enough of its cars, and partial before', () => {
    const years = modelYearsFor(cars({ 1995: 400, 2026: 1240, 2027: FULL_YEAR_MIN_LISTINGS - 1 }));
    expect(years).toEqual({ first: 1995, latest: 2027, latestFull: 2026 });
    expect(
      modelYearsFor(cars({ 1995: 400, 2026: 1240, 2027: FULL_YEAR_MIN_LISTINGS })).latestFull,
    ).toBe(2027);
  });

  it('rewrites only the three constants', () => {
    const source =
      '// kept\nexport const FIRST_MODEL_YEAR = 1995;\nexport const LATEST_MODEL_YEAR = 2027;\nexport const LATEST_FULL_MODEL_YEAR = 2026;\nexport const FULL_YEAR_MIN_LISTINGS = 1000;\n';
    expect(withModelYears(source, { first: 1995, latest: 2028, latestFull: 2027 })).toBe(
      '// kept\nexport const FIRST_MODEL_YEAR = 1995;\nexport const LATEST_MODEL_YEAR = 2028;\nexport const LATEST_FULL_MODEL_YEAR = 2027;\nexport const FULL_YEAR_MIN_LISTINGS = 1000;\n',
    );
  });
});
