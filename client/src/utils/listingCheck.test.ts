import { describe, expect, it } from 'vitest';
import { carAgeYears, listingVerdict } from './listingCheck';

const now = new Date(2026, 10, 16); // 16 Nov 2026

describe('listingVerdict', () => {
  it('reads a car’s age from its model year, never under half a year', () => {
    expect(carAgeYears(2021, now)).toBeCloseTo(5.92, 2);
    expect(carAgeYears(2027, now)).toBe(0.5);
  });

  it('bands the price against the estimate and the distance against the region', () => {
    const value = { low: 20000, mid: 22000, high: 24000 };
    const typical = listingVerdict({
      year: 2021,
      askingPrice: 23000,
      odometerKm: 90000,
      value,
      annualKm: 15000,
      now,
    });
    expect(typical.price).toMatchObject({ diff: 1000, band: 'within' });
    expect(typical.km).toMatchObject({ perYear: 15211, band: 'typical' });

    const dear = listingVerdict({ year: 2021, askingPrice: 26000, value, annualKm: 15000, now });
    expect(dear.price?.band).toBe('above');
    expect(dear.km).toBeUndefined();

    const worn = listingVerdict({ year: 2021, odometerKm: 150000, annualKm: 15000, now });
    expect(worn.km?.band).toBe('high');
    expect(worn.price).toBeUndefined();

    const little = listingVerdict({ year: 2021, odometerKm: 30000, annualKm: 15000, now });
    expect(little.km?.band).toBe('low');
  });

  it('says nothing for a car with no estimate, or an empty field', () => {
    expect(
      listingVerdict({ year: 2021, askingPrice: 1, value: null, annualKm: 15000, now }),
    ).toEqual({});
    expect(
      listingVerdict({ year: 2021, askingPrice: 0, odometerKm: null, annualKm: 15000 }),
    ).toEqual({});
  });
});
