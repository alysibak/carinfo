import { describe, expect, it } from 'vitest';
import type { Car } from '../../src/types/car.types.js';
import {
  chooseYearPhoto,
  fileCaption,
  modelKey,
  namedForYear,
  scoreYearPhoto,
} from './year-photos.js';

const car = (
  year: number,
  make: string,
  model: string,
  bodyStyle: Car['bodyStyle'] = 'sedan',
): Pick<Car, 'make' | 'model' | 'year' | 'bodyStyle'> => ({ year, make, model, bodyStyle });

const context = { separateModels: new Set(['corollacross', 'camrysolara']) };
const score = (file: string, c: ReturnType<typeof car>) => scoreYearPhoto(file, c, context);

describe('namedForYear', () => {
  it('takes names that start with the model year, alone or as a range', () => {
    expect(namedForYear('2021 BMW M3 Competition Automatic 3.0 Front.jpg', 2021)).toBe(true);
    expect(namedForYear('2019-2021 Honda Civic sedan.jpg', 2019)).toBe(true);
    expect(namedForYear('2021 BMW M3 Competition.jpg', 2027)).toBe(false);
    expect(namedForYear('Honda Civic 2019.jpg', 2019)).toBe(false);
    expect(namedForYear('20190601 Honda Civic.jpg', 2019)).toBe(false);
  });

  it('reads a file name as its caption', () => {
    expect(fileCaption('File:2021_BMW_M3_Competition_Automatic_3.0_Front.jpg')).toBe(
      '2021 BMW M3 Competition Automatic 3.0 Front',
    );
  });
});

describe('modelKey', () => {
  it('is the model’s first word, or two where one is not a model', () => {
    expect(modelKey(car(2027, 'BMW', 'M3 Sedan'), context.separateModels)).toEqual(['M3']);
    expect(modelKey(car(2019, 'Tesla', 'Model 3 Long Range AWD'), context.separateModels)).toEqual([
      'Model',
      '3',
    ]);
    expect(modelKey(car(2023, 'Toyota', 'Corolla Cross AWD'), context.separateModels)).toEqual([
      'Corolla',
      'Cross',
    ]);
    expect(modelKey(car(2019, 'Ford', 'F150 Pickup 2WD'), context.separateModels)).toEqual([
      'F150',
    ]);
  });
});

describe('scoreYearPhoto', () => {
  const m3 = car(2027, 'BMW', 'M3 Sedan');

  it('takes only the car’s own year, make and model', () => {
    expect(score('2027 BMW M3 Competition xDrive, front left.jpg', m3)).toBeGreaterThan(0);
    expect(score('2021 BMW M3 Competition Automatic 3.0 Front.jpg', m3)).toBeUndefined();
    expect(score('2027 BMW M340i xDrive front.jpg', m3)).toBeUndefined();
    expect(score('2027 Audi M3 front.jpg', m3)).toBeUndefined();
  });

  it('takes the outside of the car as sold, not its parts or a race car', () => {
    expect(score('2027 BMW M3 Competition interior.jpg', m3)).toBeUndefined();
    expect(score('2027 BMW M3 rear.jpg', m3)).toBeUndefined();
    expect(score('2027 BMW M3 GT3 race car.jpg', m3)).toBeUndefined();
  });

  it('keeps bodies apart', () => {
    expect(score('2027 BMW M3 Touring front.jpg', m3)).toBeUndefined();
    const convertible = car(2019, 'Mercedes-Benz', 'C300 Convertible', 'convertible');
    expect(score('2019 Mercedes-Benz C 300 Cabriolet front.jpg', convertible)).toBeGreaterThan(0);
    // An unnamed C-Class photo is most likely the sedan.
    expect(score('2019 Mercedes-Benz C 300 front.jpg', convertible)).toBeUndefined();
    const glc = car(2021, 'Mercedes-Benz', 'GLC300 4matic', 'suv');
    expect(score('2021 Mercedes-Benz GLC 300 Coupé front.jpg', glc)).toBeUndefined();
  });

  it('keeps versions that look different apart', () => {
    const f150 = car(2019, 'Ford', 'F150 Pickup 4WD', 'truck');
    expect(score('2019 Ford F-150 XLT SuperCrew, front 5.2.19.jpg', f150)).toBeGreaterThan(0);
    expect(score('2019 Ford F-150 Raptor, front.jpg', f150)).toBeUndefined();
    const raptor = car(2019, 'Ford', 'F150 Raptor 4WD', 'truck');
    expect(score('2019 Ford F-150 Raptor, front.jpg', raptor)).toBeGreaterThan(0);
    const corolla = car(2023, 'Toyota', 'Corolla');
    expect(score('2023 Toyota Corolla Cross XLE front.jpg', corolla)).toBeUndefined();
    expect(score('2023 Toyota Corolla LE sedan front.jpg', corolla)).toBeGreaterThan(0);
  });
});

describe('chooseYearPhoto', () => {
  it('prefers a front view of a North American car with the car’s own trim', () => {
    const sportage = car(2023, 'Kia', 'Sportage Hybrid AWD', 'suv');
    expect(
      chooseYearPhoto(
        [
          '2023 Kia Sportage GT-Line ISG HEV (UK) rear.jpg',
          '2023 Kia Sportage GT-Line (UK) front.jpg',
          '2023 Kia Sportage Hybrid SX-Prestige (US), front left.jpg',
          '2023 Kia Sportage LX side.jpg',
        ],
        sportage,
        context,
      ),
    ).toBe('2023 Kia Sportage Hybrid SX-Prestige (US), front left.jpg');
  });

  it('chooses none rather than a wrong one', () => {
    expect(
      chooseYearPhoto(['2021 BMW M3 Competition Front.jpg'], car(2027, 'BMW', 'M3'), context),
    ).toBeUndefined();
  });
});
