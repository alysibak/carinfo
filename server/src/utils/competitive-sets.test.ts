import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types.js';
import {
  competitiveClassLabel,
  competitiveSets,
  sharesCompetitiveSet,
} from './competitive-sets.js';

const car = (make: string, model: string, over: Partial<CarSpecs> = {}): CarSpecs =>
  ({
    make,
    model,
    year: 2022,
    bodyStyle: 'sedan',
    engine: { fuelType: 'gasoline' },
    ...over,
  }) as CarSpecs;

describe('competitive sets', () => {
  it('puts nameplates in the class shoppers compare them in', () => {
    expect(competitiveSets(car('Toyota', 'Camry'))).toEqual(['midsize-car']);
    expect(competitiveSets(car('Honda', 'Civic 4Dr'))).toEqual(['compact-car']);
    // The 2019+ Type R is a "Civic 5Dr" to EPA; its trim says what it is.
    expect(competitiveSets(car('Honda', 'Civic 5Dr', { variant: 'Type R' }))).toEqual([
      'sport-compact',
    ]);
    expect(competitiveSets(car('Ford', 'F150 Pickup 4WD', { bodyStyle: 'truck' }))).toEqual([
      'full-size-pickup',
    ]);
    expect(competitiveSets(car('Ford', 'F-150 Lightning 4WD', { bodyStyle: 'truck' }))).toEqual([
      'ev-pickup',
    ]);
    expect(competitiveSets(car('Audi', 'e-tron GT'))).toEqual(['ev-sedan']);
    expect(competitiveSets(car('Jeep', 'New Wrangler 4WD', { bodyStyle: 'suv' }))).toEqual([
      'off-roader',
    ]);
  });

  it('reads the generation where a name changed class', () => {
    const trailblazer = (year: number) =>
      competitiveSets(car('Chevrolet', 'Trailblazer AWD', { year, bodyStyle: 'suv' }));
    expect(trailblazer(2006)).toEqual(['midsize-suv']);
    expect(trailblazer(2022)).toEqual(['subcompact-suv']);
  });

  it('files a two-door flagship as a grand tourer', () => {
    expect(competitiveSets(car('Mercedes-Benz', 'S560'))).toEqual(['flagship-sedan']);
    expect(competitiveSets(car('Mercedes-Benz', 'S560', { bodyStyle: 'coupe' }))).toEqual([
      'grand-tourer',
    ]);
  });

  it('says who is cross-shopped', () => {
    expect(sharesCompetitiveSet(car('Toyota', 'Camry'), car('Honda', 'Accord'))).toBe(true);
    expect(sharesCompetitiveSet(car('Toyota', 'Camry'), car('Honda', 'Civic 4Dr'))).toBe(false);
    // A car in no set shares none.
    expect(sharesCompetitiveSet(car('Cadillac', 'Funeral Coach'), car('Honda', 'Accord'))).toBe(
      false,
    );
  });
});

describe('competitiveClassLabel', () => {
  it('names the class for the spec table, a pickup first for a pickup', () => {
    expect(competitiveClassLabel(car('Honda', 'CR-V AWD', { bodyStyle: 'suv' }))).toBe(
      'Compact SUV',
    );
    expect(competitiveClassLabel(car('Toyota', 'Camry'))).toBe('Midsize car');
    // Also an off-roader, but shopped as a pickup.
    expect(competitiveClassLabel(car('Jeep', 'Gladiator 4WD', { bodyStyle: 'truck' }))).toBe(
      'Midsize pickup',
    );
    expect(competitiveClassLabel(car('Cadillac', 'Funeral Coach'))).toBeUndefined();
  });
});
