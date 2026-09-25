import { describe, expect, it } from 'vitest';
import type { Car, CarSpecs } from '../types/car.types.js';
import {
  canonicalizeDisplayModel,
  classifyShoppingSegment,
  inferBodyStyle,
  resolveVehicleTaxonomy,
} from '../utils/vehicle-taxonomy.js';
import { findCar, findEnrichedCar } from '../__tests__/helpers/loadCars.js';

function minimalCar(overrides: Partial<Car> & Pick<CarSpecs, 'make' | 'model'>): Car {
  return {
    id: 'test',
    year: 2020,
    provenance: {},
    engine: { fuelType: 'gasoline' },
    fuelEconomy: { city: 25, highway: 32, combined: 28 },
    transmission: { type: 'automatic' },
    driveType: 'FWD',
    bodyStyle: 'sedan',
    ...overrides,
  };
}

describe('vehicle-taxonomy', () => {
  it('classifies shopping segments from rules', () => {
    const ev = minimalCar({ make: 'Tesla', model: 'Model 3', engine: { fuelType: 'electric' } });
    const display = canonicalizeDisplayModel(ev);
    expect(classifyShoppingSegment(ev, display, 'sedan')).toBe('ev');

    const truck = minimalCar({ make: 'Ford', model: 'F-150', bodyStyle: 'truck' });
    expect(classifyShoppingSegment(truck, truck.model, 'truck')).toBe('truck');

    const camry = findCar(
      (c) => c.make === 'Toyota' && c.model.includes('Camry') && c.year === 2020,
    );
    expect(camry).toBeDefined();
    const camryDisplay = canonicalizeDisplayModel(camry!);
    const camryBody = inferBodyStyle(camry!, camryDisplay);
    expect(classifyShoppingSegment(camry!, camryDisplay, camryBody)).toBe('mainstream');
  });

  it('corrects EPA hatchback mislabels (Golf stored as sedan)', () => {
    const golf = findCar(
      (c) => c.make === 'Volkswagen' && /^golf$/i.test(c.model) && c.bodyStyle === 'sedan',
    );
    expect(golf).toBeDefined();
    const display = canonicalizeDisplayModel(golf!);
    expect(inferBodyStyle(golf!, display)).toBe('hatchback');
  });

  it('disambiguates Golf GTI from base Golf via displacement', () => {
    const gti = minimalCar({
      make: 'Volkswagen',
      model: 'Golf GTI',
      trim: 'golf-gti-automatic-s7',
      engine: { fuelType: 'gasoline', displacement: 2 },
      bodyStyle: 'sedan',
    });
    expect(canonicalizeDisplayModel(gti)).toBe('Golf GTI');

    const base = minimalCar({
      make: 'Volkswagen',
      model: 'Golf GTI',
      trim: 'golf-gti-automatic-s7',
      engine: { fuelType: 'gasoline', displacement: 1.8 },
      bodyStyle: 'sedan',
    });
    expect(canonicalizeDisplayModel(base)).toBe('Golf');
  });

  it('files two-door cars EPA calls "small cars" as coupes', () => {
    // EPA's size classes made the Mustang, Camaro and Challenger sedans, so
    // the coupe filter missed them and valuation used an economy car's curve.
    const body = (make: string, model: string) =>
      inferBodyStyle(minimalCar({ make, model }), model);
    for (const [make, model] of [
      ['Ford', 'Mustang'],
      ['Chevrolet', 'Camaro'],
      ['Dodge', 'Challenger SRT'],
      ['Subaru', 'BRZ'],
      ['Toyota', 'GR 86'],
      ['Lexus', 'RC 350 AWD'],
      ['Honda', 'Civic 2Dr'],
      ['Dodge', 'Charger 2-Dr Daytona R/T AWD 18in'],
      ['Toyota', 'Supra'],
      ['Hyundai', 'Tiburon'],
      ['Mercedes-Benz', 'CLK350'],
      ['Audi', 'TT'],
    ]) {
      expect(body(make, model), `${make} ${model}`).toBe('coupe');
    }
    expect(body('Ford', 'Mustang Convertible')).toBe('convertible');
    // Not every name that starts the same way.
    expect(body('Dodge', 'Charger')).toBe('sedan');
    expect(body('Mitsubishi', 'Eclipse Cross')).toBe('sedan');
    // Five doors and MINI's hardtop are hatchbacks.
    expect(body('Honda', 'Civic 5Dr')).toBe('hatchback');
    expect(body('MINI', 'Cooper Hardtop 2 door')).toBe('hatchback');
    // A two-door SUV stays an SUV.
    expect(
      inferBodyStyle(minimalCar({ make: 'Jeep', model: 'Wrangler 2dr 4WD', bodyStyle: 'suv' })),
    ).toBe('suv');
  });
});

describe('shopping segments', () => {
  const segmentOf = (predicate: (c: Car) => boolean, label: string) => {
    const car = findEnrichedCar(predicate);
    expect(car, `${label} should exist in the corpus`).toBeDefined();
    return resolveVehicleTaxonomy(car!).shoppingSegment;
  };
  const named = (make: string, model: string, year: number) => (c: Car) =>
    c.make === make && c.model === model && c.year === year;

  it.each([
    ['Rolls-Royce', 'Phantom', 2021],
    ['Bentley', 'Continental GT', 2020],
    ['Lexus', 'LS 500', 2022],
    ['BMW', '740i', 2015],
    ['Lincoln', 'Town Car', 2008],
  ])('puts the %s %s (%i) in luxury, not sport sedan or muscle', (make, model, year) => {
    // Regression: the horsepower rule for sport sedans ran first and claimed
    // them ("Sport Sedan · Enthusiast" on a Phantom); luxury held 14 cars.
    expect(segmentOf(named(make, model, year), `${year} ${make} ${model}`)).toBe('luxury');
  });

  it.each([
    ['Audi', 'S8', 2021],
    ['BMW', 'M3', 1997],
    ['Audi', 'RS 7', 2023],
  ])('recognizes the %s %s (%i) as a sport sedan by its badge', (make, model, year) => {
    // Without a horsepower figure (the S8's was a "999 hp" placeholder, now
    // dropped) these fell to "mainstream".
    expect(segmentOf(named(make, model, year), `${year} ${make} ${model}`)).toBe('sport-sedan');
  });

  it('keeps performance flagships sporty and SUVs utility', () => {
    expect(
      segmentOf((c) => c.make === 'Mercedes-Benz' && /^S63 AMG/.test(c.model), 'S63 AMG'),
    ).toBe('sport-sedan');
    expect(
      segmentOf(
        (c) => c.make === 'Rolls-Royce' && c.model === 'Cullinan' && c.bodyStyle === 'suv',
        'Cullinan SUV',
      ),
    ).toBe('utility');
  });

  it('leaves badge-named coupes to the sports-car / muscle split', () => {
    const seg = segmentOf(named('BMW', 'M4 Coupe', 2019), '2019 BMW M4 Coupe');
    expect(['sports-car', 'muscle']).toContain(seg);
  });
});
