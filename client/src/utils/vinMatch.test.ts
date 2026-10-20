import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { vinCatalogCar, vinDriveType } from './vinMatch';

const car = (id: string, year: number, driveType: CarSpecs['driveType'], make = 'Honda') =>
  ({ id, year, make, model: 'CR-V', driveType }) as CarSpecs;

describe('vinMatch', () => {
  it('reads vPIC’s drive names', () => {
    expect(vinDriveType('AWD/All-Wheel Drive')).toBe('AWD');
    expect(vinDriveType('4WD/4-Wheel Drive/4x4')).toBe('4WD');
    expect(vinDriveType('FWD/Front-Wheel Drive')).toBe('FWD');
    expect(vinDriveType('4x2')).toBe('RWD');
    expect(vinDriveType(undefined)).toBeNull();
  });

  it('picks the catalog car of the VIN’s make, year and drive', () => {
    const results = [car('a', 2018, 'FWD'), car('b', 2017, 'FWD'), car('c', 2017, 'AWD')];
    expect(
      vinCatalogCar({ year: 2017, make: 'HONDA', driveType: 'AWD/All-Wheel Drive' }, results)?.id,
    ).toBe('c');
    // No drive on the VIN: the year's first.
    expect(vinCatalogCar({ year: 2017, make: 'HONDA' }, results)?.id).toBe('b');
    // Another year or make is not this car.
    expect(vinCatalogCar({ year: 2016, make: 'HONDA' }, results)).toBeNull();
    expect(vinCatalogCar({ year: 2017, make: 'ACURA' }, results)).toBeNull();
  });
});
