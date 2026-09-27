import { describe, expect, it } from 'vitest';
import { LATEST_FULL_MODEL_YEAR } from '../config/model-years.js';
import { extractQueryModifiers } from './search-modifiers.js';

describe('extractQueryModifiers', () => {
  it('reads year ranges and open-ended years', () => {
    expect(extractQueryModifiers('2015-2018 accord')).toEqual({
      text: 'accord',
      year: { min: 2015, max: 2018 },
    });
    expect(extractQueryModifiers('between 2018 and 2015 civic').year).toEqual({
      min: 2015,
      max: 2018,
    });
    expect(extractQueryModifiers('rav4 2019+').year).toEqual({ min: 2019 });
    expect(extractQueryModifiers('rav4 after 2019').year).toEqual({ min: 2020 });
    expect(extractQueryModifiers('corvette before 2000').year).toEqual({ max: 1999 });
    // A lone year is left for the year parser.
    expect(extractQueryModifiers('2020 camry')).toEqual({ text: '2020 camry' });
  });

  it('reads new and used, order, gearbox, engine and seating', () => {
    expect(extractQueryModifiers('used civic')).toEqual({ text: 'civic' });
    expect(extractQueryModifiers('new camry')).toEqual({
      text: 'camry',
      newest: true,
      year: { min: LATEST_FULL_MODEL_YEAR },
    });
    expect(extractQueryModifiers('new beetle')).toEqual({ text: 'new beetle' });
    expect(extractQueryModifiers('most fuel efficient suv').sortedBy).toBe('fuelEconomy');
    expect(extractQueryModifiers('fastest car')).toEqual({ text: '', sortedBy: 'horsepower' });
    expect(extractQueryModifiers('stick shift sedan')).toEqual({
      text: 'sedan',
      transmission: ['manual'],
    });
    expect(extractQueryModifiers('v8 truck').cylinders).toEqual([8]);
    expect(extractQueryModifiers('4 cylinder camry').cylinders).toEqual([4]);
    expect(extractQueryModifiers('7 seater')).toEqual({ text: '', threeRow: true });
    expect(extractQueryModifiers('longest range ev')).toEqual({ text: 'ev', sortedBy: 'range' });
    expect(extractQueryModifiers('ev with 300+ miles of range')).toEqual({
      text: 'ev',
      minRangeMiles: 300,
    });
    expect(extractQueryModifiers('suv 400 km range').minRangeMiles).toBe(249);
    // "i4" is a BMW, not an inline four.
    expect(extractQueryModifiers('bmw i4')).toEqual({ text: 'bmw i4' });
    expect(extractQueryModifiers('third-row suv')).toEqual({ text: 'suv', threeRow: true });
  });

  it('reads the kind of vehicle and leaves body words for the body filter', () => {
    expect(extractQueryModifiers('compact suv')).toEqual({
      text: 'suv',
      vehicleClass: { sets: ['compact-suv'], label: 'compact SUVs' },
    });
    expect(extractQueryModifiers('luxury compact suv').vehicleClass).toEqual({
      sets: ['compact-luxury-suv'],
      luxury: true,
      label: 'luxury compact SUVs',
    });
    // "compact car" takes its "car"; "sedan" stays for the body filter.
    expect(extractQueryModifiers('compact car').text).toBe('');
    expect(extractQueryModifiers('midsize sedan').text).toBe('sedan');
    expect(extractQueryModifiers('full size truck').vehicleClass?.sets).toEqual([
      'full-size-pickup',
      'ev-pickup',
    ]);
    expect(extractQueryModifiers('heavy duty truck').vehicleClass?.sets).toEqual([
      'heavy-duty-pickup',
    ]);
    expect(extractQueryModifiers('sports car').vehicleClass?.segments).toEqual([
      'sports-car',
      'supercar',
      'muscle',
    ]);
    expect(extractQueryModifiers('muscle cars').vehicleClass?.segments).toEqual(['muscle']);
    expect(extractQueryModifiers('luxury sedan').vehicleClass).toEqual({
      luxury: true,
      label: 'luxury sedans',
    });
  });

  it('keeps trim and everyday words that only look like classes', () => {
    // A Camaro "Sport Coupe", a Ram "Big Horn", an Outback "Premium".
    expect(extractQueryModifiers('camaro sport coupe').vehicleClass).toBeUndefined();
    expect(extractQueryModifiers('ram big horn').vehicleClass).toBeUndefined();
    expect(extractQueryModifiers('outback premium').vehicleClass).toBeUndefined();
    expect(extractQueryModifiers('compact suv', { classes: false })).toEqual({
      text: 'compact suv',
    });
  });
});
