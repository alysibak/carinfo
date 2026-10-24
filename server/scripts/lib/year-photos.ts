import type { Car } from '../../src/types/car.types.js';

/**
 * Choosing a photo of the car's own model year from Wikimedia Commons, for
 * build-car-photos.ts. Commons' car photos are mostly named the way its
 * prolific photographers name them, year first: "2021 BMW M3 Competition
 * Automatic 3.0 Front.jpg", "2023 Kia Sportage SX Prestige, front left,
 * 03-26-2023.jpg". So the collector lists, for each make and model year, the
 * files whose names start with that year, and this picks, for each car, the
 * best of those that are of its make, its model, its body, the outside of the
 * car, and a car sold in North America. A car none fit has no photo: a photo
 * of another year, or of another market's car, is not shown.
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

/**
 * Whether a file is named for the model year: "2021 BMW M3...", or the first
 * of a range, "2019-2021 Honda...", "1995-97 Nissan...". Not a date the photo
 * was taken: "2023-04 BMW i7", "2010-09-09 ... 1994 Chrysler".
 */
export function namedForYear(file: string, year: number): boolean {
  const caption = fileCaption(file);
  // "2012 10 21 Zach Galifianakis ... Mercedes-Benz E350": a date, spaced.
  if (new RegExp(`^${year} \\d{1,2} \\d{1,2}\\b`).test(caption)) return false;
  if (new RegExp(`^${year}[\\s,_]`).test(caption)) return true;
  const range = new RegExp(`^${year}[-–](\\d{4}|\\d{2})(?![\\d.\\-–/])`).exec(caption);
  if (!range) return false;
  const end = Number(range[1]);
  // Two digits that could be a month ("2005-07") are taken for one.
  if (range[1].length === 2) return end > year % 100 && end > 12;
  return end > year && end - year <= 15;
}

/** More than one car: "2013 Lincoln MKZ & 1962 Lincoln Continental". */
const MORE_CARS = /,[^,]+, and /i;
const TWO_CARS =
  /(?:&|\+|\band\b|\bvs\.?|\bversus\b|\bwith\b|\bnext to\b)\s+(?:an?\s+|the\s+)?(?:19|20)\d{2}\b/i;

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
  'gr',
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
  // "RS 3", "GR 86": letters that name a line, then its number.
  if (words.length >= 2 && /^[a-z]{1,3}$/i.test(words[0]) && /^\d+$/.test(words[1])) return two;
  if (words.length >= 2 && separateModels.has(compact(two.join(' ')))) return two;
  return [words[0]];
}

/** Where the key's words stand, run together, as whole words of the name: "F-150" is "F150". */
function keySpan(nameTokens: string[], key: string): [start: number, end: number] | undefined {
  for (let i = 0; i < nameTokens.length; i++) {
    let joined = '';
    for (let j = i; j < Math.min(i + 4, nameTokens.length); j++) {
      joined += nameTokens[j];
      if (joined === key) return [i, j + 1];
      if (!key.startsWith(joined)) break;
    }
  }
  return undefined;
}

/** Trims, not lines: "Azera Limited" is an Azera. */
const TRIM_WORDS = new Set([
  ...['limited', 'denali', 'touring', 'base', 'premium', 'luxury', 'platinum', 'rubicon'],
  ...['sahara', 'willys', 'pure', 'sel', 'xle', 'xse', 'ltz', 'gls', 'slt', 'sle', 'xlt'],
  ...['lariat', 'king', 'ranch', 'harley', 'eco', 'plus', 'signature', 'reserve', 'select'],
  ...['preferred', 'essence', 'avenir', 'elevation', 'pro', 'trd', 'executive', 'edition'],
  ...['special', 'value', 'deluxe', 'classic', 'ultimate', 'prestige', 'laredo', 'overland'],
  ...['summit', 'latitude', 'altitude', 'longitude', 'hybrid', 'plug', 'phev', 'diesel', 'blue'],
  ...['turbo', 'awd', 'quattro', 'xdrive', 'sdrive', 'matic', 'sedan', 'coupe', 'convertible'],
  ...['cabriolet', 'roadster', 'hatchback', 'hatch', 'wagon', 'spider', 'spyder', 'van'],
]);

/** Short trims, not lines: "Camry LE", "Boxster S" (but "Corolla iM", "Grand Cherokee L" are lines). */
const SHORT_TRIMS = new Set([
  ...['le', 'se', 'ex', 'lx', 'dx', 'gl', 'gt', 'ls', 'lt', 'sl', 'sv', 'sr', 'xl', 'rt', 'st'],
  ...['s', 'r', 'e', 'i', 't', 'h', 'd'],
]);

/** The word after the key in a name, if it is one that could name a line: "sport", not "4wd". */
function nextWord(nameTokens: string[], key: string): string | undefined {
  const end = keyAt(nameTokens, key);
  const word = end === -1 ? undefined : nameTokens[end];
  return word &&
    /^[a-z]+$/.test(word) &&
    !NAME_NOISE.test(word) &&
    !TRIM_WORDS.has(word) &&
    !SHORT_TRIMS.has(word)
    ? word
    : undefined;
}

/** The index just after the key's words in the name, or -1. */
function keyAt(nameTokens: string[], key: string): number {
  return keySpan(nameTokens, key)?.[1] ?? -1;
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
  ...['monroney', 'upholstery', 'roofline', 'test', 'crashtest', 'nhtsa', 'iihs', 'euroncap'],
  ...['custom', 'customized', 'customised', 'lifted', 'lowrider', 'slammed', 'bagged', 'replica'],
  ...['challenge', 'cup', 'roadtrek', 'camper', 'motorhome', 'rv', 'campervan', 'conversion'],
  ...['patrol', 'sheriff', 'interceptor', 'rescue', 'btcc', 'dtm', 'wtcc', 'wtcr', 'imsa'],
  ...['supercup', 'motorsport', 'fascia', 'bumper', 'closeup', 'mod', 'modded'],
  ...['window', 'quarterwindow', 'handle', 'pillar', 'taxicab', 'hoonitron', 'brake', 'brakes'],
  ...['disc', 'caliper', 'suspension', 'exhaust', 'muffler', 'tailpipe', 'dragster', 'drag'],
  ...['whipple', 'wipple'],
  // A race's own cars: its medical and marshals' cars, and the series that run them.
  ...['medical', 'marshal', 'marshals', 'wec', 'fia', 'lmgt3', 'lmp2', 'lmh', 'lmdh'],
  // Dressed up or not whole: a parade float, a museum's mock-up of the chassis.
  ...['parade', 'mockup'],
]);

/** Versions that look unlike the model's others: a Raptor is not an F-150, a GTI not a Golf. */
const VARIANTS = new Set([
  ...['gti', 'gli', 'type', 'raptor', 'tremor', 'trx', 'srt', 'srt8', 'hellcat', 'demon'],
  ...['redeye', 'scat', 'trackhawk', 'amg', 'nismo', 'sti', 'wrx', 'shelby', 'gt350', 'gt500'],
  ...['boss', 'mach', 'lightning', 'zr2', 'zl1', 'z06', 'zr1', 'z28', 'ss', 'rs', 'cupra'],
  ...['abarth', 'svr', 'svj', 'sto', 'performante', 'gt3', 'gt2', 'limousine', 'limo', 'stretch'],
  ...['hearse', 'ev', 'electric', 'lwb', 'pullman', 'cabover', 'cs', 'csl', 'dakar', 'safari'],
  ...[
    'gr',
    'gtr',
    'hennessey',
    'brabus',
    'mansory',
    'octa',
    'esv',
    'blazer',
    'pista',
    'speciale',
    'gt4',
    'polestar',
    've',
    'electrique',
    'speedster',
    'gta',
    'gtam',
    'gt8',
    'gt12',
    'cobra',
    'svt',
  ],
  // Heavy-duty trucks, whose fronts differ from the light-duty ones the site lists.
  ...['2500', '3500', '4500', '5500', '2500hd', '3500hd', 'hd', 'superduty'],
]);

/** A make's versions that look unlike its others: a 911 Turbo is wider than a Carrera. */
const MAKE_VARIANTS: Record<string, string[]> = {
  Porsche: ['turbo'],
  MINI: ['roadster'],
  GMC: ['xl'],
};
/** And in more than a word: a Carrera 4 is wider than a Carrera. */
const MAKE_PHRASES: Record<string, string[]> = { Porsche: ['carrera 4'] };

/** Variants a car may be named as whose photos may yet be of the plain model: they look alike. */
const LOOKS_THE_SAME = new Set(['ev', 'electric', 'lwb', 'hd', 'cs']);

/**
 * Words that make another line of the model, which a car named with one needs
 * in its photo's name: a Range Rover Evoque is not a Range Rover, a Mini
 * Clubman not a Mini Cooper hardtop, a BMW Gran Coupe has four doors. (The
 * other way round, MakeLines.after: a Range Rover's photo is not of a Range
 * Rover Sport.)
 */
const SUBLINES = new Set([
  ...['evoque', 'velar', 'sport', 'clubman', 'countryman', 'paceman', 'note', 'maxx', 'gran'],
  ...['alltrack', 'cross', 'unlimited', 'shuttle', 'xuv', 'targa'],
]);

/**
 * Short words that make a line, which a car named with one needs in its
 * photo's name (but a photo's own may be a trim: "Soul X-Line"): a Fiat 500 X,
 * a Grand Cherokee L, a Corolla iM, an Accord Crosstour.
 */
const OWN_LINES = new Set(['x', 'l', 'im', 'crosstour']);

/** Versions named in more than a word: "SLS AMG Black Series". */
const VARIANT_PHRASES = ['black series', 'turbo gt', 'gt black', 'dark horse', 'project 8'];

/** Not the car as sold, in more than a word: a race car ("de compétition"), a cab. */
const NOT_THE_CAR_PHRASES = [
  ...['de competition', 'race car', 'rally car', 'yellow cab', 'taxi cab'],
  ...['die another day', 'james bond'],
  // Endurance races: "2026 6 Hours of Spa-Francorchamps", "24 Hours of Le Mans".
  ...['hours of', 'le mans'],
  // Signs and liveries: "1996 Ford Probe Dominos Delivery Car".
  ...['delivery car', 'mock up'],
];

const OPEN = ['convertible', 'cabriolet', 'cabrio', 'roadster', 'spyder', 'spider', 'volante'];
const WAGON = [
  ...['wagon', 'estate', 'avant', 'sportwagen', 'allroad', 'sportbrake', 'shooting', 'variant'],
];
const HATCH = ['hatchback', 'hatch', 'sportback', 'liftback'];
const SEDAN = ['sedan', 'saloon'];

export type Body = 'open' | 'coupe' | 'wagon' | 'hatch' | 'sedan' | 'van' | 'other';

/** BMW's chassis codes, which its photographers name: an E90 M3 is the sedan, an E92 the coupe. */
const BMW_CHASSIS: Record<string, Body> = {
  ...{ e90: 'sedan', e91: 'wagon', e92: 'coupe', e93: 'open', e46: 'sedan' },
  ...{ f30: 'sedan', f31: 'wagon', f32: 'coupe', f33: 'open', f80: 'sedan', f82: 'coupe' },
  ...{ f83: 'open', g20: 'sedan', g21: 'wagon', g22: 'coupe', g23: 'open', g80: 'sedan' },
  ...{ g81: 'wagon', g82: 'coupe', g83: 'open' },
};

function bodyOf(words: string[], make: string): Body | undefined {
  const has = (list: string[]) => words.some((w) => list.includes(w));
  if (make === 'BMW') {
    const code = words.find((w) => BMW_CHASSIS[w] && w !== 'e46');
    if (code) return BMW_CHASSIS[code];
  }
  if (has(OPEN)) return 'open';
  if (words.includes('coupe')) return 'coupe';
  if (has(WAGON) || (make === 'BMW' && words.includes('touring'))) return 'wagon';
  if (has(HATCH)) return 'hatch';
  if (has(SEDAN)) return 'sedan';
  if (words.includes('van') || words.includes('minivan')) return 'van';
  return undefined;
}

/** The car's body, from its name where it says, else the site's class. */
/** Doors a name gives ("2dr", "2-door", "5-Door"), two (or three) or four (or five). */
function doors(text: string): 2 | 4 | undefined {
  const found = /(?:^|[^a-z0-9])([2-5]) ?-?(?:dr|doors?)\b/i.exec(text);
  if (!found) return undefined;
  return Number(found[1]) <= 3 ? 2 : 4;
}

function carBody(car: Pick<Car, 'model' | 'bodyStyle' | 'make'>): { body: Body; named: boolean } {
  const named = bodyOf(tokens(car.model), car.make);
  if (named) return { body: named, named: true };
  // A "Sonic 5", "Aveo 5" or "Civic 5Dr" is the hatchback.
  const hatch =
    /^[a-z-]+ ?5$/i.test(car.model.trim()) || /\b[35] ?-?(?:dr|doors?)\b/i.test(car.model);
  if (hatch && car.bodyStyle !== 'wagon') {
    return { body: 'hatch', named: true };
  }
  // A "Civic 2Dr" the site calls a sedan is the coupe.
  if (doors(car.model) === 2 && (car.bodyStyle === 'sedan' || car.bodyStyle === 'coupe')) {
    return { body: 'coupe', named: true };
  }
  const fromStyle: Record<string, Body> = {
    convertible: 'open',
    coupe: 'coupe',
    wagon: 'wagon',
    hatchback: 'hatch',
    sedan: 'sedan',
    van: 'van',
    minivan: 'van',
  };
  return { body: fromStyle[car.bodyStyle] ?? 'other', named: false };
}

/** Words of a name, or places in a category, that say North America. */
const NORTH_AMERICA = new Set(['us', 'usa', 'america', 'american', 'canada', 'canadian']);
const NA_SHOWS = new Set(['nyias', 'naias', 'laas', 'cias', 'siam', 'autoshow']);
const NA_PLACES = [
  ...['united states', 'u.s.', 'usa', 'canada', 'north america'],
  ...['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut'],
  ...['delaware', 'florida', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas'],
  ...['kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota'],
  ...['mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey'],
  ...['new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon'],
  ...['pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas'],
  ...['utah', 'vermont', 'virginia', 'washington', 'wisconsin', 'wyoming', 'puerto rico'],
  ...['ontario', 'quebec', 'québec', 'british columbia', 'alberta', 'manitoba', 'saskatchewan'],
  ...['nova scotia', 'new brunswick', 'newfoundland', 'prince edward island'],
  ...['toronto', 'montreal', 'montréal', 'vancouver', 'ottawa', 'calgary', 'edmonton'],
  ...['chicago', 'los angeles', 'detroit', 'san francisco', 'seattle', 'boston', 'houston'],
  ...['dallas', 'miami', 'philadelphia', 'atlanta', 'denver', 'phoenix', 'las vegas'],
  ...['san diego', 'minneapolis', 'auto show', 'salon de l’auto', "salon de l'auto"],
];
/** Words of a name, or places in a category, that say another market. */
const ELSEWHERE = new Set([
  ...['uk', 'japan', 'japanese', 'jdm', 'china', 'chinese', 'europe', 'european', 'eu'],
  ...['germany', 'german', 'australia', 'australian', 'india', 'rhd', 'korea', 'thailand'],
  ...['indonesia', 'malaysia', 'brazil', 'taiwan', 'philippines', 'russia', 'turkey', 'nz'],
  // British and European names for things: engines, bodies, power.
  ...['saloon', 'tourer', 'isg', 'crdi', 'tdci', 'dci', 'hdi', 'bluehdi', 'cdti'],
  ...['d4d', 'multijet', 'jtd', 'jtdm', 'bhp', 'ps'],
  ...['vti', 'ute', 'bluemotion', 'vignale', 'tekna', 'acenta', 'visia', 'zetec'],
  ...['d3', 'd4', 'd5', 'sd'],
  // Chinese makers' versions: "Brilliance-BMW X1" is the long one.
  ...['brilliance', 'faw', 'saic', 'gac', 'dongfeng', 'guangqi', 'changan'],
]);
const ELSEWHERE_PLACES = [
  ...['united kingdom', 'england', 'scotland', 'wales', 'northern ireland', 'ireland', 'london'],
  ...['germany', 'deutschland', 'france', 'paris', 'italy', 'spain', 'portugal', 'netherlands'],
  ...['belgium', 'luxembourg', 'switzerland', 'austria', 'denmark', 'sweden', 'norway'],
  ...['finland', 'iceland', 'poland', 'czech', 'slovakia', 'hungary', 'romania', 'bulgaria'],
  ...['greece', 'croatia', 'slovenia', 'serbia', 'ukraine', 'russia', 'turkey', 'israel'],
  ...['japan', 'tokyo', 'china', 'beijing', 'shanghai', 'hong kong', 'taiwan', 'korea', 'seoul'],
  ...['india', 'thailand', 'malaysia', 'singapore', 'indonesia', 'philippines', 'vietnam'],
  ...['australia', 'new zealand', 'south africa', 'brazil', 'argentina', 'chile', 'colombia'],
  ...['mexico city', 'dubai', 'united arab emirates', 'saudi arabia', 'qatar', 'egypt'],
  ...['europe', 'motor show', 'goodwood', 'iaa', 'geneva', 'autosalon', 'mondial'],
  ...['stockholm', 'oslo', 'copenhagen', 'helsinki', 'amsterdam', 'rotterdam', 'brussels'],
  ...['antwerp', 'berlin', 'munich', 'münchen', 'hamburg', 'frankfurt', 'cologne', 'köln'],
  ...['stuttgart', 'düsseldorf', 'essen', 'nürnberg', 'norisring', 'nürburgring', 'vienna'],
  ...[
    'wien',
    'zurich',
    'zürich',
    'zuerich',
    'milan',
    'milano',
    'turin',
    'torino',
    'madrid',
    'barcelona',
  ],
  ...['lisbon', 'prague', 'praha', 'warsaw', 'budapest', 'moscow', 'istanbul', 'dublin'],
  ...['edinburgh', 'glasgow', 'manchester', 'silverstone', 'brands hatch', 'le mans', 'osaka'],
  ...['sydney', 'melbourne', 'brisbane', 'auckland', 'bangkok', 'kuala lumpur', 'jakarta'],
  ...['surabaya', 'manila', 'doha', 'riyadh', 'guangzhou', 'shenzhen', 'chengdu', 'taipei'],
  ...['brunei', 'cambodia', 'pakistan', 'sri lanka', 'bangladesh', 'nepal', 'kenya', 'nigeria'],
  ...['morocco', 'peru', 'ecuador', 'uruguay', 'paraguay', 'bolivia', 'venezuela', 'cuba'],
  ...['ludwigsburg', 'automesse', 'techno classica', 'retro classics', 'leonberg', 'kuta'],
  ...['bali', 'arese', 'museo', 'buenos aires', 'sao paulo', 'são paulo', 'rio de janeiro'],
  ...['bogota', 'bogotá', 'gingin', 'western australia', 'perth', 'ascot'],
];

/** Where a file says it was taken, from Commons: its camera's place and its categories. */
export interface FilePlace {
  lat?: number;
  lon?: number;
  categories?: string[];
}

/** Where a photo's car was sold: North America, elsewhere, or not known. */
export type Market = 'na' | 'other' | 'unknown';

/** The United States and Canada (and the north of Mexico), Hawaii, Puerto Rico. */
function inNorthAmerica(lat: number, lon: number): boolean {
  return (
    (lat >= 24.4 && lat <= 72 && lon >= -170 && lon <= -52) ||
    (lat >= 18.5 && lat <= 22.5 && lon >= -161 && lon <= -154) ||
    (lat >= 17.8 && lat <= 18.6 && lon >= -67.5 && lon <= -65)
  );
}

const names = (text: string, places: string[]) =>
  places.some((place) =>
    new RegExp(`(?:^|[^a-z])${place.replace(/[.()]/g, '\\$&')}(?:$|[^a-z])`).test(text),
  );

/**
 * North American photographers' names: an American date ("front 6.27.20",
 * "front left, 03-26-2023"; a bare 05.06.20 could be either way round), or
 * the car's colour and view ("LX AWD in Snow White Pearl, front left").
 */
const US_STYLE = [
  /\b(?:0?[1-9]|1[0-2])[.-](?:1[3-9]|2\d|3[01])[.-](?:\d{2}|\d{4})$/,
  /\b(?:front|rear)(?: (?:left|right))?,? \d{1,2}[.-]\d{1,2}[.-](?:\d{2}|\d{4})$/i,
  /\bin [a-z][\w &'.-]*, (?:front|rear)(?: ?(?:left|right))?\d?, \d{4}-\d{2}-\d{2}$/i,
];
/**
 * What a name says the car itself is, sold elsewhere: a British plate ("2015
 * Tesla Model S (AB11 BOX)"), a British dealer's listing ("2998cc",
 * "(374PS)"), or an engine North America did not get ("1.6 TDI", "CRDi").
 */
const CAR_ABROAD = [
  // A British plate, or the age it gives: "2007 (57) Nissan Murano".
  /\b[A-Z]{2}\d{2} ?[A-Z]{3}\b|^\d{4}(?:[-–]\d{2,4})? \(\d{2}\) /,
  /\b\d{3,4} ?cc\b|\(\d{2,4} ?ps\)/i,
  /\b1\.[2-6] ?tdi\b|\b\d\.\d ?(?:vti|tdci|crdi|dci|hdi|cdti|jtd)\b/i,
  // Models North America never had, whose versions share a name with its own: an up! GTI.
  /\bup!|\b(?:polo|lupo|touran|sharan|t-roc|t-cross|amarok|scirocco)\b/i,
];

/**
 * Photographers' ways of naming that say where they take their photos:
 * Britain's ("Automatic 3.0 Front", "V8 Auto", "FOS22"), Australia's
 * ("(F80) sedan (2017-11-18) 01"), or a European date ("29-09-2013").
 */
const PHOTO_ABROAD = [
  /\b(?:automatic|auto|manual|s-a|cvt|dsg|dct|steptronic|tiptronic|powershift)\s+\d\.\d\b/i,
  /\b\d\.\d(?:\s+(?:front|side))?$|\b(?:auto|automatic|manual)(?: -)?(?: front)?(?: \d{1,2})?$/i,
  /\bfos ?\d{0,4}\b|\bgoodwood\b/i,
  /\((?:\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{8})\)(?: \d{1,2})?$/,
  /\([a-z]{1,3}\d{1,3}[a-z]?\)[^()]* 0\d$/i,
  /\((?:[a-z]{1,3}\d{1,3}[a-z]?|[a-z]{2,4})\) .*\b(?:sedan|wagon|hatchback|coupe|convertible|ute|liftback|van)(?: \d{1,2})?$/i,
  /\b(?:1[3-9]|2\d|3[01])[.-](?:0?[1-9]|1[0-2])[.-](?:\d{2}|\d{4})\b/,
];

/**
 * Where a photo's car was sold. What the name says the car is decides ("US-
 * spec", a British plate, a Chinese maker's name); else the camera's place,
 * where Commons has it; else what the photographer's way of naming and the
 * file's categories say. A car photographed in Britain is Britain's, whose
 * model years and versions are not North America's: its 2022 Kia Sportage is
 * the generation North America had from 2023.
 */
export function photoMarket(file: string, place: FilePlace = {}): Market {
  // Without a Flickr number at the end: "... Turbo Diesel Auto (31742)".
  const caption = fileCaption(file).replace(/\s*\(\d{4,}\)$/, '');
  const lower = caption.toLowerCase();
  const words = tokens(caption);
  const carHere = words.some((w) => NORTH_AMERICA.has(w));
  const carAway =
    words.some((w) => ELSEWHERE.has(w)) || CAR_ABROAD.some((pattern) => pattern.test(caption));
  if (carHere !== carAway) return carHere ? 'na' : 'other';

  if (place.lat !== undefined && place.lon !== undefined) {
    return inNorthAmerica(place.lat, place.lon) ? 'na' : 'other';
  }
  const categories = (place.categories ?? []).join(' | ').toLowerCase();
  const here =
    words.some((w) => NA_SHOWS.has(w)) ||
    US_STYLE.some((style) => style.test(caption)) ||
    names(lower, ['montreal', 'montréal', 'toronto', 'auto show']) ||
    names(categories, NA_PLACES);
  const away =
    PHOTO_ABROAD.some((pattern) => pattern.test(caption)) ||
    names(categories, ELSEWHERE_PLACES) ||
    names(lower, ELSEWHERE_PLACES);
  if (here && !away) return 'na';
  if (away && !here) return 'other';
  return 'unknown';
}

/**
 * Names another market gave a different car, in the years it did: a European
 * Ford Fusion is a small MPV, a European Accord the Acura TSX, a Japanese
 * Odyssey a smaller van. These take only a photo taken in North America.
 */
const DIFFERENT_ABROAD: [make: string, model: string, from: number, to: number][] = [
  ['Ford', 'fusion', 2006, 2012],
  ['Ford', 'focus', 2000, 2011],
  ['Ford', 'escort', 1995, 2003],
  ['Ford', 'ranger', 1995, 2012],
  ['Honda', 'accord', 2003, 2017],
  ['Honda', 'civic', 2006, 2015],
  ['Honda', 'odyssey', 1995, 2027],
  ['Volkswagen', 'passat', 2012, 2022],
  ['Volkswagen', 'jetta', 2019, 2027],
  ['Toyota', 'corolla', 2003, 2019],
  ['Toyota', 'yaris', 2007, 2020],
  ['Mitsubishi', 'galant', 1999, 2012],
  ['Nissan', 'sentra', 1995, 2027],
  ['Pontiac', 'transsport', 1995, 1996],
];

/** Whether the car's name is another car abroad in its year. */
export function differsAbroad(car: Pick<Car, 'make' | 'model' | 'year'>): boolean {
  const model = compact(car.model);
  return DIFFERENT_ABROAD.some(
    ([make, name, from, to]) =>
      car.make === make && model.startsWith(name) && from <= car.year && car.year <= to,
  );
}

export interface YearPhotoContext {
  /** Two-word names that are models of their own, as compact strings: "corollacross". */
  separateModels: Set<string>;
  /** Where each file was taken, where the collector asked Commons. */
  places?: Map<string, FilePlace>;
  /** Each make's models, so a photo naming another is not taken: see makeLines. */
  lines?: Map<string, MakeLines>;
  /** Every make's names, as compact strings, so another make's photo is not taken. */
  makes?: string[];
}

/** A make's models, by the words that name them. */
export interface MakeLines {
  keys: Set<string>;
  /** "own|other": a model whose name has the other model's before its own. */
  together: Set<string>;
  /** The words that follow a key in the make's names ("rangerover" → sport, evoque, velar). */
  after: Map<string, Set<string>>;
  /** The bodies the make's cars of a key come in. */
  bodies: Map<string, Set<Body>>;
  /** The keys some of whose cars are not named electric. */
  fuelled: Set<string>;
}

/**
 * Each make's models, from the site's cars: their keys ("cayenne",
 * "grandcherokee"), the words that follow them, and where a model's own name
 * has another model's before its key, that pair, which names one car, not two.
 */
export function makeLines(
  cars: Pick<Car, 'make' | 'model' | 'bodyStyle'>[],
  separateModels: Set<string>,
): Map<string, MakeLines> {
  const out = new Map<string, MakeLines>();
  for (const car of cars) {
    const key = compact(modelKey(car, separateModels).join(' '));
    // A model named with its make ("Ferrari F50") does not make the make a model.
    if (!key || compact(car.make).includes(key)) continue;
    const lines = out.get(car.make) ?? {
      keys: new Set<string>(),
      together: new Set<string>(),
      after: new Map<string, Set<string>>(),
      bodies: new Map<string, Set<Body>>(),
      fuelled: new Set<string>(),
    };
    lines.keys.add(key);
    lines.bodies.set(key, (lines.bodies.get(key) ?? new Set()).add(carBody(car).body));
    if (!tokens(car.model).some((w) => w === 'ev' || w === 'electric')) lines.fuelled.add(key);
    const next = nextWord(tokens(car.model), key);
    if (next) lines.after.set(key, (lines.after.get(key) ?? new Set()).add(next));
    out.set(car.make, lines);
  }
  for (const car of cars) {
    const lines = out.get(car.make);
    const own = compact(modelKey(car, separateModels).join(' '));
    if (!lines || !own) continue;
    const name = tokens(car.model);
    const at = keySpan(name, own)?.[0] ?? 0;
    for (const other of lines.keys) {
      const span = other !== own && keySpan(name, other);
      if (span && span[0] < at) lines.together.add(`${own}|${other}`);
    }
  }
  return out;
}

export interface YearPhotoCar extends Pick<Car, 'make' | 'model' | 'year' | 'bodyStyle'> {
  /**
   * The model changed generation within a year of this one: a photo named
   * for the year may show either, so only one taken in North America will do.
   */
  changeover?: boolean;
}

/**
 * How well a file pictures the car, or undefined when it does not: another
 * year, make, model, body or version, not the outside of the car, or a car
 * sold elsewhere. Higher is better: a North American car, a front view, the
 * car's own trim words.
 */
export function scoreYearPhoto(
  file: string,
  car: YearPhotoCar,
  context: YearPhotoContext,
): number | undefined {
  const fit = carFit(file, car, context);
  if (fit === undefined) return undefined;
  const market = photoMarket(file, context.places?.get(file));
  if (market === 'other') return undefined;
  if ((car.changeover || differsAbroad(car)) && market !== 'na') return undefined;
  return fit + (market === 'na' ? 4 : 0);
}

/**
 * Whether a file could picture the car, before where it was taken is known:
 * the collector asks Commons where only for these.
 */
export function fitsCar(file: string, car: YearPhotoCar, context: YearPhotoContext): boolean {
  return carFit(file, car, context) !== undefined;
}

/** How well a file's name fits the car, or undefined when it is not the car. */
function carFit(file: string, car: YearPhotoCar, context: YearPhotoContext): number | undefined {
  if (!/\.(?:jpe?g|png|webp)$/i.test(file) || !namedForYear(file, car.year)) return undefined;
  // "Carrera Cabriolet, Carrera 4S Cabriolet, and Carrera 4": three cars.
  if (TWO_CARS.test(fileCaption(file)) || MORE_CARS.test(fileCaption(file))) return undefined;
  const name = tokens(fileCaption(file));
  const nameCompact = name.join('');
  if (!makeNames(car.make).some((m) => nameCompact.includes(compact(m)))) return undefined;

  const key = modelKey(car, context.separateModels);
  if (!key.length) return undefined;
  const keyCompact = compact(key.join(' '));
  const span = keySpan(name, keyCompact);
  if (!span) return undefined;
  const [start, after] = span;
  // "Corolla Cross" for a Corolla: the next word makes another model.
  const next = name[after];
  if (next && key.length === 1 && context.separateModels.has(`${keyCompact}${next}`)) {
    return undefined;
  }

  // "Grand Cherokee" for a Cherokee, "Grand Caravan" for a Caravan.
  const before = name[start - 1];
  if (key.length === 1 && before && TWO_WORD_FIRSTS.has(before)) {
    if (!tokens(car.model).includes(before)) return undefined;
  }

  // The make's words are the car's own too: a Polestar 2 is a Polestar.
  const own = new Set([...tokens(car.model), ...tokens(key.join(' ')), ...tokens(car.make)]);
  if (name.some((w) => NOT_THE_CAR.has(w) && !own.has(w))) return undefined;
  // The car's own variant, however written: "GTR" for a GT-R.
  const ownName = compact(car.model);
  const isElectric = (w: string) => w === 'ev' || w === 'electric';
  const ownVariant = (w: string) =>
    own.has(w) ||
    (w.length >= 3 && ownName.includes(w)) ||
    (isElectric(w) && [...own].some(isElectric));
  if (name.some((w) => VARIANTS.has(w) && !ownVariant(w))) return undefined;
  // A heavy-duty truck however written: "C2500HD", "K3500".
  if (name.some((w) => /^[ck]?[2-5]500(?:hd)?$/.test(w) && !own.has(w))) return undefined;
  if ((MAKE_VARIANTS[car.make] ?? []).some((w) => name.includes(w) !== own.has(w))) {
    return undefined;
  }
  // Two doors or four: a five-door Mini is not the two-door.
  const carDoors = doors(car.model);
  const fileDoors = doors(fileCaption(file));
  if (carDoors && fileDoors && carDoors !== fileDoors) return undefined;
  // A car named as a variant needs a photo of it: a Trackhawk is not any Grand Cherokee.
  for (const word of own) {
    if (VARIANTS.has(word) && !LOOKS_THE_SAME.has(word) && !nameCompact.includes(word)) {
      return undefined;
    }
  }
  // An electric version of a model that also burns fuel looks its own: a Soul EV's grille.
  const electric = (words: Set<string> | string[]) => [...words].some(isElectric);
  if (electric(own) && context.lines?.get(car.make)?.fuelled.has(keyCompact) && !electric(name)) {
    return undefined;
  }
  // Another length, size or drive, by number: a Defender 110 is not a Defender 90, a
  // Carrera 4S not a Carrera 2 S.
  const ownTokens = tokens(car.model);
  const ownNumber = ownTokens[keyAt(ownTokens, keyCompact)];
  const fileNumber = name[after];
  const leading = (word: string | undefined) => /^(\d+)[a-z]*$/.exec(word ?? '')?.[1];
  const [ownSize, fileSize] = [leading(ownNumber), leading(fileNumber)];
  if (ownSize && fileSize && ownSize !== fileSize) return undefined;
  // Another make's car, badged as this one: "Suzuki Swift+ (with Chevrolet Aveo badges)".
  if (context.makes) {
    const ownMake = makeNames(car.make).map(compact);
    const firstOwn = Math.min(
      ...ownMake.map((m) => keySpan(name, m)?.[0] ?? Infinity),
      ...ownMake.map((m) => (nameCompact.includes(m) ? name.length : Infinity)),
    );
    for (const make of context.makes) {
      if (ownMake.includes(make) || ownMake.some((m) => m.includes(make))) continue;
      if (!nameCompact.includes(make)) continue;
      const at = keySpan(name, make);
      if (at && at[0] < firstOwn) return undefined;
    }
  }
  for (const word of OWN_LINES) if (own.has(word) && !name.includes(word)) return undefined;
  for (const word of SUBLINES) {
    // Either way round, but a photo's "Sport" is as often a trim ("Crosstrek Sport").
    if (own.has(word) ? !name.includes(word) : word !== 'sport' && name.includes(word)) {
      return undefined;
    }
  }
  const caption = fileCaption(file).toLowerCase();
  const ownModel = car.model.toLowerCase();
  const plain = caption.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (NOT_THE_CAR_PHRASES.some((p) => plain.includes(p))) return undefined;
  const phrases = [...VARIANT_PHRASES, ...(MAKE_PHRASES[car.make] ?? [])];
  if (phrases.some((p) => caption.includes(p) !== ownModel.includes(p))) return undefined;

  const lines = context.lines?.get(car.make);
  if (lines) {
    // Another line of the model: a Range Rover Sport for a Range Rover.
    const next = nextWord(name, keyCompact);
    if (next && lines.after.get(keyCompact)?.has(next) && !own.has(next)) return undefined;
    // Another of the make's models before it: a Cayenne Turbo for a 911 Turbo, an
    // EcoSport Freestyle for a Freestyle. (After it, it is a trim: a Ranger Edge.)
    const ownCompact = compact(car.model);
    for (const other of lines.keys) {
      if (other === keyCompact || /^\d+$/.test(other) || other.length < 2) continue;
      if (ownCompact.includes(other) || lines.together.has(`${keyCompact}|${other}`)) continue;
      if (!nameCompact.includes(other)) continue;
      const at = keySpan(name, other);
      if (at && at[0] < start) return undefined;
    }
  }

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
  } else if (
    ((body === 'coupe' && fileDoors !== 2) ||
      (body === 'hatch' && !/\b[35] ?-?(?:dr|doors?)\b/i.test(fileCaption(file)))) &&
    context.lines?.get(car.make)?.bodies.get(keyCompact)?.has('sedan')
  ) {
    // So is a coupe or hatchback of a model that is also a sedan (an M3, a Civic).
    return undefined;
  }

  if (name.includes('front')) score += 3;
  if (name.includes('side') || name.includes('profile')) score += 1;
  const trims = tokens(car.model).filter((w) => !key.some((k) => compact(k) === w) && w.length > 1);
  score += Math.min(3, trims.filter((w) => name.includes(w)).length);
  return score;
}

/** The best file for the car among those named for its year, or undefined. */
export function chooseYearPhoto(
  files: string[],
  car: YearPhotoCar,
  context: YearPhotoContext,
): string | undefined {
  let best: { file: string; score: number } | undefined;
  for (const file of files) {
    const score = scoreYearPhoto(file, car, context);
    if (score !== undefined && (!best || score > best.score)) best = { file, score };
  }
  return best?.file;
}
