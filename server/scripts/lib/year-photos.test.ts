import { describe, expect, it } from 'vitest';
import type { Car } from '../../src/types/car.types.js';
import {
  chooseYearPhoto,
  differsAbroad,
  fileCaption,
  makeLines,
  modelKey,
  namedForYear,
  photoMarket,
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
    expect(namedForYear('1995-97 Nissan Sentra.jpg', 1995)).toBe(true);
  });

  it('does not take the date a photo was taken for a model year', () => {
    expect(namedForYear('2023-04 BMW i7 xDrive60 front.jpg', 2023)).toBe(false);
    expect(namedForYear('2010-09-09 213-A 1994 Chrysler Town and Country.jpg', 2010)).toBe(false);
    expect(namedForYear('2012 10 21 Filming - Mercedes-Benz E350 Convertible.jpg', 2012)).toBe(
      false,
    );
    // Two digits that could be a month are taken for one.
    expect(namedForYear('2005-07 Toyota Camry.jpg', 2005)).toBe(false);
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

describe('photoMarket', () => {
  it('goes by where the camera was, where Commons knows', () => {
    const file = '2022 Kia Sportage GT-Line front.jpg';
    expect(photoMarket(file, { lat: 51.5, lon: -0.1 })).toBe('other');
    expect(photoMarket(file, { lat: 40.7, lon: -74 })).toBe('na');
    expect(photoMarket(file, { lat: 45.5, lon: -73.6 })).toBe('na');
  });

  it('else by what the name and categories say', () => {
    expect(photoMarket('2022 Kia Sportage GT-Line ISG HEV Automatic 1.6 Front.jpg')).toBe('other');
    expect(
      photoMarket('2024 BMW M340i xDrive - 2998cc 3.0 (374PS) Petrol - Brooklyn Grey, Front.jpg'),
    ).toBe('other');
    expect(photoMarket('2016 BMW M3 (F80) sedan (2017-11-18) 01.jpg')).toBe('other');
    expect(photoMarket('2015 Tesla Model S (AB11 BOX).jpg')).toBe('other');
    expect(photoMarket('2023 Kia Sportage SX Prestige, front left, 03-26-2023.jpg')).toBe('na');
    expect(photoMarket('2018 Ford F-150 XLT front 5.19.18.jpg')).toBe('na');
    expect(
      photoMarket('2021 Kia Sportage LX AWD in Snow White Pearl, front left, 2025-07-06.jpg'),
    ).toBe('na');
    expect(photoMarket('2025 Lexus NX au salon international de l’auto de Montréal.jpg')).toBe(
      'na',
    );
    expect(photoMarket('2022 BMW M3.jpg')).toBe('unknown');
    expect(photoMarket('2022 BMW M3.jpg', { categories: ['BMW M3 (G80) in Germany'] })).toBe(
      'other',
    );
    expect(photoMarket('2022 BMW M3.jpg', { categories: ['Cars in California'] })).toBe('na');
  });
});

describe('scoreYearPhoto in North America', () => {
  const sportage = car(2022, 'Kia', 'Sportage AWD', 'suv');

  it('takes no photo of another market’s car', () => {
    expect(score('2022 Kia Sportage GT-Line ISG HEV Automatic 1.6 Front.jpg', sportage)).toBe(
      undefined,
    );
    expect(score('2022 Kia Sportage LX front.jpg', sportage)).toBeGreaterThan(0);
  });

  it('takes only North America’s in a year the model changed generation', () => {
    const changing = { ...sportage, changeover: true };
    expect(score('2022 Kia Sportage LX front.jpg', changing)).toBeUndefined();
    expect(
      score('2022 Kia Sportage LX in Snow White Pearl, front left, 2025-07-06.jpg', changing),
    ).toBeGreaterThan(0);
  });

  it('takes only North America’s of a name that is another car abroad', () => {
    const fusion = car(2009, 'Ford', 'Fusion FWD');
    expect(differsAbroad(fusion)).toBe(true);
    expect(differsAbroad(car(2015, 'Ford', 'Fusion FWD'))).toBe(false);
    expect(score('2009 Ford Fusion front.jpg', fusion)).toBeUndefined();
    expect(score('2009 Ford Fusion SEL, front 6.6.20.jpg', fusion)).toBeGreaterThan(0);
  });

  it('prefers a North American photo to one from nowhere in particular', () => {
    expect(
      chooseYearPhoto(
        ['2022 Kia Sportage LX front.jpg', '2022 Kia Sportage LX, front left, 03-26-2022.jpg'],
        sportage,
        context,
      ),
    ).toBe('2022 Kia Sportage LX, front left, 03-26-2022.jpg');
  });
});

describe('scoreYearPhoto among the make’s models', () => {
  const cars = [
    car(2018, 'Land Rover', 'Range Rover', 'suv'),
    car(2018, 'Land Rover', 'Range Rover Velar', 'suv'),
    car(2018, 'Land Rover', 'Range Rover Sport', 'suv'),
    car(2018, 'Jeep', 'Cherokee 4WD', 'suv'),
    car(2018, 'Jeep', 'Grand Cherokee 4WD', 'suv'),
    car(2005, 'Porsche', 'Turbo 4 911 Cab', 'convertible'),
    car(2005, 'Porsche', 'Cayenne Turbo', 'suv'),
    car(2004, 'Ford', 'Ranger Pickup 2WD', 'truck'),
    car(2004, 'Ford', 'Edge FWD', 'suv'),
    car(2021, 'Ferrari', 'F8 Tributo', 'coupe'),
    car(2021, 'Ferrari', 'Ferrari F50', 'coupe'),
  ];
  const lines = { ...context, lines: makeLines(cars, context.separateModels) };
  const fit = (file: string, c: ReturnType<typeof car>) => scoreYearPhoto(file, c, lines);

  it('takes no photo of another line of the model', () => {
    expect(fit('2018 Land Rover Range Rover Velar front.jpg', cars[0])).toBeUndefined();
    expect(fit('2018 Land Rover Range Rover Velar front.jpg', cars[1])).toBeGreaterThan(0);
    expect(fit('2018 Range Rover Sport HSE front.jpg', cars[0])).toBeUndefined();
    expect(fit('2018 Land Rover Range Rover Vogue front.jpg', cars[2])).toBeUndefined();
  });

  it('takes no photo of another model named before it', () => {
    expect(fit('2018 Jeep Grand Cherokee Limited front.jpg', cars[3])).toBeUndefined();
    expect(fit('2005 Porsche Cayenne Turbo front.jpg', cars[5])).toBeUndefined();
    expect(fit('2005 Porsche 911 Turbo Cabriolet front.jpg', cars[5])).toBeGreaterThan(0);
    // After it, another model's name is a trim: the Ranger Edge.
    expect(fit('2004 Ford Ranger Edge, front left, 06-17-2022.jpg', cars[7])).toBeGreaterThan(0);
    // The make is not a model: "Ferrari F50" is named with it.
    expect(fit('2021 Ferrari F8 Tributo.jpg', cars[9])).toBeDefined();
  });

  it('takes no heavy-duty truck for a light-duty one, nor a crash test', () => {
    const sierra = car(2024, 'GMC', 'Sierra 2WD', 'truck');
    expect(score('2024 GMC Sierra 2500HD Denali front view.jpg', sierra)).toBeUndefined();
    expect(
      score('2014 MINI Cooper Hardtop -- NHTSA test 8786 - front.jpg', car(2014, 'MINI', 'Cooper')),
    ).toBe(undefined);
    expect(
      score('2013 Lincoln MKZ & 1962 Lincoln Continental.jpg', car(2013, 'Lincoln', 'MKZ FWD')),
    ).toBe(undefined);
  });
});

describe('scoreYearPhoto among versions', () => {
  it('takes a variant’s photo only for that variant, and the variant only its own', () => {
    const trackhawk = car(2021, 'Jeep', 'Grand Cherokee Trackhawk 4WD', 'suv');
    expect(score('2021 Jeep Grand Cherokee Laredo, front 7.2.22.jpg', trackhawk)).toBeUndefined();
    expect(score('2021 Jeep Grand Cherokee Trackhawk, front 7.2.22.jpg', trackhawk)).toBeDefined();
    const cayman = car(2021, 'Porsche', '718 Cayman', 'coupe');
    expect(score('2021 Porsche 718 Cayman GT4 Red 982.jpg', cayman)).toBeUndefined();
  });

  it('keeps a 911’s Turbo, Carrera 4 and Targa apart from the others', () => {
    const carrera = car(2016, 'Porsche', '911 Carrera GTS Cabriolet', 'convertible');
    expect(score('2016 Porsche 911 Turbo Cabriolet.jpg', carrera)).toBeUndefined();
    expect(score('2016 Porsche 911 Carrera 4 GTS Cabriolet.jpg', carrera)).toBeUndefined();
    const targa = car(2011, 'Porsche', '911 Carrera S Targa', 'coupe');
    expect(score('2011 Porsche 911 Carrera S coupe, front right, 06-07-2025.jpg', targa)).toBe(
      undefined,
    );
  });

  it('keeps doors apart', () => {
    const twoDoor = car(2021, 'MINI', 'Cooper S Hardtop 2 door');
    expect(score('2021 Mini Cooper S 5-door orange front view.jpg', twoDoor)).toBeUndefined();
    const civic = car(2019, 'Honda', 'Civic 5Dr');
    expect(score('2019 Honda Civic LX sedan, front left.jpg', civic)).toBeUndefined();
  });

  it('takes an electric version’s photo only for it, where the model also burns fuel', () => {
    const cars = [car(2016, 'Kia', 'Soul', 'wagon'), car(2016, 'Kia', 'Soul Electric', 'wagon')];
    const withLines = { ...context, lines: makeLines(cars, context.separateModels) };
    expect(
      scoreYearPhoto('2016 Kia Soul EX Energy Edition, front right.jpg', cars[1], withLines),
    ).toBeUndefined();
    expect(scoreYearPhoto('2016 Kia Soul EV, front right.jpg', cars[1], withLines)).toBeDefined();
  });

  it('takes no photo of another make’s car wearing this one’s badges', () => {
    const aveo = car(2008, 'Chevrolet', 'Aveo');
    const makes = ['chevrolet', 'suzuki', 'kia'];
    expect(
      scoreYearPhoto(
        '2008 Suzuki Swift+ (with Chevrolet Aveo badges) in Bright Red, Front Left, 01-21-2023.jpg',
        aveo,
        { ...context, makes },
      ),
    ).toBeUndefined();
    expect(
      scoreYearPhoto('2008 Chevrolet Aveo LS sedan, front left.jpg', aveo, { ...context, makes }),
    ).toBeDefined();
  });

  it('takes what a name says the car is over how its photographer names photos', () => {
    expect(photoMarket('2011 Dongfeng-Yueda-Kia Forte R, front 8.4.18.jpg')).toBe('other');
    expect(photoMarket('2001 Toyota RAV4 (US-spec) 01.jpg', { lat: 51.5, lon: -0.1 })).toBe('na');
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
