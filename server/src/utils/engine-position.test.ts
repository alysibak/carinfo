import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types.js';
import { enginePosition } from './engine-position.js';

const car = (make: string, model: string, year = 2020, fuelType: string = 'gasoline') =>
  ({ make, model, year, engine: { fuelType } }) as CarSpecs;

describe('enginePosition', () => {
  it('knows the mid-engined cars by name', () => {
    for (const [make, model] of [
      ['McLaren Automotive', '720S Coupe'],
      ['Lamborghini', 'Huracan Spyder'],
      ['Ferrari', 'F8 Tributo'],
      ['Ferrari', 'Ferrari F355 Berlinetta/GTS'],
      ['Porsche', '718 Cayman GTS'],
      ['Audi', 'R8 Spyder'],
      ['Acura', 'NSX Hybrid'],
      ['Ford', 'GT'],
      ['Toyota', 'MR2'],
    ]) {
      expect(enginePosition(car(make, model)), model).toBe('mid');
    }
    // The Corvette moved the engine behind the seats in 2020.
    expect(enginePosition(car('Chevrolet', 'Corvette', 2020))).toBe('mid');
    expect(enginePosition(car('Chevrolet', 'Corvette', 2019))).toBe('front');
  });

  it('keeps the front-engined cars of the same makes in front', () => {
    expect(enginePosition(car('Lamborghini', 'Urus'))).toBe('front');
    expect(enginePosition(car('Ferrari', '812 Superfast'))).toBe('front');
    expect(enginePosition(car('Ferrari', 'F12 Berlinetta'))).toBe('front');
    expect(enginePosition(car('Porsche', 'Cayenne Turbo'))).toBe('front');
  });

  it('knows the 911 in every name EPA gave it, and the smart', () => {
    expect(enginePosition(car('Porsche', '911 Carrera 4S'))).toBe('rear');
    expect(enginePosition(car('Porsche', 'Carrera 2 Coupe', 2005))).toBe('rear');
    expect(enginePosition(car('Porsche', 'Turbo 4 911', 2004))).toBe('rear');
    expect(enginePosition(car('Porsche', 'Carrera GT', 2004))).toBe('mid');
    expect(enginePosition(car('smart', 'fortwo coupe', 2015))).toBe('rear');
  });

  it('gives electric cars no engine position', () => {
    expect(enginePosition(car('smart', 'fortwo electric drive coupe', 2015, 'electric'))).toBe(
      undefined,
    );
  });
});
