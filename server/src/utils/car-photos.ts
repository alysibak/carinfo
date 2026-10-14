import { readFileSync } from 'fs';
import type { Car, CarPhoto } from '../types/car.types.js';
import { resolveDataFile } from './data-paths.js';

/**
 * Photos of the cars, from Wikipedia and Wikimedia Commons: each model's
 * article (and each generation's) opens with an infobox giving the model
 * years it covers and a photo, which Commons holds under a free licence
 * with its author's name. scripts/build-car-photos.ts collects them in
 * data/car-photos.json; withCarPhotos gives each car the photo of its own
 * generation, found by model year, or none.
 *
 * The photo is of the generation, not the trim: a 2019 Civic Type R shows
 * the tenth-generation Civic that Wikipedia pictures, which may be a sedan.
 * Its caption says so.
 *
 * NHTSA was the first source tried: its API now gives only crash-test
 * photos, and the clean ones it used to link were licensed stock images.
 */

export interface PhotoGeneration {
  /** The article, or the inline infobox's name: "Honda Civic (tenth generation)". */
  title: string;
  /** Model years covered, first and last. */
  years: [number, number];
  /** model_years (US model years) or production (calendar years, less exact). */
  basis: 'model_years' | 'production';
  /** File on Commons. */
  image: string;
  /** The infobox's caption for the photo, when it has one. */
  caption?: string;
}

export interface PhotoImage {
  /** About 500 px wide, on upload.wikimedia.org. */
  src: string;
  /** About 250 px wide. */
  thumb: string;
  /** The file's page on Commons. */
  page: string;
  artist: string;
  license: string;
  licenseUrl?: string;
}

export interface CarPhotoFile {
  source: string;
  fetched: string;
  /** "make|query" (see photoQueries) to the Wikipedia article it names, or null for none. */
  queries: Record<string, string | null>;
  /** Article title to the generations it pictures. */
  articles: Record<string, PhotoGeneration[]>;
  /** Commons file name to where it is and whose it is. */
  images: Record<string, PhotoImage>;
}

const COMMONS_UPLOAD = 'https://upload.wikimedia.org/wikipedia/commons/';
const COMMONS_PAGE = 'https://commons.wikimedia.org/wiki/File:';

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * EPA's own name for the model family, which the car's trim keeps: the slug
 * opens with it ("c-class-automatic-9-spd", "3-series-manual-6-spd").
 */
export function epaBaseModel(trim: string | undefined): string[] {
  if (!trim) return [];
  const base = trim.split(
    /-(?:(?:\d|[a-z])?mode|clkup|vlkup|sil|lockup|automatic|manual|auto)(?:-|$)/,
  )[0];
  return base && base !== trim ? base.split('-').filter(Boolean) : [];
}

/** Words in EPA's model names that say nothing about which model it is. */
const NOISE =
  /^(?:2wd|4wd|awd|fwd|rwd|4x2|4x4|4matic\+?|xdrive|sdrive|quattro|4motion|ffv|cng|2dr|4dr|5dr|pickup|cab|chassis|van|wagon)$/i;

/** The model's name as EPA wrote it, its words up to the first that is drive or body. */
function nameWords(model: string): string[] {
  const words = model
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const stop = words.findIndex((w) => NOISE.test(w));
  return stop === -1 ? words : words.slice(0, stop);
}

/**
 * EPA's family name written as a title: its casing from the car's own name
 * where that holds it ("cx-5" in "CX-5 2WD"), else short and coded words in
 * capitals ("golf gti" is "Golf GTI").
 */
function familyTitle(base: string[], model: string): string {
  const pattern = new RegExp(
    `(?:^|\\s)(${base.map((w) => w.replace(/[^a-z0-9]/g, '')).join('[\\s-]?')})(?=$|[\\s(])`,
    'i',
  );
  const found = pattern.exec(model)?.[1];
  if (found) return found;
  return base
    .map((w) =>
      /\d/.test(w) || w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(' ');
}

/**
 * Names to look the car's model up by, best first: EPA's family name, then
 * the first two words of its model name, then the first. The fetch script
 * resolves each to an article; the first that has one decides.
 */
export function photoQueries(car: Pick<Car, 'model' | 'trim'>): string[] {
  const out: string[] = [];
  const base = epaBaseModel(car.trim);
  if (base.length) out.push(familyTitle(base, car.model));
  const words = nameWords(car.model);
  if (words.length >= 2) out.push(words.slice(0, 2).join(' '));
  if (words.length >= 1) out.push(words[0]);
  return [...new Set(out.filter(Boolean))];
}

export const queryKey = (make: string, query: string) => `${compact(make)}|${query.toLowerCase()}`;

/**
 * The generation for a model year. A range from model_years fits exactly; a
 * production range runs a year behind (a car built in 2015 is often a 2016),
 * so where two fit, the one that started before the year beats the one that
 * started in it, and the later start beats the earlier.
 */
export function generationFor(
  generations: PhotoGeneration[],
  year: number,
): PhotoGeneration | undefined {
  const exact = generations.filter(
    (g) => g.basis === 'model_years' && g.years[0] <= year && year <= g.years[1],
  );
  const pool = exact.length
    ? exact
    : generations.filter(
        (g) => g.basis === 'production' && g.years[0] <= year && year <= g.years[1] + 1,
      );
  return [...pool].sort((a, b) => {
    const aEarly = a.years[0] < year ? 1 : 0;
    const bEarly = b.years[0] < year ? 1 : 0;
    return bEarly - aEarly || b.years[0] - a.years[0];
  })[0];
}

function isCommonsImage(image: PhotoImage | undefined): image is PhotoImage {
  return Boolean(
    image &&
    image.src.startsWith(COMMONS_UPLOAD) &&
    image.thumb.startsWith(COMMONS_UPLOAD) &&
    image.page.startsWith(COMMONS_PAGE),
  );
}

/** The car's photo from the file, or undefined. */
export function photoFor(
  car: Pick<Car, 'make' | 'model' | 'trim' | 'year'>,
  file: CarPhotoFile,
): CarPhoto | undefined {
  for (const query of photoQueries(car)) {
    const article = file.queries[queryKey(car.make, query)];
    if (!article) continue;
    const generation = generationFor(file.articles[article] ?? [], car.year);
    if (!generation) return undefined;
    const image = file.images[generation.image];
    if (!isCommonsImage(image)) return undefined;
    return {
      src: image.src,
      thumb: image.thumb,
      page: image.page,
      credit: [image.artist, image.license].filter(Boolean).join(', '),
      ...(image.licenseUrl ? { licenseUrl: image.licenseUrl } : {}),
      generation: generation.title,
      ...(generation.caption ? { caption: generation.caption } : {}),
    };
  }
  return undefined;
}

/** The cars, each with its generation's photo where Wikipedia has one. */
export function withCarPhotos<T extends Car>(cars: T[], file: CarPhotoFile | null): T[] {
  if (!file) return cars;
  // Cars of one generation share one photo object.
  const shared = new Map<string, CarPhoto>();
  return cars.map((car) => {
    const found = photoFor(car, file);
    if (!found) {
      if (!car.photo) return car;
      const { photo: _stale, ...rest } = car;
      return rest as T;
    }
    const key = `${found.src}|${found.generation}`;
    const photo = shared.get(key) ?? found;
    shared.set(key, photo);
    return { ...car, photo };
  });
}

/** data/car-photos.json, or null when it is missing or unreadable. */
export function loadCarPhotos(): CarPhotoFile | null {
  const path = resolveDataFile('car-photos.json');
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as CarPhotoFile;
  } catch (err) {
    console.warn(`[car-photos] Failed to read ${path}:`, (err as Error).message);
    return null;
  }
}
