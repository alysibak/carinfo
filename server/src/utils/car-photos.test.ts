import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  type CarPhotoFile,
  changesGeneration,
  epaBaseModel,
  generationFor,
  type PhotoBody,
  type PhotoGeneration,
  photoFor,
  photoQueries,
  queryKey,
  withCarPhotos,
} from './car-photos.js';

const car = (year: number, make: string, model: string, trim?: string): Car => ({
  id: `${make}-${model}-${year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  make,
  model,
  year,
  trim,
  bodyStyle: 'sedan',
  driveType: 'FWD',
  provenance: {},
  engine: { fuelType: 'gasoline' },
  fuelEconomy: {},
  transmission: { type: 'automatic' },
});

const image = (name: string) => ({
  src: `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/${name}/500px-${name}`,
  page: `https://commons.wikimedia.org/wiki/File:${name}`,
  artist: 'Jane Doe',
  license: 'CC BY-SA 4.0',
});

const gen = (
  title: string,
  years: [number, number],
  basis: PhotoGeneration['basis'],
  img: string,
): PhotoGeneration => ({ title, years, basis, image: img });

const file: CarPhotoFile = {
  source: 'test',
  fetched: '2026-10-14',
  queries: {
    [queryKey('Honda', 'civic')]: ['Honda Civic'],
    [queryKey('Mercedes-Benz', 'C Class')]: ['Mercedes-Benz C-Class'],
    [queryKey('BMW', 'M')]: null,
    [queryKey('BMW', 'M3')]: ['BMW M3'],
  },
  articles: {
    'Honda Civic': [
      gen('Honda Civic (tenth generation)', [2016, 2021], 'model_years', 'Civic10.jpg'),
      gen('Honda Civic (eleventh generation)', [2022, 2027], 'model_years', 'Civic11.jpg'),
    ],
    'Mercedes-Benz C-Class': [
      gen('Mercedes-Benz C-Class (W205)', [2014, 2021], 'production', 'W205.jpg'),
      gen('Mercedes-Benz C-Class (W206)', [2021, 2027], 'production', 'W206.jpg'),
    ],
    'BMW M3': [gen('BMW M3 (G80)', [2020, 2027], 'production', 'Hotlinked.jpg')],
  },
  images: {
    'Civic10.jpg': image('Civic10.jpg'),
    'Civic11.jpg': image('Civic11.jpg'),
    'W205.jpg': image('W205.jpg'),
    'W206.jpg': image('W206.jpg'),
    'Hotlinked.jpg': { ...image('x.jpg'), src: 'https://example.com/x.jpg' },
    '2014 BMW 328i xDrive GranTurismo Sport Line.jpg': image('328i_GT.jpg'),
    '2019 Honda Civic EX sedan, front 4.2.19.jpg': image('2019_Honda_Civic.jpg'),
  },
  yearPhotos: {
    'honda-civic-4dr-2019': '2019 Honda Civic EX sedan, front 4.2.19.jpg',
    'honda-civic-4dr-2020': '2019 Honda Civic EX sedan, front 4.2.19.jpg',
    'honda-civic-2dr-2019': '2019 Honda Civic EX sedan, front 4.2.19.jpg',
    'bmw-328i-2014': '2014 BMW 328i xDrive GranTurismo Sport Line.jpg',
    'bmw-m3-2021': 'Hotlinked.jpg',
  },
};

describe('epaBaseModel', () => {
  it('reads EPA’s family name from the trim slug', () => {
    expect(epaBaseModel('c-class-automatic-9-spd')).toEqual(['c', 'class']);
    expect(epaBaseModel('5-series-3mode-clkup-automatic-s6')).toEqual(['5', 'series']);
    expect(epaBaseModel(undefined)).toEqual([]);
    expect(epaBaseModel('no-transmission-here')).toEqual([]);
  });
});

describe('photoQueries', () => {
  it('asks by the model’s first words and EPA’s family name, cased from the car’s own', () => {
    expect(photoQueries(car(2019, 'Mazda', 'CX-5 2WD', 'cx-5-automatic-s6'))).toEqual(['CX-5']);
    expect(photoQueries(car(2019, 'BMW', 'M3 Competition', 'm-manual-6-spd'))).toEqual([
      'M3 Competition',
      'M',
      'M3',
    ]);
    // A two-word name of its own comes first: the Genesis Coupe is not the Genesis.
    expect(photoQueries(car(2013, 'Hyundai', 'Genesis Coupe', 'genesis-manual-6-spd'))).toEqual([
      'Genesis Coupe',
      'Genesis',
    ]);
    expect(photoQueries(car(2019, 'Volkswagen', 'GTI', 'golf-gti-manual-6-spd'))[0]).toBe(
      'Golf GTI',
    );
    expect(
      photoQueries(car(2019, 'Mercedes-Benz', 'C300 4matic', 'c-class-automatic-9-spd'))[0],
    ).toBe('C Class');
    expect(photoQueries(car(2008, 'Mercedes-Benz', 'C230', 'c-class-ems-automatic-5-spd'))[0]).toBe(
      'C Class',
    );
    expect(photoQueries(car(2008, 'Chevrolet', 'Silverado C15 2WD'))).toEqual([
      'Silverado C15',
      'Silverado',
    ]);
  });
});

describe('generationFor', () => {
  const civic = file.articles['Honda Civic'];
  const cClass = file.articles['Mercedes-Benz C-Class'];
  it('takes the generation whose model years hold the year', () => {
    expect(generationFor(civic, 2021)?.title).toContain('tenth');
    expect(generationFor(civic, 2022)?.title).toContain('eleventh');
    expect(generationFor(civic, 2015)).toBeUndefined();
  });

  it('reads production years a year behind', () => {
    // Built 2014-21: the 2021 car is a W205; the 2022, a W206.
    expect(generationFor(cClass, 2021)?.title).toContain('W205');
    expect(generationFor(cClass, 2022)?.title).toContain('W206');
    expect(generationFor(cClass, 2015)?.title).toContain('W205');
  });
});

describe('generationFor, where generations overlap', () => {
  const sClass: PhotoGeneration[] = [
    {
      ...gen('Mercedes-Benz S-Class (W222)', [2013, 2020], 'production', 'W222.jpg'),
      body: '4-door sedan',
    },
    {
      ...gen('Mercedes-Benz S-Class (C217)', [2014, 2020], 'production', 'C217.jpg'),
      body: '2-door coupé, 2-door convertible',
    },
  ];
  it('takes the one of the car’s body', () => {
    const sedan = car(2017, 'Mercedes-Benz', 'S550', 's-class-automatic-9-spd');
    const coupe = { ...car(2017, 'Mercedes-Benz', 'S550 Coupe', 's-class-automatic-9-spd') };
    expect(generationFor(sClass, 2017, sedan)?.title).toContain('W222');
    expect(generationFor(sClass, 2017, coupe)?.title).toContain('C217');
  });

  it('takes the North American version over another market’s', () => {
    const taurus = [
      gen('Ford Taurus (China)', [2015, 2027], 'production', 'TaurusChina.jpg'),
      gen('Ford Taurus (sixth generation)', [2009, 2019], 'production', 'Taurus6.jpg'),
    ];
    expect(generationFor(taurus, 2018)?.title).toBe('Ford Taurus (sixth generation)');
  });
});

describe('changesGeneration', () => {
  it('is the last year of a generation and the first of the next', () => {
    const civic = (year: number) => changesGeneration(car(year, 'Honda', 'Civic'), file);
    expect([2019, 2020, 2021, 2022, 2023].map(civic)).toEqual([false, false, true, true, false]);
  });

  it('counts production years from the year built', () => {
    const cClass = (year: number) =>
      changesGeneration(car(year, 'Mercedes-Benz', 'C300', 'c-class-automatic-9-spd'), file);
    // Built 2014-2021, then from 2021: abroad, a 2021 photo may show either.
    expect([2019, 2020, 2021, 2022].map(cClass)).toEqual([false, false, true, false]);
  });

  it('is not a year the model only has the same generation told twice, or a line alongside', () => {
    const told = {
      ...file,
      articles: {
        ...file.articles,
        'Honda Civic': [
          ...file.articles['Honda Civic'],
          gen('Honda Civic, tenth generation', [2016, 2021], 'model_years', 'Civic10.jpg'),
          gen('Honda Civic (commercial)', [1990, 2027], 'production', 'Civic10.jpg'),
        ],
      },
    };
    expect(changesGeneration(car(2018, 'Honda', 'Civic'), told)).toBe(false);
  });
});

describe('photoFor', () => {
  it('gives a photo of the car’s own year, named by its file, with its credit and generation', () => {
    expect(photoFor(car(2019, 'Honda', 'Civic 4Dr', 'civic-automatic-av-s7'), file)).toEqual({
      src: image('2019_Honda_Civic.jpg').src,
      page: image('2019_Honda_Civic.jpg').page,
      credit: 'Jane Doe, CC BY-SA 4.0',
      caption: '2019 Honda Civic EX sedan, front 4.2.19',
      generation: 'Honda Civic (tenth generation)',
    });
  });

  it('gives none rather than a photo of another year of its generation', () => {
    expect(
      photoFor(car(2018, 'Honda', 'Civic 4Dr', 'civic-automatic-av-s7'), file),
    ).toBeUndefined();
  });

  it('gives none named for another body: a coupe’s named sedan, a 328i’s named Gran Turismo', () => {
    expect(photoFor(car(2019, 'Honda', 'Civic 2Dr', 'civic-manual-6-spd'), file)).toBeUndefined();
    const hatch = new Set<PhotoBody>(['hatch']);
    expect(
      photoFor(car(2014, 'BMW', '328i', '3-series-manual-6-spd'), file, hatch),
    ).toBeUndefined();
  });

  it('takes only photos on Commons', () => {
    expect(photoFor(car(2021, 'BMW', 'M3', 'm3-manual-6-spd'), file)).toBeUndefined();
  });
});

describe('withCarPhotos', () => {
  it('shares one photo among the cars it pictures and clears stale ones', () => {
    const a = car(2019, 'Honda', 'Civic 4Dr', 'civic-automatic-av-s7');
    const b = car(2020, 'Honda', 'Civic 4Dr', 'civic-manual-6-spd');
    const stale = { ...car(2019, 'Kia', 'Rio', 'rio-manual-6-spd'), photo: photoFor(a, file) };
    const [pa, pb, ps] = withCarPhotos([a, b, stale], file);
    expect(pa.photo).toBe(pb.photo);
    expect(ps).not.toHaveProperty('photo');
    expect(withCarPhotos([a], null)[0]).toBe(a);
  });
});

describe('withCarPhotos, for a car with no photo of its own year', () => {
  it('borrows the nearest year’s of its generation, model and body, and says which year', () => {
    const own = car(2019, 'Honda', 'Civic 4Dr', 'civic-automatic-av-s7');
    const [, borrowed] = withCarPhotos(
      [own, car(2017, 'Honda', 'Civic 4Dr', 'civic-manual-6-spd')],
      file,
    );
    expect(borrowed.photo).toMatchObject({
      caption: '2019 Honda Civic EX sedan, front 4.2.19',
      generation: 'Honda Civic (tenth generation)',
      otherYear: { year: 2019, generation: [2016, 2021] },
    });
  });

  it('borrows none in a year the generation changed, or for another body or model', () => {
    const own = car(2019, 'Honda', 'Civic 4Dr', 'civic-automatic-av-s7');
    const lastYear = car(2021, 'Honda', 'Civic 4Dr', 'civic-manual-6-spd');
    const coupe = { ...car(2018, 'Honda', 'Civic 2Dr', 'civic-manual-6-spd'), bodyStyle: 'coupe' };
    const typeR = car(2018, 'Honda', 'Civic Type R', 'civic-manual-6-spd');
    const [, a, b, c] = withCarPhotos([own, lastYear, coupe as Car, typeR], file);
    expect(a.photo).toBeUndefined();
    expect(b.photo).toBeUndefined();
    expect(c.photo).toBeUndefined();
  });
});
