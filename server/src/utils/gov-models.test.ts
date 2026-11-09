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

  it('reads past what NHTSA writes into a name besides the model', () => {
    // Cabs, and the newest records' "ICE", "GAS" and "(All Variants)".
    expect(match('FORD', 'F-150 REGULAR CAB', 2016)).toBe('ford|f150');
    expect(match('FORD', 'F-150 (SUPER CREW) GAS', 2024)).toBe('ford|f150');
    expect(match('FORD', 'F-150 (SUPER CREW) LIGHTNING BEV', 2023)).toBe('ford|f-150 lightning');
    expect(match('RAM', '1500 QUAD', 2019)).toBe(match('RAM', '1500', 2019));
    expect(match('HONDA', 'CR-V ICE', 2026)).toBe('honda|cr-v');
    expect(match('MAZDA', 'MAZDA3 SEDAN', 2020)).toBe('mazda|3');
    expect(match('MAZDA', 'MAZDA3 SEDAN ICE', 2026)).toBe('mazda|3');
    // The make twice, and Toyota's Scion brand.
    expect(match('RAM', 'RAM 1500', 2019)).toBe(match('RAM', '1500', 2019));
    expect(match('TOYOTA', 'SCION TC', 2012)).toBe(match('SCION', 'TC', 2012));
    // A Super Duty's cab leaves a heavy-duty truck, which the site does not list.
    expect(match('FORD', 'F-250 SUPER CREW', 2016)).toBeNull();
  });

  it('maps NHTSA aliases that name the same vehicle the site lists', () => {
    // From 2017 Mini drops "Cooper" in the model field.
    expect(match('MINI', 'HARDTOP', 2020)).toBe('mini|cooper');
    expect(match('MINI', 'CLUBMAN', 2020)).toBe('mini|cooper');
    expect(match('MINI', 'COUNTRYMAN', 2020)).toBe('mini|cooper');
    expect(match('MINI', 'CONVERTIBLE', 2020)).toBe('mini|cooper');
    // Maybach is a Mercedes-Benz line on the site; Q70L the long Q70.
    expect(match('MERCEDES-MAYBACH', 'S-CLASS', 2018)).toBe('mercedes-benz|maybach s');
    expect(match('INFINITI', 'Q70L', 2018)).toBe('infiniti|q70');
    expect(match('LAND ROVER', 'RANGE ROVER (SWB)', 2018)).toBe('land rover|range rover');
    // BMW XI = xDrive; GT = Gran Turismo; body after a series name.
    expect(match('BMW', '650XI', 2015)).toBe('bmw|6 series');
    expect(match('BMW', '535I GT', 2015)).toBe('bmw|5 series');
    expect(match('BMW', '2 SERIES GRAN COUPE', 2022)).toBe('bmw|2 series');
    expect(match('BMW', '4 SERIES COUPE', 2023)).toBe('bmw|4 series');
    expect(match('VOLVO', 'S60I', 2016)).toBe('volvo|s60');
    expect(match('JAGUAR', 'F-TYPE CONVERTIBLE', 2022)).toBe('jaguar|f-type');
    expect(match('TESLA', 'MODEL S P90D', 2016)).toBe('tesla|model s');
    expect(match('FORD', 'F-150 SUPER CREW DIESEL', 2019)).toBe('ford|f150');
    expect(match('HONDA', 'FCX', 2014)).toBe('honda|fcx clarity');
    expect(match('MERCEDES-BENZ', 'B-CLASS E-CELL', 2015)).toBe(
      match('MERCEDES-BENZ', 'B-CLASS ELECTRIC DRIVE', 2015),
    );
    expect(match('MERCEDES-BENZ', 'B-CLASS E-CELL', 2015)).toBeTruthy();
    // The full-size Promaster is not the Promaster City EPA lists.
    expect(match('RAM', 'PROMASTER', 2018)).toBeNull();
    expect(match('RAM', 'PROMASTER CITY', 2018)).toBe('ram|promaster');
  });
});
