import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { getAllCars } from '../services/car.service.js';
import { engineLayout } from './engine-layout.js';

const layoutOf = (pred: (c: Car) => boolean) => {
  const car = getAllCars().find(pred);
  expect(car).toBeDefined();
  return car!.engine.configuration;
};

const named = (make: string, model: RegExp, year: number, cylinders?: number) => (c: Car) =>
  c.make === make &&
  model.test(c.model) &&
  c.year === year &&
  (cylinders == null || c.engine.cylinders === cylinders);

describe('engine layouts', () => {
  it('follows the engine family, not the cylinder count', () => {
    // Every six was an "I6": a V6 Camry's page read "3.0L I6".
    expect(layoutOf(named('Toyota', /^Camry$/, 2004, 6))).toBe('V6');
    expect(layoutOf(named('BMW', /^M3/, 1996))).toBe('I6');
    expect(layoutOf(named('Porsche', /^911/, 2020, 6))).toBe('Flat-6');
    expect(layoutOf(named('Subaru', /^Outback/, 2020, 4))).toBe('Flat-4');
    expect(layoutOf(named('Toyota', /^GR ?86/, 2023))).toBe('Flat-4');
    // Every five was a "V5".
    expect(layoutOf(named('Volvo', /^850/, 1995))).toBe('I5');
    expect(layoutOf(named('Bentley', /^Continental GT/, 2012))).toBe('W12');
    expect(layoutOf((c) => c.make === 'Bugatti')).toBe('W16');
    expect(layoutOf(named('Mazda', /^RX-8/, 2004))).toBe('Rotary');
    expect(layoutOf(named('Jeep', /^Wrangler/, 2005, 6))).toBe('I6');
    expect(layoutOf(named('Chevrolet', /^TrailBlazer/i, 2005, 6))).toBe('I6');
    // The GR Supra's six is BMW's.
    expect(layoutOf(named('Toyota', /^GR Supra$/, 2022, 6))).toBe('I6');
  });

  it('dates the Mercedes, Jaguar and Land Rover straight sixes by their 48 V systems', () => {
    expect(layoutOf(named('Mercedes-Benz', /^E450/, 2021))).toBe('I6');
    expect(layoutOf(named('Mercedes-Benz', /^AMG C43/, 2020))).toBe('V6');
    expect(layoutOf(named('Mercedes-Benz', /^E320/, 1996))).toBe('I6');
    expect(layoutOf(named('Mercedes-Benz', /^E320/, 2003))).toBe('V6');
    expect(layoutOf(named('Land Rover', /^Defender 110 MHEV/, 2022))).toBe('I6');
    expect(layoutOf(named('Jaguar', /^F-Type S Coupe/, 2019))).toBe('V6');
  });

  it('claims no layout for a six from a maker it does not know', () => {
    const unknown = {
      id: 'x',
      make: 'Example Motors',
      model: 'Six',
      year: 2020,
      provenance: {},
      engine: { fuelType: 'gasoline' as const, cylinders: 6, displacement: 3 },
      fuelEconomy: {},
      transmission: { type: 'automatic' as const },
      driveType: 'RWD' as const,
      bodyStyle: 'sedan' as const,
    };
    expect(engineLayout(unknown)).toBeUndefined();
    expect(engineLayout({ ...unknown, engine: { ...unknown.engine, cylinders: 4 } })).toBe('I4');
    expect(engineLayout({ ...unknown, engine: { fuelType: 'electric' as const } })).toBeUndefined();
  });
});
