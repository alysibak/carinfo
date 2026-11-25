import { describe, expect, it } from 'vitest';
import { answersFromParams, answersToParams, finderFilters, finderQuery } from './finder';

describe('finder', () => {
  it('turns answers into filters the records can answer', () => {
    expect(finderFilters({ carry: 'more', runsOn: 'hybrid', howNew: 'new', must: [] })).toEqual({
      threeRow: true,
      fuelType: ['hybrid'],
      year: { min: 2025 },
    });
    expect(
      finderFilters({
        carry: 'load',
        howNew: 'recent',
        must: ['awd', 'stars', 'recalls', 'theft'],
      }),
    ).toEqual({
      bodyStyle: ['truck'],
      year: { min: 2020, max: 2024 },
      driveType: ['AWD', '4WD'],
      safety: { min: 5 },
      noRecalls: true,
      theftListed: false,
    });
    // Age skipped: any of the three answers, fifteen years at most.
    expect(finderFilters({ must: [] })).toEqual({ year: { min: 2010 } });
  });

  it('lists one row per model, cheapest to run first, an EV farthest first', () => {
    expect(finderQuery({ must: [] })).toMatchObject({
      collapseByModel: true,
      sort: { field: 'runningCost', order: 'asc' },
    });
    expect(finderQuery({ runsOn: 'electric', must: [] }).sort).toEqual({
      field: 'range',
      order: 'desc',
    });
  });

  it('keeps answers in the address, ignoring anything it does not know', () => {
    const answers = { carry: 'two' as const, runsOn: 'gas' as const, must: ['fcw' as const] };
    expect(answersFromParams(answersToParams({ ...answers }))).toEqual({
      ...answers,
      howNew: undefined,
    });
    expect(answersFromParams(new URLSearchParams('carry=boat&must=awd,wings'))).toEqual({
      carry: undefined,
      runsOn: undefined,
      howNew: undefined,
      must: ['awd'],
    });
  });
});
