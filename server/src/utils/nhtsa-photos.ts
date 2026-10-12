import { readFileSync } from 'fs';
import type { BodyStyle, Car } from '../types/car.types.js';
import { resolveDataFile } from './data-paths.js';

/**
 * Photos of the cars, from NHTSA: when it crash-tests a model it photographs
 * the car it bought first, and publishes the photo with the ratings. A work
 * of the US government, so free to use. scripts/build-nhtsa-photos.ts lists
 * them in data/nhtsa-photos.json; withNhtsaPhotos gives each car the photo
 * of its own model year, model and body, or none.
 *
 * None beats a wrong one, so the match is strict: the same model year, a
 * model name NHTSA's matches word for word, and nothing more in the car's
 * name than drive, body, powertrain and EPA's bookkeeping. A Civic Type R,
 * an F-150 Raptor or a Silverado LD (the old truck, sold alongside the new)
 * gets no photo from the plain Civic, F-150 or Silverado.
 */

/** A file on NHTSA's image host, e.g. "13416_st0640_046.png". */
export const NHTSA_PHOTO_FILE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}\.(?:png|jpe?g)$/i;

export interface NhtsaPhotoVehicle {
  /** NHTSA's VehicleId. */
  id: number;
  year: number;
  /** As NHTSA spells them: "MERCEDES-BENZ", "F-150". */
  make: string;
  model: string;
  /** NHTSA's name for the variant tested: "2020 Ford F-150 SuperCrew PU/CC 4WD". */
  description: string;
  /** File name on NHTSA's image host (see NHTSA_PHOTO_FILE). */
  picture: string;
}

export interface NhtsaPhotoFile {
  source: string;
  /** Model years listed completely, with the date they were. */
  years: Record<string, string>;
  vehicles: NhtsaPhotoVehicle[];
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * A name's words, lower case, parenthesised notes dropped and the joins
 * inside a name closed up: "F-150" is "f150", "Mach-E" "mache".
 */
export function nameWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/([a-z0-9])[-/.]+(?=[a-z0-9])/g, '$1')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Words that can follow a model's name without making it another car: drive,
 * body (checked against NHTSA's own below), powertrain, and the notes EPA
 * adds to tell its listings apart.
 */
const NEUTRAL = new Set([
  // Drive
  ...['2wd', '4wd', 'awd', 'fwd', 'rwd', '4x2', '4x4', '4matic', '4motion', 'xdrive', 'sdrive'],
  ...['quattro', 'all4', 'shawd', 'e4orce', 'awc'],
  // Body
  ...['sedan', 'coupe', 'convertible', 'hatchback', 'hatch', 'wagon', 'station', 'cabriolet'],
  ...['roadster', 'spider', 'spyder', 'pickup', 'truck', 'van', 'suv', 'door', '2dr', '4dr'],
  ...['5dr', '3dr', 'sportwagon', 'sports', 'avant', 'estate', 'gran'],
  // Powertrain
  ...['hybrid', 'plugin', 'plug', 'in', 'phev', 'hev', 'mhev', 'electric', 'ev', 'bev', 'diesel'],
  ...[
    'tdi',
    'turbo',
    'ffv',
    'flex',
    'fuel',
    'cng',
    'eassist',
    'ecoboost',
    'eco',
    'fe',
    'xfe',
    'hfe',
  ],
  // EPA's notes: weights, tires, wheels, batteries, chargers
  ...['gvwr', 'lbs', 'payload', 'base', 'lt', 'tire', 'tires', 'inch', 'wheels', 'wheel', 'with'],
  ...['w', 'and', 'battery', 'mod', 'charger', 'mode', 'long', 'range', 'standard', 'mid'],
  ...['performance', 'dual', 'motor', 'single', 'pkg', 'package', 'cargo', 'passenger'],
  // Cab styles: another cab is the same truck
  ...['crew', 'cab', 'regular', 'extended', 'double', 'quad', 'king', 'access', 'supercab'],
  ...['supercrew', 'crewmax', 'megacab'],
  // Grades, which share the body
  ...['le', 'xle', 'se', 'xse', 'lx', 'ex', 'exl', 'sx', 'gl', 'gls', 'sel', 'sv', 'sl'],
]);

const DESIGNATOR = [
  // Engine within a family: C300, GLE350, 330i, M340i, ES 350, P100D, xDrive40i.
  /^[a-z]{0,3}\d{2,3}[a-z]{0,3}$/,
  /^[sx]drive\d{2,3}[a-z]{0,2}$/,
  // Engine size, wheel and charger sizes: 2.7L, 20in, 11kW, 87kWh.
  /^\d+(?:l|in|kw|kwh|kwhr|mod)$/,
  // GM's and Ram's half-ton codes: C15, K1500, C10.
  /^[ck](?:1|10|15|150|1500)$/,
  // Wheel diameters, and weights ("GVWR>7599 LBS"), not 2500 or 3500.
  /^\d{2}$|^[4-9]\d{3}$/,
];

function neutral(word: string): boolean {
  return NEUTRAL.has(word) || DESIGNATOR.some((re) => re.test(word));
}

/** Words NHTSA can add to a name the car's lacks: "SILVERADO 1500" is EPA's "Silverado". */
const NHTSA_OPTIONAL = new Set(['1500', '150', 'pickup', 'pu', 'truck', 'suv', 'hybrid']);

/**
 * EPA's own name for the model family, which the car's id keeps: the trim
 * slug opens with it ("c-class-automatic-9-spd", "3-series-manual-6-spd").
 */
export function epaBaseModel(trim: string | undefined): string[] {
  if (!trim) return [];
  const base = trim.split(
    /-(?:(?:\d|[a-z])?mode|clkup|vlkup|sil|lockup|automatic|manual|auto)(?:-|$)/,
  )[0];
  return base && base !== trim ? base.split('-').filter(Boolean) : [];
}

type BodyClass =
  'sedan' | 'coupe' | 'convertible' | 'hatchback' | 'wagon' | 'suv' | 'truck' | 'van';

/** The body NHTSA names in a description ("4 DR", "HB", "PU/CC", "SUV"), if it names one. */
export function descriptionBody(description: string): BodyClass | undefined {
  const d = ` ${description.toUpperCase()} `;
  if (/\bCONV(?:ERTIBLE)?\b|\bROADSTER\b|\bCABRIO/.test(d)) return 'convertible';
  if (
    /\bP\/?U\b|\bPICKUP\b|\b(?:REG|EXT|CREW|SUPER|DOUBLE|QUAD|KING|ACCESS)\s?CAB\b|CREWMAX|SUPERCREW/.test(
      d,
    )
  ) {
    return 'truck';
  }
  if (/\bVAN\b|\bMINIVAN\b/.test(d)) return 'van';
  if (/\bSUV\b/.test(d)) return 'suv';
  if (/\bS\/?W\b|\bWAGON\b/.test(d)) return 'wagon';
  if (/\b[35]?\s?HB\b|\bHATCH(?:BACK)?\b|\b[35]\s?-?\s?DR\s+HB\b/.test(d)) return 'hatchback';
  if (/\b2\s?-?\s?DR\b|\bCOUPE\b/.test(d)) return 'coupe';
  if (/\b4\s?-?\s?DR\b|\bSEDAN\b/.test(d)) return 'sedan';
  return undefined;
}

/** The bodies NHTSA might call a car of each of the site's body styles. */
const BODY_ACCEPTS: Record<BodyStyle, BodyClass[]> = {
  sedan: ['sedan'],
  coupe: ['coupe'],
  convertible: ['convertible'],
  hatchback: ['hatchback'],
  wagon: ['wagon', 'suv'],
  suv: ['suv', 'wagon'],
  truck: ['truck'],
  van: ['van'],
  minivan: ['van'],
};

/** The car's body as its name gives it, else as the site classed it. */
function carBody(car: Car): BodyStyle {
  const name = ` ${car.model.toLowerCase()} `;
  if (/\b(convertible|cabriolet|roadster|spyder|spider|volante)\b/.test(name)) return 'convertible';
  if (/\b(wagon|sportwagen|avant|estate|touring wagon|sports wagon)\b/.test(name)) return 'wagon';
  if (/\bcoupe\b/.test(name) && !/\bgran coupe\b/.test(name)) return 'coupe';
  return car.bodyStyle;
}

const DRIVE_WORD: Record<string, Car['driveType'][]> = {
  FWD: ['FWD'],
  RWD: ['RWD'],
  '2WD': ['RWD', 'FWD'],
  AWD: ['AWD', '4WD'],
  '4WD': ['4WD', 'AWD'],
  '4X4': ['4WD', 'AWD'],
};

interface Scored {
  vehicle: NhtsaPhotoVehicle;
  score: number;
}

/** How well an NHTSA model name fits the car; undefined when it is another car. */
function nameScore(car: Car, base: string[], nhtsaModel: string, make: string): number | undefined {
  let nhtsa = nameWords(nhtsaModel);
  // "RAM 1500" under RAM, "MINI COOPER" under MINI.
  if (nhtsa.length > 1 && nhtsa[0] === compact(make)) nhtsa = nhtsa.slice(1);
  const carWords = nameWords(car.model);

  // NHTSA's name, less words it can add that the car's lacks, from the full one down.
  for (let drop = 0; drop < nhtsa.length; drop++) {
    const kept = nhtsa.slice(0, nhtsa.length - drop);
    if (drop && !nhtsa.slice(kept.length).every((w) => NHTSA_OPTIONAL.has(w))) break;
    const target = kept.join('');

    // The car's own name opens with NHTSA's: "F150 Pickup 4WD" is "F-150".
    let joined = '';
    for (let i = 0; i < carWords.length && joined.length < target.length; i++) {
      joined += carWords[i];
      if (joined === target) {
        const rest = carWords.slice(i + 1);
        return rest.every(neutral) ? 10 * kept.length - drop - rest.length * 0.01 : undefined;
      }
    }

    // EPA's family name is NHTSA's ("C-Class", "3 Series") and the rest of
    // the car's name is engine, drive and body: "C300 4matic Coupe".
    if (base.join('') === target) {
      const rest = carWords.filter((w) => !base.includes(w));
      if (rest.every(neutral)) return 10 * kept.length - drop - 1;
    }
  }
  return undefined;
}

export type PhotoIndex = Map<string, NhtsaPhotoVehicle[]>;

const indexKey = (year: number, make: string) => `${year}|${compact(make)}`;

export function indexPhotos(vehicles: NhtsaPhotoVehicle[]): PhotoIndex {
  const index: PhotoIndex = new Map();
  for (const v of vehicles) {
    if (!NHTSA_PHOTO_FILE.test(v.picture)) continue;
    const key = indexKey(v.year, v.make);
    const list = index.get(key);
    if (list) list.push(v);
    else index.set(key, [v]);
  }
  return index;
}

/** NHTSA's photo for the car, or undefined. */
export function photoFor(car: Car, index: PhotoIndex): NhtsaPhotoVehicle | undefined {
  const candidates = index.get(indexKey(car.year, car.make));
  if (!candidates) return undefined;
  const base = epaBaseModel(car.trim);
  const body = carBody(car);
  const accepts = BODY_ACCEPTS[body];

  let best: Scored | undefined;
  for (const vehicle of candidates) {
    const score = nameScore(car, base, vehicle.model, vehicle.make);
    if (score === undefined) continue;
    const named = descriptionBody(vehicle.description);
    // A body NHTSA names must be the car's; one it leaves unnamed is the model's only one.
    if (named && !accepts.includes(named)) continue;
    let total = score;
    if (named) total += 0.5;
    const drives = vehicle.description
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .flatMap((w) => DRIVE_WORD[w] ?? []);
    if (drives.length) total += drives.includes(car.driveType) ? 0.3 : -0.3;
    if (!best || total > best.score || (total === best.score && vehicle.id < best.vehicle.id)) {
      best = { vehicle, score: total };
    }
  }
  return best?.vehicle;
}

/** The cars, each with its photo where NHTSA has one. */
export function withNhtsaPhotos(cars: Car[], vehicles: NhtsaPhotoVehicle[]): Car[] {
  const index = indexPhotos(vehicles);
  return cars.map((car) => {
    const photo = photoFor(car, index);
    if (!photo) {
      if (!car.photo) return car;
      const { photo: _stale, ...rest } = car;
      return rest;
    }
    return { ...car, photo: { file: photo.picture, caption: photo.description } };
  });
}

/** data/nhtsa-photos.json's vehicles; none when it is missing or unreadable. */
export function loadNhtsaPhotos(): NhtsaPhotoVehicle[] {
  const path = resolveDataFile('nhtsa-photos.json');
  if (!path) return [];
  try {
    const file = JSON.parse(readFileSync(path, 'utf-8')) as NhtsaPhotoFile;
    return Array.isArray(file.vehicles) ? file.vehicles : [];
  } catch (err) {
    console.warn(`[nhtsa-photos] Failed to read ${path}:`, (err as Error).message);
    return [];
  }
}
