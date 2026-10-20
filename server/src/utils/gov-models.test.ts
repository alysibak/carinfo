import { describe, expect, it } from 'vitest';
import { getAllCars, modelLineKey } from '../services/car.service.js';
import { govModelIndex } from './gov-models.js';

describe('govModelIndex', () => {
  const index = govModelIndex(getAllCars(), modelLineKey);
  const match = (make: string, model: string, year: number) => index.match(make, model, year);

  it('finds the site’s model line under the government’s spelling', () => {
    expect(match('FORD', 'F-150', 2018)).toBe('ford|f150');
    expect(match('FORD', 'F-150 LIGHTNING', 2023)).toBe('ford|f-150 lightning');
    expect(match('TOYOTA', '4 RUNNER', 2015)).toBe('toyota|4runner');
    expect(match('MAZDA', 'MAZDA3', 2016)).toBe('mazda|3');
    expect(match('MERCEDES-BENZ', 'C CLASS', 2019)).toBe('mercedes-benz|c');
    expect(match('MERCEDES BENZ', 'C300', 2019)).toBe('mercedes-benz|c');
    expect(match('BMW', '328I', 2015)).toBe('bmw|3 series');
    expect(match('VOLKSWAGEN', 'GTI', 2019)).toBe('volkswagen|golf');
    expect(match('CHEVROLET', 'SILVERADO 1500', 2019)).toBe('chevrolet|silverado');
    expect(match('CHRYSLER', 'TOWN & COUNTRY', 2015)).toBe(
      match('CHRYSLER', 'TOWN AND COUNTRY', 2015),
    );
  });

  it('leaves out what the site does not list, rather than a near name', () => {
    // Heavy-duty pickups, which EPA does not rate, are not the half-tons.
    expect(match('GMC', 'SIERRA 3500', 2020)).toBeNull();
    expect(match('CHEVROLET', 'SILVERADO 2500HD', 2020)).toBeNull();
    expect(match('FORD', 'F-250 SUPER DUTY', 2020)).toBeNull();
    // A year the site has no such car, and a make it has none of.
    expect(match('HONDA', 'CIVIC', 1980)).toBeNull();
    expect(match('WORKHORSE', 'W22', 2010)).toBeNull();
    // Not a longer model's name, nor a body word alone.
    expect(match('FORD', 'TRANSIT', 2018)).not.toBe('ford|transit connect');
    expect(match('CHEVROLET', 'PICKUP', 2000)).toBeNull();
    // One word of a longer name, when it names one line.
    expect(match('CHEVROLET', 'CAMARO ZL1', 2018)).toBe('chevrolet|camaro');
  });
});
