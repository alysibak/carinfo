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

  it('tells a Golf from a GTI by EPA model name, not the shared trim slug', () => {
    // EPA files both under the base model "Golf/GTI", so every trim slug reads
    // "golf-gti": by the slug, Golf TDIs and 2.5-litre Golfs were GTIs.
    const vw = (model: string, displacement: number, fuelType: Car['engine']['fuelType']) =>
      canonicalizeDisplayModel(
        minimalCar({
          make: 'Volkswagen',
          model,
          trim: 'golf-gti-manual-6-spd',
          engine: { fuelType, displacement },
          bodyStyle: 'hatchback',
        }),
      );
    expect(vw('GTI', 2, 'gasoline')).toBe('Golf GTI');
    // The 2000-06 GTI 1.8T is a GTI.
    expect(vw('GTI', 1.8, 'gasoline')).toBe('Golf GTI');
    expect(vw('GTI VR6', 2.8, 'gasoline')).toBe('Golf GTI');
    expect(vw('Golf', 2, 'diesel')).toBe('Golf');
    expect(vw('Golf', 2.5, 'gasoline')).toBe('Golf');
    expect(vw('Golf', 1.8, 'gasoline')).toBe('Golf');
    // EPA's own lumped names say nothing either way.
    expect(vw('Golf III / GTI', 2, 'gasoline')).toBe('Golf');
  });

  it('reads "Touring" as a trim and keeps EPA utility classes over a "Wagon" name', () => {
    const cases: Array<[Partial<Car> & Pick<CarSpecs, 'make' | 'model'>, string]> = [
      [{ make: 'Honda', model: 'Accord Sport/Touring' }, 'sedan'],
      [{ make: 'Honda', model: 'Pilot AWD Touring/Elite/Black', bodyStyle: 'suv' }, 'suv'],
      [{ make: 'Porsche', model: '911 GT3 Touring', bodyStyle: 'coupe' }, 'coupe'],
      [{ make: 'Ford', model: 'E150 Club Wagon', bodyStyle: 'van' }, 'van'],
      [{ make: 'Ford', model: 'Windstar FWD Wagon', bodyStyle: 'minivan' }, 'minivan'],
      [{ make: 'Toyota', model: 'Land Cruiser Wagon 4WD', bodyStyle: 'suv' }, 'suv'],
      [{ make: 'Volkswagen', model: 'Jetta SportWagen' }, 'wagon'],
      [{ make: 'Mercedes-Benz', model: 'E350 Wagon' }, 'wagon'],
    ];
    for (const [car, expected] of cases) {
      expect(inferBodyStyle(minimalCar(car)), car.model).toBe(expected);
    }
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

  it('reads a sedan by its name, not the slugs that repeat its base name', () => {
    // The id and trim are slugs ("ioniq-6", "yaris-manual-6-spd"): matched
    // against them, 34 Ioniq 6, Mirage G4 and Yaris iA sedans read as hatchbacks.
    const slugged = (make: string, model: string, id: string, trim?: string) =>
      inferBodyStyle(minimalCar({ make, model, id, trim }), model);
    expect(
      slugged('Hyundai', 'Ioniq 6 Long Range AWD', 'hyundai-ioniq-6-long-range-awd-2024'),
    ).toBe('sedan');
    expect(slugged('Mitsubishi', 'Mirage G4', 'mitsubishi-mirage-g4-2019', 'mirage-cvt')).toBe(
      'sedan',
    );
    expect(slugged('Toyota', 'Yaris iA', 'toyota-yaris-ia-2017', 'yaris-manual-6-spd')).toBe(
      'sedan',
    );
    // Their hatchback siblings, and the liftbacks, stay hatchbacks.
    expect(slugged('Hyundai', 'Ioniq Blue', 'hyundai-ioniq-blue-2019')).toBe('hatchback');
    expect(slugged('Mitsubishi', 'Mirage', 'mitsubishi-mirage-2019', 'mirage-cvt')).toBe(
      'hatchback',
    );
    expect(slugged('Toyota', 'Prius Prime', 'toyota-prius-prime-2021')).toBe('hatchback');
    expect(slugged('BMW', 'i3s', 'bmw-i3s-2019')).toBe('hatchback');
  });

  it('reads the retro Thunderbird as the convertible it is', () => {
    const tbird = (year: number) =>
      inferBodyStyle(minimalCar({ make: 'Ford', model: 'Thunderbird', year, bodyStyle: 'coupe' }));
    expect(tbird(2004)).toBe('convertible');
    // The 1990s Thunderbird is a coupe.
    expect(tbird(1996)).toBe('coupe');
  });

  it('reads roadsters, four-door coupes and coupe-SUVs by what they are', () => {
    const body = (make: string, model: string, bodyStyle: Car['bodyStyle'], vClass?: string) =>
      inferBodyStyle(
        minimalCar({
          make,
          model,
          bodyStyle,
          epa: vClass ? ({ vClass } as Car['epa']) : undefined,
        }),
        model,
      );
    // Roadsters in EPA's two-seater class arrived as coupes.
    expect(body('Porsche', '718 Boxster', 'coupe', 'Two Seaters')).toBe('convertible');
    expect(body('Mazda', 'MX-5', 'coupe', 'Two Seaters')).toBe('convertible');
    expect(body('Honda', 'S2000', 'coupe', 'Two Seaters')).toBe('convertible');
    expect(body('BMW', 'Z4 sDrive30i', 'coupe', 'Two Seaters')).toBe('convertible');
    expect(body('Mercedes-Benz', 'SLK350', 'coupe', 'Two Seaters')).toBe('convertible');
    expect(body('BMW', 'Z4 Coupe', 'coupe', 'Two Seaters')).toBe('coupe');
    expect(body('Volkswagen', 'Eos', 'sedan', 'Subcompact Cars')).toBe('convertible');
    // Four doors, whatever the name says.
    expect(body('BMW', '430i Gran Coupe', 'coupe', 'Compact Cars')).toBe('sedan');
    expect(body('BMW', 'M8 Competition Gran Coupe', 'coupe', 'Midsize Cars')).toBe('sedan');
    // SUVs with a car's name.
    expect(body('Mercedes-Benz', 'GLC300 4matic Coupe', 'suv')).toBe('suv');
    expect(body('Porsche', 'Cayenne Turbo Coupe', 'suv')).toBe('suv');
    expect(body('Chevrolet', 'Tracker 4WD Convertible', 'suv')).toBe('suv');
    // The PT Cruiser is a car EPA files as a truck.
    expect(body('Chrysler', 'PT Cruiser Convertible', 'suv')).toBe('convertible');
    // Crossovers, hatchbacks and wagons EPA filed as something else.
    expect(body('Mazda', 'CX-3 2WD', 'sedan', 'Compact Cars')).toBe('suv');
    expect(body('Infiniti', 'EX35', 'wagon', 'Small Station Wagons')).toBe('suv');
    expect(body('Kia', 'Forte 5', 'sedan', 'Large Cars')).toBe('hatchback');
    expect(body('Volvo', 'C30 FWD', 'sedan', 'Compact Cars')).toBe('hatchback');
    expect(body('Dodge', 'Magnum AWD', 'suv')).toBe('wagon');
    expect(body('Hyundai', 'Elantra N', 'sedan', 'Midsize Cars')).toBe('sedan');
    expect(body('Ford', 'Mustang Mach 1', 'sedan', 'Subcompact Cars')).toBe('coupe');
  });

  it('reads "Si" as a word, not the "SIL" trim code', () => {
    // The lean-burn Civic VX and the 2003-05 Civic Hybrid read as a 201 hp Civic Si.
    const model = (m: string, trim: string, year: number) =>
      canonicalizeDisplayModel(minimalCar({ make: 'Honda', model: m, trim, year }));
    expect(model('Civic HB VX', 'civic-sil-manual-5-spd', 1995)).not.toBe('Civic Si');
    expect(model('Civic Hybrid', 'civic-sil-ems-manual-5-spd', 2004)).not.toBe('Civic Si');
    expect(model('Civic Si', 'civic-si-manual-6-spd', 2019)).toBe('Civic Si');
  });

  it('files grand tourers and minicompact two-doors by their doors, not their size class', () => {
    // 304 Porsche 911s, every Evora and every DB11 read as sedans.
    const body = (make: string, model: string, vClass = 'Subcompact Cars') =>
      inferBodyStyle(minimalCar({ make, model, epa: { vClass } as Car['epa'] }), model);
    expect(body('Porsche', '911 Carrera', 'Minicompact Cars')).toBe('coupe');
    expect(body('Aston Martin', 'DB11 V12', 'Minicompact Cars')).toBe('coupe');
    expect(body('Nissan', 'GT-R')).toBe('coupe');
    expect(body('Bentley', 'Continental GT')).toBe('coupe');
    expect(body('Rolls-Royce', 'Wraith', 'Large Cars')).toBe('coupe');
    expect(body('Bentley', 'Continental GTC')).toBe('convertible');
    expect(body('Ferrari', 'California T', 'Minicompact Cars')).toBe('convertible');
    expect(body('Aston Martin', 'DB9 Volante', 'Minicompact Cars')).toBe('convertible');
    expect(body('Mercedes-Benz', 'AMG SL63')).toBe('convertible');
    // A Civic Type R is a hatchback; Jaguar's S-Type R is not.
    expect(body('Honda', 'Civic Type R')).toBe('hatchback');
    expect(body('Jaguar', 'S-Type R', 'Midsize Cars')).toBe('sedan');
    // MINI builds no sedans.
    expect(body('MINI', 'Cooper Countryman', 'Compact Cars')).toBe('suv');
    expect(body('MINI', 'Cooper S Clubman', 'Midsize Cars')).toBe('wagon');
    expect(body('MINI', 'Cooper (5-doors)')).toBe('hatchback');
    // Crossovers and small hatchbacks EPA files as wagons or sedans.
    expect(
      inferBodyStyle(minimalCar({ make: 'Honda', model: 'CR-V FWD', bodyStyle: 'wagon' })),
    ).toBe('suv');
    expect(
      inferBodyStyle(minimalCar({ make: 'Rolls-Royce', model: 'Cullinan', bodyStyle: 'wagon' })),
    ).toBe('suv');
    expect(inferBodyStyle(minimalCar({ make: 'BMW', model: 'X1 xDrive28i' }))).toBe('suv');
    expect(body('Chevrolet', 'Spark')).toBe('hatchback');
    expect(
      inferBodyStyle(minimalCar({ make: 'Subaru', model: 'Impreza 5-Door', bodyStyle: 'wagon' })),
    ).toBe('hatchback');
    expect(body('Hyundai', 'Ioniq 6')).toBe('sedan');
    expect(body('Mitsubishi', 'Mirage G4')).toBe('sedan');
    expect(
      inferBodyStyle(minimalCar({ make: 'Tesla', model: 'Model Y AWD', bodyStyle: 'suv' })),
    ).toBe('suv');
    // City cars in the same class are hatchbacks; four-doors stay sedans.
    expect(body('Fiat', '500', 'Minicompact Cars')).toBe('hatchback');
    expect(body('Bentley', 'Flying Spur', 'Large Cars')).toBe('sedan');
    expect(body('Aston Martin', 'Rapide S', 'Subcompact Cars')).toBe('sedan');
    // The 1995 "Spirit III/Spur III/Dawn" is a saloon, not the Dawn convertible.
    expect(body('Rolls-Royce', 'Spirit III/Spur III/Dawn', 'Large Cars')).toBe('sedan');
  });
});

describe('shopping segments', () => {
  it('reads a derived trim: a Charger R/T is a sport sedan, a Challenger R/T stays muscle', () => {
    const v8 = { fuelType: 'gasoline' as const, cylinders: 8, displacement: 5.7 };
    const charger = minimalCar({ make: 'Dodge', model: 'Charger', engine: v8, variant: 'R/T' });
    expect(classifyShoppingSegment(charger, 'Charger', 'sedan')).toBe('sport-sedan');
    const challenger = minimalCar({
      make: 'Dodge',
      model: 'Challenger',
      engine: v8,
      variant: 'R/T',
      bodyStyle: 'coupe',
    });
    expect(classifyShoppingSegment(challenger, 'Challenger', 'coupe')).toBe('muscle');
    // "GT" in a name alone does not make a sport sedan.
    const elantraGt = minimalCar({ make: 'Hyundai', model: 'Elantra GT', bodyStyle: 'hatchback' });
    expect(classifyShoppingSegment(elantraGt, 'Elantra GT', 'hatchback')).not.toBe('sport-sedan');
    // The 2019+ Type R is a "Civic 5Dr" to EPA.
    const typeR = minimalCar({ make: 'Honda', model: 'Civic 5Dr', variant: 'Type R' });
    expect(classifyShoppingSegment(typeR, 'Civic', 'hatchback')).toBe('hot-hatch');
  });

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

  it('calls supercars supercars, not muscle cars', () => {
    const seg = (make: string, model: string, bodyStyle: Car['bodyStyle'] = 'coupe') =>
      classifyShoppingSegment(
        minimalCar({ make, model, bodyStyle, engine: { fuelType: 'gasoline', horsepower: 600 } }),
        model,
        bodyStyle,
      );
    expect(seg('Lamborghini', 'Huracan')).toBe('supercar');
    expect(seg('Ferrari', '488 Spider', 'convertible')).toBe('supercar');
    expect(seg('Audi', 'R8')).toBe('supercar');
    expect(seg('Ford', 'GT')).toBe('supercar');
    expect(seg('Ford', 'GT500')).toBe('muscle');
    // "Type R" is a Honda hot hatch, not Jaguar's F-Type R.
    expect(seg('Jaguar', 'F-Type R Coupe')).toBe('sports-car');
    expect(seg('Lamborghini', 'Urus', 'suv')).toBe('utility');
    // An "AMG" badge makes a sedan a sport sedan, not a two-door.
    expect(seg('Mercedes-Benz', 'AMG GT S')).toBe('sports-car');
  });

  it('keeps "muscle car" for American V8 pony cars', () => {
    const seg = (make: string, model: string, horsepower: number, displacement: number) =>
      classifyShoppingSegment(
        minimalCar({
          make,
          model,
          bodyStyle: 'coupe',
          engine: { fuelType: 'gasoline', horsepower, displacement },
        }),
        model,
        'coupe',
      );
    expect(seg('Ford', 'Mustang', 460, 5)).toBe('muscle');
    expect(seg('Chevrolet', 'Camaro', 455, 6.2)).toBe('muscle');
    // A 2008 Mustang GT: a 4.6-litre V8 at 300 hp.
    expect(seg('Ford', 'Mustang', 300, 4.6)).toBe('muscle');
    expect(seg('Ford', 'Mustang', 310, 2.3)).toBe('sports-car');
    // By horsepower alone these were muscle cars.
    expect(seg('Porsche', '911 Carrera S', 443, 3)).toBe('sports-car');
    expect(seg('Chevrolet', 'Corvette', 495, 6.2)).toBe('sports-car');
    expect(seg('Nissan', 'GT-R', 565, 3.8)).toBe('sports-car');
    expect(seg('BMW', 'M4 Coupe', 473, 3)).toBe('sports-car');
  });

  it('tells sports cars from luxury coupes and family coupes', () => {
    const seg = (make: string, model: string, horsepower: number, displacement = 2) =>
      classifyShoppingSegment(
        minimalCar({
          make,
          model,
          bodyStyle: 'coupe',
          engine: { fuelType: 'gasoline', horsepower, displacement },
        }),
        model,
        'coupe',
      );
    // A Miata is a sports car at 155 hp; a smart fortwo was one at 70.
    expect(seg('Mazda', 'MX-5', 155)).toBe('sports-car');
    expect(seg('smart', 'fortwo coupe', 70, 1)).toBe('mainstream');
    expect(seg('Honda', 'Accord Coupe', 278, 3.5)).toBe('mainstream');
    expect(seg('BMW', '430i Coupe', 248)).toBe('luxury');
    expect(seg('Mercedes-Benz', 'E350 Coupe', 302, 3.5)).toBe('luxury');
    expect(seg('Lexus', 'LC 500', 471, 5)).toBe('sports-car');
    expect(seg('Mercedes-Benz', 'CL600', 510, 5.5)).toBe('luxury');
  });

  it('does not call a V6 family sedan a sport sedan', () => {
    const seg = (make: string, model: string, horsepower: number, displacement: number) =>
      classifyShoppingSegment(
        minimalCar({ make, model, engine: { fuelType: 'gasoline', horsepower, displacement } }),
        model,
        'sedan',
      );
    // 490 V6 Camrys, Accords, Impalas and Chargers were "sport sedans".
    expect(seg('Toyota', 'Camry', 301, 3.5)).toBe('mainstream');
    expect(seg('Chevrolet', 'Impala', 305, 3.6)).toBe('mainstream');
    expect(seg('Lexus', 'ES 350', 302, 3.5)).toBe('luxury');
    // A turbo, or real output per litre, still makes one.
    const wrx = minimalCar({
      make: 'Subaru',
      model: 'Legacy',
      engine: {
        fuelType: 'gasoline',
        horsepower: 260,
        displacement: 2.4,
        aspiration: 'turbocharged',
      },
    });
    expect(classifyShoppingSegment(wrx, 'Legacy', 'sedan')).toBe('sport-sedan');
    expect(seg('Lexus', 'IS 350', 311, 3.5)).toBe('sport-sedan');
    // A C300 or an A4 is a luxury car, whatever it is worth today.
    expect(seg('Mercedes-Benz', 'C300', 241, 2)).toBe('luxury');
  });

  it('leaves badge-named coupes to the sports-car / muscle split', () => {
    const seg = segmentOf(named('BMW', 'M4 Coupe', 2019), '2019 BMW M4 Coupe');
    expect(['sports-car', 'muscle']).toContain(seg);
  });
});
