import type { Car } from '../../src/types/car.types.js';

/**
 * Choosing a photo of the car's own model year from Wikimedia Commons, for
 * build-car-photos.ts. Commons' car photos are mostly named the way its
 * prolific photographers name them, year first: "2021 BMW M3 Competition
 * Automatic 3.0 Front.jpg", "2023 Kia Sportage SX Prestige, front left,
 * 03-26-2023.jpg". So the collector lists, for each make and model year, the
 * files whose names start with that year, and this picks, for each car, the
 * best of those that are of its make, its model, its body, and the outside of
 * the car. A car none fit has no photo: a photo of another year is not shown.
 */

/** The names a make's photos go by on Commons. */
const MAKE_NAMES: Record<string, string[]> = {
  'Mercedes-Benz': ['Mercedes-Benz', 'Mercedes-AMG', 'Mercedes-Maybach'],
  'Land Rover': ['Land Rover', 'Range Rover'],
  'McLaren Automotive': ['McLaren'],
  'BMW Alpina': ['Alpina'],
  'Bugatti Rimac': ['Bugatti'],
  'INEOS Automotive': ['Ineos'],
  'RUF Automobile': ['Ruf'],
  'Roush Performance': ['Roush'],
  'Saleen Performance': ['Saleen'],
  'Panoz Auto-Development': ['Panoz'],
  'CODA Automotive': ['Coda'],
  'Dabryan Coach Builders Inc': [],
  'Federal Coach': [],
  'Quantum Technologies': [],
  'Tecstar, LP': [],
};

export function makeNames(make: string): string[] {
  return MAKE_NAMES[make] ?? [make];
}

const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
const compact = (s: string) => tokens(s).join('');

/** A file's name without "File:" and its extension: what the photographer called it. */
export function fileCaption(file: string): string {
  return file
    .replace(/^File:/i, '')
    .replace(/\.(?:jpe?g|png|webp)$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Whether a file is named for the model year: "2021 BMW M3...", "2019-2021 Honda...". */
export function namedForYear(file: string, year: number): boolean {
  return new RegExp(`^${year}(?:[\\s,_]|[-–]\\d{2,4}\\b)`).test(fileCaption(file));
}

/** First words of a model name that are not a model on their own: "Model 3", "Grand Cherokee". */
const TWO_WORD_FIRSTS = new Set([
  'model',
  'grand',
  'range',
  'santa',
  'new',
  'town',
  'park',
  'crown',
  'monte',
  'gran',
  'land',
  'amg',
  'el',
  'le',
  'la',
]);

const NAME_NOISE =
  /^(?:2wd|4wd|awd|fwd|rwd|4x2|4x4|ffv|cng|2dr|4dr|5dr|pickup|cab|chassis|van|wagon|[a-z]?\d{2,3}kw|\d+(?:\.\d)?l)$/i;

/**
 * The words a photo's name must carry for the car's model: its first (the
 * first two for "Model 3", "Grand Cherokee"), and the second too where the
 * two make a model of their own ("Corolla Cross" is not the Corolla).
 */
export function modelKey(car: Pick<Car, 'model'>, separateModels: Set<string>): string[] {
  const words = car.model
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NAME_NOISE.test(w));
  if (!words.length) return [];
  const two = words.slice(0, 2);
  if (words.length >= 2 && TWO_WORD_FIRSTS.has(words[0].toLowerCase())) return two;
  if (words.length >= 2 && separateModels.has(compact(two.join(' ')))) return two;
  return [words[0]];
}

/** Where the key's words stand, run together, as whole words of the name: "F-150" is "F150". */
function keyAt(nameTokens: string[], key: string): number {
  for (let i = 0; i < nameTokens.length; i++) {
    let joined = '';
    for (let j = i; j < Math.min(i + 4, nameTokens.length); j++) {
      joined += nameTokens[j];
      if (joined === key) return j + 1;
      if (!key.startsWith(joined)) break;
    }
  }
  return -1;
}

/** Not the outside of the car as it is sold: parts, crashes, race cars, toys. */
const NOT_THE_CAR = new Set([
  ...['rear', 'back', 'interior', 'inside', 'dashboard', 'dash', 'cockpit', 'engine', 'enginebay'],
  ...['wheel', 'wheels', 'rim', 'rims', 'tyre', 'tire', 'tires', 'badge', 'badging', 'emblem'],
  ...['logo', 'seat', 'seats', 'trunk', 'boot', 'grille', 'grill', 'headlight', 'headlights'],
  ...['headlamp', 'headlamps', 'taillight', 'taillights', 'taillamp', 'tail', 'lamp', 'lights'],
  ...['mirror', 'detail', 'details', 'console', 'gauge', 'gauges', 'speedometer', 'instrument'],
  ...['cluster', 'steering', 'underside', 'underbody', 'crash', 'crashed', 'wreck', 'wrecked'],
  ...['damaged', 'accident', 'burnt', 'burned', 'police', 'taxi', 'ambulance', 'race', 'racing'],
  ...['racecar', 'rally', 'drift', 'modified', 'tuned', 'stance', 'lowered', 'widebody', 'concept'],
  ...['prototype', 'scale', 'toy', 'diecast', 'lego', 'render', 'rendering', 'sketch', 'drawing'],
  ...['cutaway', 'camouflage', 'camo', 'mule', 'livery', 'nascar', 'pace', 'safety', 'hood'],
  ...['bonnet', 'sunroof', 'infotainment', 'shifter', 'pedals', 'frunk', 'charging', 'sticker'],
  ...['monroney', 'upholstery', 'roofline'],
]);

/** Versions that look unlike the model's others: a Raptor is not an F-150, a GTI not a Golf. */
const VARIANTS = new Set([
  ...['gti', 'gli', 'type', 'raptor', 'tremor', 'trx', 'srt', 'srt8', 'hellcat', 'demon'],
  ...['redeye', 'scat', 'trackhawk', 'amg', 'nismo', 'sti', 'wrx', 'shelby', 'gt350', 'gt500'],
  ...['boss', 'mach', 'lightning', 'zr2', 'zl1', 'z06', 'zr1', 'z28', 'ss', 'rs', 'cupra'],
  ...['abarth', 'svr', 'svj', 'sto', 'performante', 'gt3', 'gt2', 'limousine', 'limo', 'stretch'],
  ...['hearse', 'ev', 'electric', 'lwb', 'pullman', 'cabover'],
]);

const OPEN = ['convertible', 'cabriolet', 'cabrio', 'roadster', 'spyder', 'spider', 'volante'];
const WAGON = ['wagon', 'estate', 'avant', 'sportwagen', 'allroad', 'sportbrake', 'shooting'];
const HATCH = ['hatchback', 'hatch', 'sportback', 'liftback'];
const SEDAN = ['sedan', 'saloon'];

type Body = 'open' | 'coupe' | 'wagon' | 'hatch' | 'sedan' | 'other';

function bodyOf(words: string[], make: string): Body | undefined {
  const has = (list: string[]) => words.some((w) => list.includes(w));
  if (has(OPEN)) return 'open';
  if (words.includes('coupe') || words.includes('targa')) return 'coupe';
  if (has(WAGON) || (make === 'BMW' && words.includes('touring'))) return 'wagon';
  if (has(HATCH)) return 'hatch';
  if (has(SEDAN)) return 'sedan';
  return undefined;
}

/** The car's body, from its name where it says, else the site's class. */
function carBody(car: Pick<Car, 'model' | 'bodyStyle' | 'make'>): { body: Body; named: boolean } {
  const named = bodyOf(tokens(car.model), car.make);
  if (named) return { body: named, named: true };
  const fromStyle: Record<string, Body> = {
    convertible: 'open',
    coupe: 'coupe',
    wagon: 'wagon',
    hatchback: 'hatch',
    sedan: 'sedan',
  };
  return { body: fromStyle[car.bodyStyle] ?? 'other', named: false };
}

const NORTH_AMERICA = new Set(['us', 'usa', 'america', 'american', 'canada', 'canadian']);
const ELSEWHERE = new Set([
  ...['uk', 'japan', 'japanese', 'jdm', 'china', 'chinese', 'europe', 'european', 'eu'],
  ...['germany', 'german', 'australia', 'australian', 'india', 'rhd', 'korea', 'thailand'],
  ...['indonesia', 'malaysia', 'brazil', 'taiwan', 'philippines', 'russia', 'turkey', 'nz'],
]);

export interface YearPhotoContext {
  /** Two-word names that are models of their own, as compact strings: "corollacross". */
  separateModels: Set<string>;
}

/**
 * How well a file pictures the car, or undefined when it does not: another
 * year, make, model, body or version, or not the outside of the car. Higher
 * is better: a front view, a North American car, the car's own trim words.
 */
export function scoreYearPhoto(
  file: string,
  car: Pick<Car, 'make' | 'model' | 'year' | 'bodyStyle'>,
  context: YearPhotoContext,
): number | undefined {
  if (!/\.(?:jpe?g|png|webp)$/i.test(file) || !namedForYear(file, car.year)) return undefined;
  const name = tokens(fileCaption(file));
  const nameCompact = name.join('');
  if (!makeNames(car.make).some((m) => nameCompact.includes(compact(m)))) return undefined;

  const key = modelKey(car, context.separateModels);
  if (!key.length) return undefined;
  const keyCompact = compact(key.join(' '));
  const after = keyAt(name, keyCompact);
  if (after === -1) return undefined;
  // "Corolla Cross" for a Corolla: the next word makes another model.
  const next = name[after];
  if (next && key.length === 1 && context.separateModels.has(`${keyCompact}${next}`)) {
    return undefined;
  }

  const own = new Set([...tokens(car.model), ...tokens(key.join(' '))]);
  if (name.some((w) => NOT_THE_CAR.has(w) && !own.has(w))) return undefined;
  if (name.some((w) => VARIANTS.has(w) && !own.has(w))) return undefined;

  const { body, named } = carBody(car);
  const fileBody = bodyOf(name, car.make);
  let score = 0;
  if (fileBody) {
    // A photo naming a body shows that body: an SUV's named "coupe" is the coupe version.
    if (fileBody !== body) return undefined;
    score += 2;
  } else if (named && (body === 'open' || body === 'wagon')) {
    // A convertible or wagon named as one: an unnamed photo is likely the other body.
    return undefined;
  }

  if (name.includes('front')) score += 3;
  if (name.includes('side') || name.includes('profile')) score += 1;
  if (name.some((w) => NORTH_AMERICA.has(w))) score += 2;
  if (name.some((w) => ELSEWHERE.has(w))) score -= 2;
  const trims = tokens(car.model).filter((w) => !key.some((k) => compact(k) === w) && w.length > 1);
  score += Math.min(3, trims.filter((w) => name.includes(w)).length);
  return score;
}

/** The best file for the car among those named for its year, or undefined. */
export function chooseYearPhoto(
  files: string[],
  car: Pick<Car, 'make' | 'model' | 'year' | 'bodyStyle'>,
  context: YearPhotoContext,
): string | undefined {
  let best: { file: string; score: number } | undefined;
  for (const file of files) {
    const score = scoreYearPhoto(file, car, context);
    if (score !== undefined && (!best || score > best.score)) best = { file, score };
  }
  return best?.file;
}
