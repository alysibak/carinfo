import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import type { VinDecodeResult } from './nhtsa.service.js';
import { catalogCarsForVin, vinBody, vinDrive, vinFuel, vinGearbox } from './vin-match.service.js';

function car(
  id: string,
  model: string,
  engine: Partial<Car['engine']> & { fuelType?: Car['engine']['fuelType'] },
  rest: Partial<Pick<Car, 'year' | 'make' | 'driveType' | 'bodyStyle' | 'price'>> & {
    gearbox?: Car['transmission']['type'];
    speeds?: number;
  } = {},
): Car {
  return {
    id,
    make: rest.make ?? 'Honda',
    model,
    year: rest.year ?? 2003,
    engine: { fuelType: 'gasoline', ...engine },
    transmission: { type: rest.gearbox ?? 'automatic', speeds: rest.speeds },
    driveType: rest.driveType ?? 'FWD',
    bodyStyle: rest.bodyStyle ?? 'sedan',
    price: rest.price,
  } as Car;
}

function decoded(over: Partial<VinDecodeResult>): VinDecodeResult {
  return {
    vin: '1HGCM82633A004352',
    decodedClean: true,
    year: 2003,
    make: 'HONDA',
    model: 'Accord',
    ...over,
    engine: { ...(over.engine ?? {}) },
  };
}

// The 2003 Accord sedans EPA rated, and a model that shares the name's start.
const ACCORDS = [
  car('accord-24-auto', 'Accord', { displacement: 2.4, cylinders: 4 }, { speeds: 5 }),
  car(
    'accord-24-manual',
    'Accord',
    { displacement: 2.4, cylinders: 4 },
    { gearbox: 'manual', speeds: 5 },
  ),
  car(
    'accord-30-manual',
    'Accord',
    { displacement: 3, cylinders: 6 },
    { gearbox: 'manual', speeds: 6 },
  ),
  car('accord-30-auto', 'Accord', { displacement: 3, cylinders: 6 }, { speeds: 5 }),
  car('crosstour', 'Accord Crosstour 4WD', { displacement: 3.5, cylinders: 6 }, { year: 2010 }),
  car('civic', 'Civic', { displacement: 1.7, cylinders: 4 }),
];

describe('reading vPIC’s words', () => {
  it('reads drive, fuel, body and gearbox', () => {
    expect(vinDrive('AWD/All-Wheel Drive')).toBe('AWD');
    expect(vinDrive('4WD/4-Wheel Drive/4x4')).toBe('4WD');
    expect(vinDrive('4x2')).toBe('RWD');
    expect(vinDrive(undefined)).toBeNull();

    expect(vinFuel({ fuelPrimary: 'Gasoline' })).toBe('gasoline');
    expect(
      vinFuel({ fuelPrimary: 'Gasoline', electrification: 'Strong HEV (Hybrid Electric Vehicle)' }),
    ).toBe('hybrid');
    expect(
      vinFuel({ fuelPrimary: 'Gasoline', electrification: 'Mild HEV (Hybrid Electric Vehicle)' }),
    ).toBe('gasoline');
    expect(
      vinFuel({
        fuelPrimary: 'Electric',
        electrification: 'PHEV (Plug-in Hybrid Electric Vehicle)',
      }),
    ).toBe('plug-in hybrid');
    expect(
      vinFuel({ fuelPrimary: 'Electric', electrification: 'BEV (Battery Electric Vehicle)' }),
    ).toBe('electric');
    expect(vinFuel({ fuelPrimary: 'Diesel' })).toBe('diesel');
    expect(vinFuel({ fuelPrimary: 'Flexible Fuel Vehicle (FFV)' })).toBe('gasoline');
    expect(vinFuel({})).toBeNull();

    expect(vinBody('Sedan/Saloon')).toBe('sedan');
    expect(vinBody('Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)')).toBe('suv');
    expect(vinBody('Hatchback/Liftback/Notchback')).toBe('hatchback');
    expect(vinBody('Pickup')).toBe('truck');
    expect(vinBody('Minivan')).toBe('minivan');
    expect(vinBody('Cargo Van')).toBe('van');

    expect(vinGearbox('Automatic')).toBe('automatic');
    expect(vinGearbox('Manual/Standard')).toBe('manual');
    expect(vinGearbox('Continuously Variable Transmission (CVT)')).toBe('cvt');
    expect(vinGearbox('Dual-Clutch Transmission (DCT)')).toBe('dual-clutch');
  });
});

describe('the cars here a VIN is', () => {
  it('takes the version whose engine and gearbox the VIN gives', () => {
    const match = catalogCarsForVin(
      decoded({
        engine: { fuelPrimary: 'Gasoline', displacementL: 3, cylinders: 6 },
        transmission: 'Automatic',
        transmissionSpeeds: '5',
        bodyClass: 'Sedan/Saloon',
        driveType: 'FWD/Front-Wheel Drive',
      }),
      ACCORDS,
    );
    expect(match?.cars.map((c) => c.id)).toEqual(['accord-30-auto']);
    expect(match?.basis).toBe('version');
  });

  it('offers the versions it cannot tell apart', () => {
    const match = catalogCarsForVin(
      decoded({ engine: { fuelPrimary: 'Gasoline', displacementL: 3, cylinders: 6 } }),
      ACCORDS,
    );
    expect(match?.cars.map((c) => c.id).sort()).toEqual(['accord-30-auto', 'accord-30-manual']);
    expect(match?.basis).toBe('version');
  });

  it('offers the whole model year where the VIN says nothing more', () => {
    const match = catalogCarsForVin(decoded({}), ACCORDS);
    expect(match?.cars).toHaveLength(4);
    expect(match?.basis).toBe('year');
  });

  it('never offers a model that only shares the name’s start, nor another make or year', () => {
    const ids = catalogCarsForVin(decoded({}), ACCORDS)?.cars.map((c) => c.id);
    expect(ids).not.toContain('crosstour');
    expect(ids).not.toContain('civic');
    expect(catalogCarsForVin(decoded({ make: 'ACURA' }), ACCORDS)).toBeNull();
    expect(catalogCarsForVin(decoded({ year: 1999 }), ACCORDS)).toBeNull();
    expect(catalogCarsForVin(decoded({ model: 'Pilot' }), ACCORDS)).toBeNull();
  });

  it('holds a hybrid VIN to the hybrid', () => {
    const camrys = [
      car('camry', 'Camry', { displacement: 2.5, cylinders: 4 }, { make: 'Toyota', year: 2020 }),
      car(
        'camry-hybrid',
        'Camry Hybrid LE',
        { displacement: 2.5, cylinders: 4, fuelType: 'hybrid' },
        { make: 'Toyota', year: 2020, gearbox: 'cvt' },
      ),
    ];
    const match = catalogCarsForVin(
      decoded({
        year: 2020,
        make: 'TOYOTA',
        model: 'Camry',
        engine: {
          fuelPrimary: 'Gasoline',
          electrification: 'Strong HEV (Hybrid Electric Vehicle)',
          displacementL: 2.5,
          cylinders: 4,
        },
      }),
      camrys,
    );
    expect(match?.cars.map((c) => c.id)).toEqual(['camry-hybrid']);
  });

  it('finds a model EPA names otherwise: "F-150" as "F150 Pickup", BMW’s "3-Series" by its series', () => {
    const fords = [
      car(
        'f150-2wd',
        'F150 Pickup 2WD',
        { displacement: 2.7, cylinders: 6, aspiration: 'turbocharged' },
        { make: 'Ford', year: 2021, driveType: 'RWD', bodyStyle: 'truck' },
      ),
      car(
        'f150-4wd',
        'F150 Pickup 4WD',
        { displacement: 2.7, cylinders: 6, aspiration: 'turbocharged' },
        { make: 'Ford', year: 2021, driveType: '4WD', bodyStyle: 'truck' },
      ),
    ];
    const truck = catalogCarsForVin(
      decoded({
        year: 2021,
        make: 'FORD',
        model: 'F-150',
        driveType: '4WD/4-Wheel Drive/4x4',
        engine: { displacementL: 2.7, turbo: true },
      }),
      fords,
    );
    expect(truck?.cars.map((c) => c.id)).toEqual(['f150-4wd']);

    const bmws = [
      car(
        '330i',
        '330i Sedan',
        { displacement: 2, cylinders: 4, aspiration: 'turbocharged' },
        { make: 'BMW', year: 2020, driveType: 'RWD' },
      ),
      car(
        'm340i',
        'M340i Sedan',
        { displacement: 3, cylinders: 6, aspiration: 'turbocharged' },
        { make: 'BMW', year: 2020, driveType: 'RWD' },
      ),
    ];
    const bmw = catalogCarsForVin(
      decoded({
        year: 2020,
        make: 'BMW',
        model: '3-Series',
        series: '330i',
        engine: { displacementL: 2 },
      }),
      bmws,
    );
    expect(bmw?.cars.map((c) => c.id)).toEqual(['330i']);
  });
});

describe('telling versions apart by name', () => {
  it('takes the Wrangler Unlimited for series "Unlimited Sport", and not a coupe for an SUV', () => {
    const jeeps = [
      car(
        'wrangler',
        'Wrangler 4WD',
        { displacement: 3.6, cylinders: 6 },
        { make: 'Jeep', year: 2019, driveType: '4WD', bodyStyle: 'suv' },
      ),
      car(
        'unlimited',
        'Wrangler Unlimited 4WD',
        { displacement: 3.6, cylinders: 6 },
        { make: 'Jeep', year: 2019, driveType: '4WD', bodyStyle: 'suv' },
      ),
    ];
    const jeep = catalogCarsForVin(
      decoded({
        year: 2019,
        make: 'JEEP',
        model: 'Wrangler',
        series: 'Unlimited Sport',
        engine: { displacementL: 3.6 },
      }),
      jeeps,
    );
    expect(jeep?.cars.map((c) => c.id)).toEqual(['unlimited']);

    const glcs = [
      car(
        'glc',
        'GLC300 4matic',
        { displacement: 2, cylinders: 4 },
        { make: 'Mercedes-Benz', year: 2020, driveType: '4WD', bodyStyle: 'suv' },
      ),
      car(
        'glc-coupe',
        'GLC300 4matic Coupe',
        { displacement: 2, cylinders: 4 },
        { make: 'Mercedes-Benz', year: 2020, driveType: '4WD', bodyStyle: 'suv' },
      ),
    ];
    const glc = catalogCarsForVin(
      decoded({
        year: 2020,
        make: 'MERCEDES-BENZ',
        model: 'GLC-Class',
        series: 'GLC300 4MATIC',
        bodyClass: 'Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)',
        engine: { displacementL: 2 },
      }),
      glcs,
    );
    expect(glc?.cars.map((c) => c.id)).toEqual(['glc']);
  });
});

describe('against the catalog', () => {
  it('opens the 2003 Accord V6 automatic for the sample VIN, not the four-cylinder', () => {
    const match = catalogCarsForVin(
      decoded({
        engine: { fuelPrimary: 'Gasoline', displacementL: 3, cylinders: 6 },
        transmission: 'Automatic',
        transmissionSpeeds: '5',
        driveType: 'FWD/Front-Wheel Drive',
        bodyClass: 'Sedan/Saloon',
      }),
    );
    expect(match?.cars).toHaveLength(1);
    expect(match?.cars[0].engine.displacement).toBe(3);
    expect(match?.cars[0].transmission.type).toBe('automatic');
  });

  it('finds a Tesla Model 3 and a Ford F-150 by NHTSA’s names', () => {
    const tesla = catalogCarsForVin(
      decoded({
        year: 2019,
        make: 'TESLA',
        model: 'Model 3',
        engine: { fuelPrimary: 'Electric', electrification: 'BEV (Battery Electric Vehicle)' },
        driveType: 'AWD/All-Wheel Drive',
      }),
    );
    expect(tesla?.cars.length).toBeGreaterThan(0);
    for (const found of tesla?.cars ?? []) {
      expect(found.make).toBe('Tesla');
      expect(found.model).toMatch(/^Model 3/);
      expect(found.engine.fuelType).toBe('electric');
    }

    const ford = catalogCarsForVin(
      decoded({
        year: 2021,
        make: 'FORD',
        model: 'F-150',
        engine: { displacementL: 3.5, turbo: true, fuelPrimary: 'Gasoline' },
        driveType: '4WD/4-Wheel Drive/4x4',
      }),
    );
    expect(ford?.cars.length).toBeGreaterThan(0);
    for (const found of ford?.cars ?? []) {
      expect(found.model).toMatch(/^F150/i);
      expect(found.engine.displacement).toBeCloseTo(3.5, 1);
    }
  });
});
