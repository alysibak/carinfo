import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  descriptionBody,
  epaBaseModel,
  indexPhotos,
  nameWords,
  type NhtsaPhotoVehicle,
  photoFor,
  withNhtsaPhotos,
} from './nhtsa-photos.js';

let nextId = 1;
const nhtsa = (year: number, make: string, model: string, description: string) =>
  ({
    id: nextId++,
    year,
    make,
    model,
    description,
    picture: `${nextId}_st0640_046.png`,
  }) satisfies NhtsaPhotoVehicle;

const car = (
  year: number,
  make: string,
  model: string,
  bodyStyle: Car['bodyStyle'],
  driveType: Car['driveType'],
  trim?: string,
): Car => ({
  id: `${make}-${model}-${year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  make,
  model,
  year,
  trim,
  bodyStyle,
  driveType,
  provenance: {},
  engine: { fuelType: 'gasoline' },
  fuelEconomy: {},
  transmission: { type: 'automatic' },
});

const vehicles = [
  nhtsa(2019, 'HONDA', 'CIVIC', '2019 Honda Civic 4 DR FWD'),
  nhtsa(2019, 'HONDA', 'CIVIC', '2019 Honda Civic 2 DR FWD'),
  nhtsa(2019, 'HONDA', 'CIVIC', '2019 Honda Civic 5 HB FWD'),
  nhtsa(2019, 'FORD', 'F-150', '2019 Ford F-150 SuperCrew PU/CC 4WD'),
  nhtsa(2019, 'FORD', 'F-150', '2019 Ford F-150 SuperCrew PU/CC 2WD'),
  nhtsa(2019, 'MERCEDES-BENZ', 'C-CLASS', '2019 Mercedes-Benz C-Class 4 DR RWD'),
  nhtsa(2019, 'CHEVROLET', 'SILVERADO 1500', '2019 Chevrolet Silverado 1500 Crew Cab PU/CC 4WD'),
  nhtsa(2016, 'TOYOTA', 'PRIUS', '2016 Toyota Prius 5 HB FWD'),
  nhtsa(2016, 'TOYOTA', 'PRIUS C', '2016 Toyota Prius c 5 HB FWD'),
  nhtsa(2020, 'HYUNDAI', 'IONIQ', '2020 Hyundai Ioniq 5 HB FWD'),
  nhtsa(2019, 'HONDA', 'ACCORD', '2019 Honda Accord 4 DR FWD'),
];
const index = indexPhotos(vehicles);
const photo = (c: Car) => photoFor(c, index)?.description;

describe('nameWords', () => {
  it('closes up joins and drops EPA’s notes', () => {
    expect(nameWords('F-150 Pickup 4WD')).toEqual(['f150', 'pickup', '4wd']);
    expect(nameWords('Silverado 4WD  (Flex Fuel)')).toEqual(['silverado', '4wd']);
    expect(nameWords('F150 3.5L 2WD GVWR>7599 LBS')).toEqual([
      'f150',
      '35l',
      '2wd',
      'gvwr',
      '7599',
      'lbs',
    ]);
  });
});

describe('epaBaseModel', () => {
  it('reads EPA’s family name from the trim slug', () => {
    expect(epaBaseModel('c-class-automatic-9-spd')).toEqual(['c', 'class']);
    expect(epaBaseModel('5-series-3mode-clkup-automatic-s6')).toEqual(['5', 'series']);
    expect(epaBaseModel('ram-1500-pickup-clkup-automatic-4-spd')).toEqual([
      'ram',
      '1500',
      'pickup',
    ]);
    expect(epaBaseModel(undefined)).toEqual([]);
    expect(epaBaseModel('no-transmission-here')).toEqual([]);
  });
});

describe('descriptionBody', () => {
  it('reads the body NHTSA names', () => {
    expect(descriptionBody('2019 Honda Civic 4 DR FWD')).toBe('sedan');
    expect(descriptionBody('2019 Honda Civic 2 DR FWD')).toBe('coupe');
    expect(descriptionBody('2019 Honda Civic 5 HB FWD')).toBe('hatchback');
    expect(descriptionBody('2019 Ford F-150 SuperCrew PU/CC 4WD')).toBe('truck');
    expect(descriptionBody('2019 Honda Odyssey VAN FWD')).toBe('van');
    expect(descriptionBody('2019 Honda CR-V SUV AWD')).toBe('suv');
    expect(descriptionBody('2019 Ford Mustang CONV RWD')).toBe('convertible');
    expect(descriptionBody('2019 Tesla Model 3')).toBeUndefined();
  });
});

describe('photoFor', () => {
  it('gives each body of a model its own photo', () => {
    expect(photo(car(2019, 'Honda', 'Civic 4Dr', 'sedan', 'FWD'))).toBe(
      '2019 Honda Civic 4 DR FWD',
    );
    expect(photo(car(2019, 'Honda', 'Civic 2Dr', 'coupe', 'FWD'))).toBe(
      '2019 Honda Civic 2 DR FWD',
    );
    expect(photo(car(2019, 'Honda', 'Civic 5Dr', 'hatchback', 'FWD'))).toBe(
      '2019 Honda Civic 5 HB FWD',
    );
  });

  it('takes the photo of the same drive when NHTSA has both', () => {
    expect(photo(car(2019, 'Ford', 'F150 Pickup 4WD', 'truck', '4WD'))).toContain('4WD');
    expect(photo(car(2019, 'Ford', 'F150 2.7L 2WD GVWR>6649 LBS', 'truck', 'RWD'))).toContain(
      '2WD',
    );
  });

  it('matches EPA’s family name: a C300 is NHTSA’s C-Class', () => {
    const c300 = car(
      2019,
      'Mercedes-Benz',
      'C300 4matic',
      'sedan',
      'AWD',
      'c-class-automatic-9-spd',
    );
    expect(photo(c300)).toBe('2019 Mercedes-Benz C-Class 4 DR RWD');
    // Not the coupe: NHTSA photographed the sedan.
    const coupe = { ...c300, model: 'C300 Coupe', bodyStyle: 'coupe' as const };
    expect(photo(coupe)).toBeUndefined();
  });

  it('reads GM’s half-ton code as NHTSA’s 1500', () => {
    const truck = car(
      2019,
      'Chevrolet',
      'Silverado K15 4WD',
      'truck',
      '4WD',
      'silverado-automatic-8-spd',
    );
    expect(photo(truck)).toContain('Silverado 1500');
  });

  it('gives no photo for another car of the same name', () => {
    expect(photo(car(2019, 'Ford', 'F150 RAPTOR 4WD', 'truck', '4WD'))).toBeUndefined();
    expect(
      photo(car(2019, 'Honda', 'Civic Type R', 'hatchback', 'FWD', 'civic-manual-6-spd')),
    ).toBeUndefined();
    const ld = car(
      2019,
      'Chevrolet',
      'Silverado LD C15 2WD',
      'truck',
      'RWD',
      'silverado-automatic-6-spd',
    );
    expect(photo(ld)).toBeUndefined();
    expect(photo(car(2019, 'Honda', 'Accord Crosstour', 'hatchback', 'FWD'))).toBeUndefined();
    expect(photo(car(2020, 'Hyundai', 'Ioniq 5', 'suv', 'AWD'))).toBeUndefined();
  });

  it('keeps the c in Prius c', () => {
    expect(photo(car(2016, 'Toyota', 'Prius c', 'hatchback', 'FWD'))).toBe(
      '2016 Toyota Prius c 5 HB FWD',
    );
    expect(photo(car(2016, 'Toyota', 'Prius', 'hatchback', 'FWD'))).toBe(
      '2016 Toyota Prius 5 HB FWD',
    );
    expect(photo(car(2016, 'Toyota', 'Prius v', 'wagon', 'FWD'))).toBeUndefined();
  });

  it('takes only the same model year', () => {
    expect(photo(car(2018, 'Honda', 'Civic 4Dr', 'sedan', 'FWD'))).toBeUndefined();
    expect(photo(car(2019, 'Acura', 'ILX', 'sedan', 'FWD'))).toBeUndefined();
  });
});

describe('withNhtsaPhotos', () => {
  it('sets the file and NHTSA’s name for the car, and clears a stale one', () => {
    const civic = car(2019, 'Honda', 'Civic 4Dr', 'sedan', 'FWD');
    const ilx = {
      ...car(2019, 'Acura', 'ILX', 'sedan', 'FWD'),
      photo: { file: 'x.png', caption: 'old' },
    };
    const [withPhoto, without] = withNhtsaPhotos([civic, ilx], vehicles);
    expect(withPhoto.photo).toEqual({
      file: vehicles[0].picture,
      caption: '2019 Honda Civic 4 DR FWD',
    });
    expect(without).not.toHaveProperty('photo');
  });

  it('ignores a file name that is not a bare one', () => {
    const bad = { ...vehicles[0], picture: '../../etc/passwd' };
    expect(
      withNhtsaPhotos([car(2019, 'Honda', 'Civic 4Dr', 'sedan', 'FWD')], [bad])[0].photo,
    ).toBeUndefined();
  });
});
