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
        sortedBy: 'price',
        recentFrom: 2016,
      }),
    ).toEqual([
      'EPA records no trim levels, so “trd pro” was left out of the search.',
      'Estimated value under $30,000.',
      'Cheapest first by estimated value, model years 2016 and newer.',
    ]);
    expect(describeSearchInterpretation({ sortedBy: 'range', minRangeMiles: 249 })).toEqual([
      'Longest EPA range first.',
      'EPA range of at least 249 miles (401 km).',
    ]);
    expect(describeSearchInterpretation({ price: { min: 20000, max: 40000 } })).toEqual([
      'Estimated value $20,000 to $40,000.',
    ]);
    expect(
      describeSearchInterpretation({
        sortedBy: 'fuelEconomy',
        newestFrom: 2026,
        threeRow: true,
        compared: ['honda accord', 'toyota camry'],
      }),
    ).toEqual([
      'Most fuel-efficient first.',
      'Model years 2026 and newer.',
      'Minivans, passenger vans and SUVs sold with a third row, by model: EPA records no seating.',
      'Showing “honda accord” and “toyota camry” together.',
    ]);
    expect(describeSearchInterpretation({ vehicleClass: 'compact SUVs' })).toEqual([
      'Showing compact SUVs, classed by model.',
    ]);
    expect(
      describeSearchInterpretation({ unmeasured: ['best', 'reliable'], sortedBy: 'safety' }),
    ).toEqual([
      'Best NHTSA crash rating first; most cars have none on file.',
      'No data on file measures “best” and “reliable”, so they were not used.',
    ]);
    expect(
      describeSearchInterpretation({
        similarTo: { id: 'toyota-camry-2026', label: '2026 Toyota Camry' },
        sortedBy: 'price',
      }),
    ).toEqual([
      'Rivals of the 2026 Toyota Camry: the models shoppers compare it with, by class, size and price.',
      'Cheapest first by estimated value.',
    ]);
    expect(
      describeSearchInterpretation({
        firstCar: { maxPrice: 18000, minMpg: 28, minYear: 2010 },
        snow: true,
      }),
    ).toEqual([
      'Read as a first car, as the First car preset: under $18,000 where no price was given, 28 MPG or better, 2010 or newer.',
      'All- and four-wheel drive only, for snow: EPA records the drive, not the tires, which matter as much.',
    ]);
    expect(
      describeSearchInterpretation({
        otherYears: {
          asked: { min: 2012, max: 2012 },
          onFile: [
            { min: 1995, max: 2011 },
            { min: 2019, max: 2026 },
          ],
        },
      }),
    ).toEqual(['None on file for 2012. Showing the years that are: 1995–2011 and 2019–2026.']);
    expect(describeSearchInterpretation({ sortedBy: 'runningCost', recentFrom: 2016 })).toEqual([
      'Lowest estimated yearly running cost first: fuel, insurance, upkeep and tires, at the Ontario baseline, model years 2016 and newer.',
    ]);
    expect(describeSearchInterpretation({ automatedManual: true })).toEqual([
      'Automated manuals only, as EPA files them: mostly dual-clutch gearboxes (PDK, DSG), some with a single clutch.',
    ]);
    expect(describeSearchInterpretation({ mildHybrid: true })).toEqual([
      'Mild hybrids only: a 12-48 volt motor helps the engine but never drives the car, so they are listed by their fuel.',
    ]);
    expect(describeSearchInterpretation({ gasMileage: true, sortedBy: 'fuelEconomy' })).toEqual([
      'Most fuel-efficient first.',
      'Electric cars are left out: their MPGe does not compare with MPG.',
    ]);
  });
});
