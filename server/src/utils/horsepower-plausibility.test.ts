import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  dropImplausibleOutput,
  dropInductionMismatchedHorsepower,
  dropRatingsSharedAcrossEngines,
  dropYearOverYearOutliers,
  fillHorsepowerFromSiblings,
  isPlausibleRatedHorsepower,
} from './horsepower-plausibility.js';

describe('isPlausibleRatedHorsepower', () => {
  it.each([
    // Placeholders and mis-keyed EPA Test Car List rows that reached the site.
    [999, 2.5, '2020 Audi TT RS'],
    [999, 4.0, '2020 Audi S8'],
    [1, 1.5, '2026 Ford Bronco Sport'],
    [1, 2.0, '2019 Audi A3 quattro'],
    [11, 2.0, '2021 Mercedes-Benz C300'],
    [14, 4.0, '2021 Mercedes-AMG G63'],
    [35, 4.8, '2010 Porsche Cayenne S'],
    [38, 0.6, 'BMW i3 REx generator'],
  ])('rejects %i hp from %f L (%s)', (hp, litres) => {
    expect(isPlausibleRatedHorsepower(hp, litres)).toBe(false);
  });

  it.each([
    [1500, 8.0, 'Bugatti Chiron'],
    [1025, 6.2, 'Dodge Challenger SRT Demon 170'],
    [1250, 5.5, 'Corvette ZR1X (hybrid)'],
    [416, 2.0, 'Mercedes-AMG CLA45 S'],
    [70, 1.0, 'Smart fortwo'],
    [180, 1.5, 'Ford Bronco Sport'],
  ])('accepts %i hp from %f L (%s)', (hp, litres) => {
    expect(isPlausibleRatedHorsepower(hp, litres)).toBe(true);
  });

  it("allows a hybrid's system output more per litre than an engine alone", () => {
    expect(isPlausibleRatedHorsepower(536, 1.5, 'plug-in hybrid')).toBe(true);
    expect(isPlausibleRatedHorsepower(671, 2.0, 'plug-in hybrid')).toBe(true);
    expect(isPlausibleRatedHorsepower(671, 2.0, 'gasoline')).toBe(false);
    expect(isPlausibleRatedHorsepower(999, 2.0, 'hybrid')).toBe(false);
    expect(isPlausibleRatedHorsepower(1200, 1.5, 'hybrid')).toBe(false);
  });

  it('judges by the absolute floor when displacement is unknown', () => {
    expect(isPlausibleRatedHorsepower(150, undefined)).toBe(true);
    expect(isPlausibleRatedHorsepower(1, undefined)).toBe(false);
  });
});

describe('dropInductionMismatchedHorsepower', () => {
  const car = (id: string, hp: number, aspiration?: 'turbocharged', displacement = 2.5) =>
    ({
      id,
      make: 'Subaru',
      model: 'Legacy AWD',
      year: 2005,
      provenance: { 'engine.horsepower': 'curated' },
      engine: { fuelType: 'gasoline', displacement, horsepower: hp, aspiration },
      fuelEconomy: { combined: 22 },
      transmission: { type: 'manual' },
      driveType: 'AWD',
      bodyStyle: 'sedan',
    }) as Car;

  it("drops a turbo car's rating when it merely repeats the non-turbo sibling's", () => {
    const { cars, dropped } = dropInductionMismatchedHorsepower([
      car('2.5i', 168),
      car('gt', 168, 'turbocharged'),
    ]);
    expect(dropped).toBe(1);
    expect(cars[0].engine.horsepower).toBe(168);
    expect(cars[1].engine.horsepower).toBeUndefined();
    expect(cars[1].provenance['engine.horsepower']).toBeUndefined();
  });

  it('keeps a turbo rating above the non-turbo one, or with no sibling to compare', () => {
    const { cars, dropped } = dropInductionMismatchedHorsepower([
      car('2.5i', 168),
      car('gt', 250, 'turbocharged'),
      car('2.0t', 243, 'turbocharged', 2),
    ]);
    expect(dropped).toBe(0);
    expect(cars.map((c) => c.engine.horsepower)).toEqual([168, 250, 243]);
  });
});

describe('dropRatingsSharedAcrossEngines', () => {
  const f150 = (id: string, model: string, displacement: number, hp: number) =>
    ({
      id,
      make: 'Ford',
      model,
      year: 2013,
      provenance: { 'engine.horsepower': 'curated' },
      engine: { fuelType: 'gasoline', displacement, cylinders: 8, horsepower: hp },
      fuelEconomy: { combined: 16 },
      transmission: { type: 'automatic' },
      driveType: 'RWD',
      bodyStyle: 'truck',
    }) as Car;

  it('drops a rating two engines of one model and year share', () => {
    // The 5.0 took the 6.2's 415 hp; which is real cannot be told from here.
    const { cars, dropped } = dropRatingsSharedAcrossEngines([
      f150('5.0-2wd', 'F150 Pickup 2WD', 5, 415),
      f150('6.2-4wd', 'F150 Pickup 4WD', 6.2, 415),
      f150('5.0-4wd', 'F150 Pickup 4WD', 5, 415),
    ]);
    expect(dropped).toBe(3);
    expect(cars.every((c) => c.engine.horsepower === undefined)).toBe(true);
  });

  it('compares engines with different cylinder counts too', () => {
    // The 2012 Journey's 2.4 four took the 3.6 V6's 283 hp.
    const journey = (id: string, displacement: number, cylinders: number) =>
      ({
        ...f150(id, 'Journey FWD', displacement, 283),
        make: 'Dodge',
        year: 2012,
        engine: { fuelType: 'gasoline', displacement, cylinders, horsepower: 283 },
      }) as Car;
    const { dropped } = dropRatingsSharedAcrossEngines([
      journey('2.4', 2.4, 4),
      journey('3.6', 3.6, 6),
    ]);
    expect(dropped).toBe(2);
  });

  it('keeps distinct ratings, and one engine rated the same across drive variants', () => {
    const { dropped } = dropRatingsSharedAcrossEngines([
      f150('5.0-2wd', 'F150 Pickup 2WD', 5, 360),
      f150('5.0-4wd', 'F150 Pickup 4WD', 5, 360),
      f150('6.2-4wd', 'F150 Pickup 4WD', 6.2, 411),
    ]);
    expect(dropped).toBe(0);
  });
});

describe('dropYearOverYearOutliers', () => {
  const car = (model: string, year: number, displacement: number, hp: number, make = 'Nissan') =>
    ({
      id: `${model}-${year}-${hp}`,
      make,
      model,
      year,
      provenance: { 'engine.horsepower': 'curated' },
      engine: { fuelType: 'gasoline', displacement, cylinders: 8, horsepower: hp },
      fuelEconomy: { combined: 15 },
      transmission: { type: 'automatic' },
      driveType: 'RWD',
      bodyStyle: 'truck',
    }) as Car;
  const kept = (cars: Car[]) =>
    dropYearOverYearOutliers(cars).cars.map((c) => c.engine.horsepower ?? null);

  it('drops a rating out of line with both adjacent years', () => {
    // 2008 Titan: 417 hp between 305 and 317.
    expect(
      kept([
        car('Titan 2WD', 2007, 5.6, 305),
        car('Titan 4WD', 2008, 5.6, 417),
        car('Titan 2WD', 2009, 5.6, 317),
      ]),
    ).toEqual([305, null, 317]);
  });

  it('drops the less typical of two years far apart', () => {
    // The 2010 Expedition 5.4 carries the supercharged GT500's 540 hp.
    expect(
      kept([
        car('Expedition 2WD FFV', 2009, 5.4, 310, 'Ford'),
        car('Expedition 2WD FFV', 2010, 5.4, 540, 'Ford'),
      ]),
    ).toEqual([310, null]);
  });

  it('keeps a genuine change of engine output and ratings that agree with a neighbour', () => {
    // The EuroVan's VR6 went from 140 to 201 hp in 2001.
    expect(
      kept([
        car('Eurovan', 2000, 2.8, 140, 'Volkswagen'),
        car('Eurovan', 2001, 2.8, 201, 'Volkswagen'),
        car('Eurovan', 2002, 2.8, 201, 'Volkswagen'),
      ]),
    ).toEqual([140, 201, 201]);
    // A plainly typical rating between two borrowed ones stays.
    expect(
      kept([
        car('Avenger', 2012, 2.4, 283, 'Dodge'),
        car('Avenger', 2013, 2.4, 178, 'Dodge'),
        car('Avenger', 2014, 2.4, 283, 'Dodge'),
      ])[1],
    ).toBe(178);
  });
});

describe('fillHorsepowerFromSiblings', () => {
  const car = (model: string, year: number, hp?: number, displacement = 3.5) =>
    ({
      id: `${model}-${year}-${hp ?? 'none'}`,
      make: 'Toyota',
      model,
      year,
      provenance: hp == null ? {} : { 'engine.horsepower': 'curated' },
      engine: { fuelType: 'gasoline', displacement, cylinders: 6, horsepower: hp },
      fuelEconomy: { combined: 22 },
      transmission: { type: 'automatic' },
      driveType: 'FWD',
      bodyStyle: 'suv',
    }) as Car;
  const hpOf = (cars: Car[]) =>
    fillHorsepowerFromSiblings(cars).cars.map((c) => [
      c.engine.horsepower ?? null,
      c.provenance['engine.horsepower'] ?? null,
    ]);

  it('takes the same engine of the same model, same year first, marked as an estimate', () => {
    expect(
      hpOf([
        car('Highlander 2WD', 2019, 295),
        car('Highlander AWD', 2019),
        car('Highlander AWD', 2020),
      ]),
    ).toEqual([
      [295, 'curated'],
      [295, 'estimated'],
      [295, 'estimated'],
    ]);
  });

  it('leaves a gap when the neighbours disagree or the engine differs', () => {
    expect(
      hpOf([
        car('Highlander 2WD', 2019, 270),
        car('Highlander AWD', 2020),
        car('Highlander 2WD', 2021, 310),
        car('Highlander AWD', 2021, undefined, 2.7),
      ]),
    ).toEqual([
      [270, 'curated'],
      [null, null],
      [310, 'curated'],
      [null, null],
    ]);
  });
});

describe('dropImplausibleOutput', () => {
  const car = (
    make: string,
    model: string,
    year: number,
    displacement: number,
    horsepower: number,
    extra: Partial<Car> & { aspiration?: 'turbocharged' | 'supercharged' } = {},
  ) =>
    ({
      id: `${make}-${model}-${year}`,
      make,
      model,
      year,
      provenance: { 'engine.horsepower': 'curated' },
      engine: { fuelType: 'gasoline', displacement, horsepower, aspiration: extra.aspiration },
      fuelEconomy: { combined: 20 },
      transmission: { type: 'automatic' },
      driveType: 'AWD',
      bodyStyle: 'sedan',
      shoppingSegment: 'mainstream',
      ...extra,
    }) as Car;
  const kept = (c: Car) => dropImplausibleOutput([c]).cars[0].engine.horsepower != null;

  it('drops ratings no engine of that size and induction makes', () => {
    // A 5.0 V8 F-150 at a Raptor R's 650 hp; a Flex's V6 at the EcoBoost's 355.
    expect(kept(car('Ford', 'F150 Pickup 4WD', 2021, 5, 650, { shoppingSegment: 'truck' }))).toBe(
      false,
    );
    expect(kept(car('Ford', 'Flex AWD', 2011, 3.5, 355, { shoppingSegment: 'utility' }))).toBe(
      false,
    );
    // A 2.0 turbo at 112 hp; a supercharged Shelby at the GT's 300.
    expect(kept(car('Lexus', 'NX 300', 2019, 2, 112, { aspiration: 'turbocharged' }))).toBe(false);
    expect(
      kept(
        car('Ford', 'Mustang', 2008, 5.4, 300, {
          aspiration: 'supercharged',
          shoppingSegment: 'muscle',
        }),
      ),
    ).toBe(false);
  });

  it('keeps sports cars, luxury engines, performance badges and old turbos', () => {
    expect(kept(car('Honda', 'S2000', 2004, 2, 240, { shoppingSegment: 'sports-car' }))).toBe(true);
    expect(
      kept(car('Maserati', 'Quattroporte', 2008, 4.2, 399, { shoppingSegment: 'luxury' })),
    ).toBe(true);
    // The 2006–11 Civic Si makes 197 hp from 2.0 litres; EPA sometimes omits a GTI's turbo.
    expect(kept(car('Honda', 'Civic', 2008, 2, 197, { variant: 'Si' }))).toBe(true);
    expect(kept(car('Volkswagen', 'Golf GTI', 2008, 2, 200))).toBe(true);
    expect(kept(car('Toyota', 'Camry', 2020, 2.5, 203))).toBe(true);
    // Boosted engines of the 1980s made little per litre.
    expect(kept(car('Dodge', 'Daytona', 1987, 2.2, 146, { aspiration: 'turbocharged' }))).toBe(
      true,
    );
  });
});
