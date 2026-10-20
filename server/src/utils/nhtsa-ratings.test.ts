import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { getAllCars, getCarById } from '../services/car.service.js';
import {
  ratingOf,
  summarize,
  techSummary,
  testedConfiguration,
  testsDescribing,
  type NhtsaVehicle,
} from './nhtsa-ratings.js';

const vehicle = (
  description: string,
  model: string,
  extra: Partial<NhtsaVehicle> = {},
): NhtsaVehicle => ({
  VehicleId: Math.floor(Math.random() * 1e6),
  VehicleDescription: description,
  Make: description.split(' ')[1],
  Model: model,
  ModelYear: Number(description.split(' ')[0]),
  ...extra,
});

const car = (
  model: string,
  bodyStyle: Car['bodyStyle'],
  driveType: Car['driveType'],
  fuelType: Car['engine']['fuelType'] = 'gasoline',
) => ({ model, bodyStyle, driveType, engine: { fuelType } as Car['engine'] });

const tested = (...vehicles: NhtsaVehicle[]) =>
  vehicles.map((v) => ({ config: testedConfiguration(v), tested: v.VehicleDescription }));

describe('testedConfiguration', () => {
  it('reads the body and drivetrain from NHTSA’s description', () => {
    expect(testedConfiguration(vehicle('2011 Acura MDX SUV AWD', 'MDX'))).toMatchObject({
      body: 'suv',
      drive: 'awd',
    });
    expect(testedConfiguration(vehicle('2020 Toyota CAMRY 4 DR FWD', 'CAMRY')).body).toBe('sedan');
    expect(testedConfiguration(vehicle('2016 Honda Civic 2 DR FWD', 'CIVIC')).body).toBe('coupe');
    // "C" is NHTSA's convertible: "A5 Cabriolet C", "Mustang C".
    expect(testedConfiguration(vehicle('2018 Ford Mustang C RWD', 'MUSTANG')).body).toBe(
      'convertible',
    );
    expect(
      testedConfiguration(vehicle('2019 Ford F-150 Super Crew PU/CC 4x4', 'F-150')),
    ).toMatchObject({ body: 'truck', drive: '4wd' });
    expect(testedConfiguration(vehicle('2012 Toyota Prius 5 HB FWD', 'PRIUS')).body).toBe(
      'hatchback',
    );
    // The newest descriptions put a powertrain code before the drivetrain.
    expect(
      testedConfiguration(vehicle('2026 HONDA CR-V HYBRID SUV HEV AWD', 'CR-V HYBRID HEV')),
    ).toMatchObject({ body: 'suv', drive: 'awd', electrified: true });
    expect(testedConfiguration(vehicle('2026 HONDA CR-V SUV N/A FWD', 'CR-V ICE'))).toMatchObject({
      body: 'suv',
      electrified: false,
      name: ['crv'],
    });
  });

  it('marks a hybrid NHTSA names only in the description', () => {
    expect(
      testedConfiguration(
        vehicle('2018 Chevrolet Silverado 1500 Hybrid PU/CC RWD', 'SILVERADO 1500'),
      ).electrified,
    ).toBe(true);
  });
});

describe('testsDescribing', () => {
  const civic = tested(
    vehicle('2016 Honda Civic 4 DR FWD', 'CIVIC'),
    vehicle('2016 Honda Civic 2 DR FWD', 'CIVIC'),
  );

  it('takes the test of the car’s own body and drivetrain', () => {
    expect(testsDescribing(car('Civic 2Dr', 'coupe', 'FWD'), civic).map((t) => t.tested)).toEqual([
      '2016 Honda Civic 2 DR FWD',
    ]);
    const camry = tested(
      vehicle('2020 Toyota CAMRY 4 DR FWD', 'CAMRY'),
      vehicle('2020 Toyota CAMRY 4 DR AWD', 'CAMRY'),
    );
    expect(testsDescribing(car('Camry AWD LE/SE', 'sedan', 'AWD'), camry)[0].tested).toBe(
      '2020 Toyota CAMRY 4 DR AWD',
    );
  });

  it('gives a body NHTSA did not test none of another’s', () => {
    // A convertible is not the coupe NHTSA crashed, nor a coupe the sedan.
    expect(testsDescribing(car('Civic Convertible', 'convertible', 'FWD'), civic)).toEqual([]);
    const sedanOnly = tested(vehicle('2013 Honda Civic 4 DR FWD', 'CIVIC'));
    expect(testsDescribing(car('Civic Coupe', 'coupe', 'FWD'), sedanOnly)).toEqual([]);
  });

  it('allows the body NHTSA files a car under by another name', () => {
    const soul = tested(vehicle('2016 Kia Soul SUV FWD', 'SOUL'));
    expect(testsDescribing(car('Soul', 'hatchback', 'FWD'), soul)).toHaveLength(1);
  });

  it('keeps every cab of a pickup the site lists once', () => {
    const tacoma = tested(
      vehicle('2018 Toyota Tacoma PU/CC 4WD', 'TACOMA'),
      vehicle('2018 Toyota Tacoma PU/EC 4WD', 'TACOMA'),
      vehicle('2018 Toyota Tacoma PU/CC 2WD', 'TACOMA'),
    );
    expect(testsDescribing(car('Tacoma 4WD', 'truck', '4WD'), tacoma)).toHaveLength(2);
  });

  it('picks the version NHTSA names, and no other', () => {
    const yukon = tested(
      vehicle('2016 GMC Yukon SUV RWD', 'YUKON'),
      vehicle('2016 GMC Yukon XL 1500 SUV RWD', 'YUKON XL 1500'),
    );
    expect(testsDescribing(car('Yukon C1500 XL 2WD', 'suv', 'RWD'), yukon)[0].tested).toBe(
      '2016 GMC Yukon XL 1500 SUV RWD',
    );
    expect(testsDescribing(car('Yukon C1500 2WD', 'suv', 'RWD'), yukon)[0].tested).toBe(
      '2016 GMC Yukon SUV RWD',
    );
    const express = tested(
      vehicle('2016 Chevrolet Express Cargo 1500 VAN RWD', 'EXPRESS CARGO 1500'),
      vehicle('2016 Chevrolet Express Passenger 1500 VAN RWD', 'EXPRESS PASSENGER 1500'),
    );
    expect(testsDescribing(car('Express 2500 2WD Passenger', 'van', 'RWD'), express)).toEqual([]);
  });

  it('keeps hybrids and gas cars to their own tests', () => {
    const camry = tested(
      vehicle('2011 Toyota Camry 4 DR FWD', 'CAMRY'),
      vehicle('2011 Toyota Camry HV 4 DR FWD', 'CAMRY HV'),
    );
    expect(testsDescribing(car('Camry', 'sedan', 'FWD'), camry)[0].tested).toBe(
      '2011 Toyota Camry 4 DR FWD',
    );
    expect(testsDescribing(car('Camry Hybrid', 'sedan', 'FWD', 'hybrid'), camry)[0].tested).toBe(
      '2011 Toyota Camry HV 4 DR FWD',
    );
    // A Prius is a hybrid by name alone; the plug-in is its own test.
    const prius = tested(
      vehicle('2012 Toyota Prius 5 HB FWD', 'PRIUS'),
      vehicle('2012 Toyota Prius Plug-In 5 HB FWD', 'PRIUS PLUG-IN'),
    );
    expect(testsDescribing(car('Prius', 'hatchback', 'FWD', 'hybrid'), prius)[0].tested).toBe(
      '2012 Toyota Prius 5 HB FWD',
    );
    expect(
      testsDescribing(car('Prius Plug-in Hybrid', 'hatchback', 'FWD', 'plug-in hybrid'), prius)[0]
        .tested,
    ).toBe('2012 Toyota Prius Plug-In 5 HB FWD');
    // A hybrid named only by its fuel takes the hybrid's test.
    const crv = tested(
      vehicle('2026 HONDA CR-V SUV N/A FWD', 'CR-V ICE'),
      vehicle('2026 HONDA CR-V HYBRID SUV HEV FWD', 'CR-V HYBRID HEV'),
    );
    expect(testsDescribing(car('CR-V FWD', 'suv', 'FWD', 'hybrid'), crv)[0].tested).toBe(
      '2026 HONDA CR-V HYBRID SUV HEV FWD',
    );
    expect(testsDescribing(car('CR-V FWD', 'suv', 'FWD'), crv)[0].tested).toBe(
      '2026 HONDA CR-V SUV N/A FWD',
    );
  });
});

describe('ratings', () => {
  it('reads NHTSA’s stars, rollover risk and listed technology', () => {
    const rating = ratingOf(
      vehicle('2011 Acura MDX SUV AWD', 'MDX', {
        OverallRating: '5',
        OverallFrontCrashRating: '4',
        OverallSideCrashRating: '5',
        RolloverRating: '4',
        RolloverPossibility: 0.14,
        NHTSAElectronicStabilityControl: 'Standard',
        NHTSAForwardCollisionWarning: 'Optional',
        NHTSALaneDepartureWarning: 'No',
      }),
    );
    expect(rating).toMatchObject({
      overall: 5,
      frontal: 4,
      side: 5,
      rollover: 4,
      rolloverRisk: 0.14,
      esc: 'standard',
      fcw: 'optional',
    });
    // "No": NHTSA does not list it, which is not a claim the car lacks it.
    expect(rating.ldw).toBeUndefined();
    expect(
      ratingOf(vehicle('2017 Mazda MX-5 C RWD', 'MX-5', { OverallRating: 'Not Rated' })),
    ).not.toHaveProperty('overall');
  });

  it('summarizes several tests by the lowest score and highest risk', () => {
    const early = {
      id: 1,
      tested: 'Early',
      overall: 3,
      frontal: 3,
      rolloverRisk: 0.1,
      esc: 'standard' as const,
    };
    const later = {
      id: 2,
      tested: 'Later',
      overall: 4,
      frontal: 3,
      rolloverRisk: 0.12,
      esc: 'standard' as const,
      fcw: 'optional' as const,
    };
    expect(summarize([early, later])).toEqual({
      nhtsaIds: [1, 2],
      overall: 3,
      frontal: 3,
      rolloverRisk: 0.12,
    });
    expect(techSummary([early, later])).toEqual({ esc: 'standard', fcw: 'optional' });
  });
});

describe('the site’s ratings', () => {
  const cars = getAllCars();

  it('come from the car’s own model year, NHTSA’s program starting in 2011', () => {
    expect(cars.filter((c) => c.year < 2011 && c.safetyRating)).toEqual([]);
    expect(cars.filter((c) => c.safetyRating?.overall).length).toBeGreaterThan(9000);
  });

  it('list each test that describes the car', () => {
    // The 2011 Camry was rated twice: built early in the year, and later.
    const camry = cars.find((c) => c.year === 2011 && c.model === 'Camry' && c.driveType === 'FWD');
    expect(camry?.safetyRating?.nhtsaIds).toHaveLength(2);
    expect(camry?.safetyRating?.overall).toBe(3);
    const crosstour = cars.find((c) => c.year === 2010 && /Crosstour/.test(c.model));
    expect(crosstour && getCarById(crosstour.id)?.safetyRating).toBeUndefined();
  });
});
