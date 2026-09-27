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

  it('drops words with no search meaning and sets aside judgements', () => {
    // "for" was read as a prefix of Ford.
    expect(extractQueryModifiers('best suv for family')).toEqual({
      text: 'suv',
      unmeasured: ['best'],
      vehicleClass: { sets: ['three-row-suv', 'midsize-suv'], label: 'family SUVs' },
    });
    expect(extractQueryModifiers('cheap reliable car').unmeasured).toEqual(['reliable']);
    expect(extractQueryModifiers('honda accord for sale near me').text).toBe('honda accord');
    // "best mpg" is an order, not a judgement; "Town and Country" keeps its "and".
    expect(extractQueryModifiers('best mpg suv').unmeasured).toBeUndefined();
    expect(extractQueryModifiers('town and country').text).toBe('town and country');
  });

  it('reads family vehicles by body and "safest" as an order', () => {
    expect(extractQueryModifiers('family van').vehicleClass).toEqual({
      sets: ['minivan'],
      label: 'family vans',
    });
    expect(extractQueryModifiers('family car')).toEqual({
      text: '',
      vehicleClass: { sets: ['midsize-car', 'large-car'], label: 'family cars' },
    });
    expect(extractQueryModifiers('safest suv').sortedBy).toBe('safety');
  });

  it('reads gas-mileage orders and phrases no data can answer', () => {
    expect(extractQueryModifiers('suv with good gas mileage')).toEqual({
      text: 'suv',
      sortedBy: 'fuelEconomy',
      gasMileage: true,
    });
    // "Most efficient" keeps EVs; "fast charging" is not a horsepower order.
    expect(extractQueryModifiers('most fuel efficient suv').gasMileage).toBeUndefined();
    expect(extractQueryModifiers('fast charging ev')).toEqual({
      text: 'ev',
      unmeasured: ['fast charging'],
    });
    expect(extractQueryModifiers('truck that can tow')).toEqual({
      text: 'truck',
      unmeasured: ['tow'],
    });
  });

  it('keeps a stop word that begins a model code', () => {
    // "is 350" read "350" and found a 350Z; "lexus is 350" found nothing.
    expect(extractQueryModifiers('lexus is 350').text).toBe('lexus is 350');
    expect(extractQueryModifiers('is f').text).toBe('is f');
    expect(extractQueryModifiers('i 4').text).toBe('i 4');
    expect(extractQueryModifiers('a 220').text).toBe('a 220');
    // A number another phrase took leaves the word a stop word.
    expect(extractQueryModifiers('i 4 cylinder sedan').text).toBe('sedan');
    expect(extractQueryModifiers('suv with a 300 mile range').text).toBe('suv');
    expect(extractQueryModifiers('is the rav4 reliable').text).toBe('rav4');
  });

  it('reads first cars, snow, and adverbs with nothing to modify', () => {
    expect(extractQueryModifiers('good first car for a teenager')).toEqual({
      text: '',
      firstCar: true,
      unmeasured: ['good'],
    });
    expect(extractQueryModifiers('suv for a new driver').firstCar).toBe(true);
    expect(extractQueryModifiers('best car for snow')).toEqual({
      text: '',
      snow: true,
      unmeasured: ['best'],
    });
    expect(extractQueryModifiers('winter truck').snow).toBe(true);
    // "most" read as a name matched a Mustang Mach-E and a Montero.
    expect(extractQueryModifiers('most reliable suv').text).toBe('suv');
    // "most powerful" is still an order.
    expect(extractQueryModifiers('most powerful suv').sortedBy).toBe('horsepower');
  });

  it('reads running-cost orders, with the kind of car inside the phrase', () => {
    expect(extractQueryModifiers('cheap to run sedan')).toMatchObject({
      text: 'sedan',
      sortedBy: 'runningCost',
    });
    // "cheapest suv to own" found nothing: "cheapest" was a price order and
    // "to own" words.
    expect(extractQueryModifiers('cheapest suv to own')).toMatchObject({
      text: 'suv',
      sortedBy: 'runningCost',
    });
    expect(extractQueryModifiers('lowest insurance car').sortedBy).toBe('runningCost');
    // "cheap" alone is still the price, read later.
    expect(extractQueryModifiers('cheap suv').sortedBy).toBeUndefined();
  });

  it('sets aside equipment, which nothing on file records', () => {
    // "suv with sunroof" and "car with apple carplay" found nothing at all.
    expect(extractQueryModifiers('suv with sunroof')).toEqual({
      text: 'suv',
      unmeasured: ['sunroof'],
    });
    expect(extractQueryModifiers('suv with leather seats and navigation')).toEqual({
      text: 'suv',
      unmeasured: ['leather seats', 'navigation'],
    });
    expect(extractQueryModifiers('car with apple carplay').unmeasured).toEqual(['apple carplay']);
    // Names that contain the words are left alone.
    expect(extractQueryModifiers('town and country').text).toBe('town and country');
    expect(extractQueryModifiers('chrysler pt cruiser').text).toBe('chrysler pt cruiser');
    expect(extractQueryModifiers('nissan leaf').text).toBe('nissan leaf');
  });

  it('sets aside words about one car for sale', () => {
    // "like new civic" was read as "new" and showed only this year's Civic.
    expect(extractQueryModifiers('like new civic')).toEqual({
      text: 'civic',
      unmeasured: ['like new'],
    });
    expect(extractQueryModifiers('one owner accident free rav4').unmeasured).toEqual([
      'one owner',
      'accident free',
    ]);
    expect(extractQueryModifiers('new civic').newest).toBe(true);
  });
});
