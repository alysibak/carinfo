import { LATEST_FULL_MODEL_YEAR } from '../config/model-years.js';
import type { ShoppingSegment } from '../types/car.types.js';
import type { CompetitiveSet } from './competitive-sets.js';

export type SortIntent = 'price' | 'fuelEconomy' | 'horsepower' | 'range' | 'safety';

/** What a free-text query asks for beyond names: years, order, gearbox, engine, seats. */
export interface QueryModifiers {
  /** The query with every phrase read here taken out. */
  text: string;
  year?: { min?: number; max?: number };
  /** "new camry": the current model years. */
  newest?: boolean;
  sortedBy?: SortIntent;
  transmission?: string[];
  cylinders?: number[];
  threeRow?: boolean;
  /** "300 mile range", "400 km range": the least EPA range asked for, in miles. */
  minRangeMiles?: number;
  /** "compact suv", "sports car", "luxury sedan": the kind of vehicle asked for. */
  vehicleClass?: VehicleClassQuery;
  /** "best", "reliable": words no data on file can measure, set aside. */
  unmeasured?: string[];
  /** "good gas mileage": an MPG order, so EVs (rated in MPGe) are left out. */
  gasMileage?: boolean;
  /** "car for snow", "winter car": all- and four-wheel drive, which EPA records. */
  snow?: boolean;
  /** "first car", "for a teenager", "student": the First car preset's limits. */
  firstCar?: boolean;
  /** "mild hybrid", "mhev", "48v": listed by their fuel, so "hybrid" alone misses them. */
  mildHybrid?: boolean;
  /** "dual clutch", "dct", "pdk": EPA's automated manuals. */
  automatedManual?: boolean;
}

export interface VehicleClassQuery {
  /** Competitive sets, any of which a car must be in. */
  sets?: CompetitiveSet[];
  /** Shopping segments, any of which a car must be in. */
  segments?: ShoppingSegment[];
  /** Luxury makes only. */
  luxury?: boolean;
  /** What was read, for the results page: "compact SUVs", "luxury sedans". */
  label: string;
}

type Size = 'subcompact' | 'small' | 'compact' | 'midsize' | 'full-size' | 'heavy-duty';
type BodyGroup = 'car' | 'suv' | 'truck' | 'van';

const SIZE_WORDS: Array<[RegExp, Size]> = [
  [/\bsub-?compact\b/, 'subcompact'],
  [/\b(?:heavy[- ]duty|3\/4[- ]ton|one[- ]ton|hd)\b(?=\s+(?:trucks?|pickups?))/, 'heavy-duty'],
  [/\bhalf[- ]ton\b/, 'full-size'],
  [/\bcompact\b(?!\s+(?:sports?|performance))/, 'compact'],
  [/\bmid[- ]?size\b/, 'midsize'],
  [/\bfull[- ]?size\b/, 'full-size'],
  // Everyday words count only before a body word: "Big Horn" is a Ram trim.
  [/\bmedium\b(?=\s+(?:cars?|sedans?|suvs?|crossovers?|trucks?|pickups?))/, 'midsize'],
  [
    /\b(?:large|big)\b(?=\s+(?:cars?|sedans?|suvs?|crossovers?|trucks?|pickups?|vans?))/,
    'full-size',
  ],
  [/\bsmall\b(?=\s+(?:cars?|sedans?|hatch\w*|suvs?|crossovers?|trucks?|pickups?|vans?))/, 'small'],
];

/**
 * Sets by size and body, mainstream then luxury: "compact car" means a Civic,
 * "luxury compact car" an A4.
 */
const SIZE_SETS: Record<Size, Partial<Record<BodyGroup, [CompetitiveSet[], CompetitiveSet[]]>>> = {
  subcompact: {
    car: [['subcompact-car', 'small-ev'], ['entry-luxury-car']],
    suv: [['subcompact-suv'], ['subcompact-luxury-suv']],
  },
  small: {
    car: [['subcompact-car', 'compact-car', 'small-ev'], ['entry-luxury-car']],
    suv: [
      ['subcompact-suv', 'compact-suv'],
      ['subcompact-luxury-suv', 'compact-luxury-suv'],
    ],
    truck: [['compact-pickup', 'midsize-pickup'], []],
    van: [['compact-van'], []],
  },
  compact: {
    car: [['compact-car', 'small-ev'], ['entry-luxury-car']],
    suv: [['compact-suv'], ['compact-luxury-suv']],
    truck: [['compact-pickup', 'midsize-pickup'], []],
    van: [['compact-van'], []],
  },
  midsize: {
    car: [['midsize-car'], ['midsize-luxury-car']],
    suv: [['midsize-suv', 'three-row-suv'], ['midsize-luxury-suv']],
    truck: [['midsize-pickup'], []],
  },
  'full-size': {
    car: [['large-car'], ['flagship-sedan']],
    suv: [['full-size-suv'], ['full-size-luxury-suv']],
    truck: [['full-size-pickup', 'ev-pickup'], []],
    van: [['full-size-van'], []],
  },
  'heavy-duty': { truck: [['heavy-duty-pickup'], []] },
};

const BODY_GROUPS: Array<[RegExp, BodyGroup, string]> = [
  [/^(?:cars?|autos?)$/, 'car', 'cars'],
  [/^sedans?$/, 'car', 'sedans'],
  [/^hatch(?:back)?(?:e?s)?$/, 'car', 'hatchbacks'],
  [/^(?:suvs?|crossovers?|cuvs?)$/, 'suv', 'SUVs'],
  [/^(?:trucks?|pickups?|pick-ups?)$/, 'truck', 'pickups'],
  [/^(?:vans?|minivans?)$/, 'van', 'vans'],
];

/** Kinds of vehicle named outright. Each takes its whole phrase. */
const CLASS_PHRASES: Array<[RegExp, Omit<VehicleClassQuery, 'luxury'>]> = [
  [/\bmuscle cars?\b/, { segments: ['muscle'], label: 'muscle cars' }],
  [/\bpony cars?\b/, { sets: ['pony-car'], label: 'pony cars' }],
  [
    /\b(?:supercars?|super cars?|hypercars?|exotic cars?|exotics?)\b/,
    { segments: ['supercar'], label: 'supercars' },
  ],
  [/\bhot hatch(?:back)?(?:e?s)?\b/, { segments: ['hot-hatch'], label: 'hot hatches' }],
  [
    /\b(?:sports?|sporty|performance) sedans?\b/,
    { segments: ['sport-sedan'], label: 'sport sedans' },
  ],
  [/\bsport compacts?\b/, { sets: ['sport-compact'], label: 'sport compacts' }],
  // Not "Sport Coupe", a Camaro trim.
  [
    /\b(?:sports|sporty) (?:cars?|coupes?)\b|\bsport cars?\b|\bsportscars?\b/,
    { segments: ['sports-car', 'supercar', 'muscle'], label: 'sports cars' },
  ],
  [/\b(?:grand tourers?|gt cars?)\b/, { sets: ['grand-tourer'], label: 'grand tourers' }],
  [/\boff[- ]?road(?:ers?|ing)?\b/, { sets: ['off-roader'], label: 'off-roaders' }],
  [
    /\b(?:economy|commuter|city) cars?\b/,
    { sets: ['subcompact-car', 'compact-car', 'small-ev'], label: 'economy cars' },
  ],
];

/** Every luxury car set: sedans, coupes and convertibles, not SUVs. */
const LUXURY_CAR_SETS: CompetitiveSet[] = [
  'entry-luxury-car',
  'midsize-luxury-car',
  'flagship-sedan',
  'grand-tourer',
  'premium-sports-car',
  'supercar',
  'ev-sedan',
];

/** Family vehicles by body, mainstream then luxury. */
const FAMILY_SETS: Record<BodyGroup | 'any', [CompetitiveSet[], CompetitiveSet[]]> = {
  car: [
    ['midsize-car', 'large-car'],
    ['midsize-luxury-car', 'flagship-sedan'],
  ],
  suv: [
    ['three-row-suv', 'midsize-suv'],
    ['midsize-luxury-suv', 'full-size-luxury-suv'],
  ],
  truck: [['full-size-pickup'], []],
  van: [['minivan'], ['minivan']],
  any: [
    ['three-row-suv', 'midsize-suv', 'minivan', 'midsize-car'],
    ['midsize-luxury-suv', 'full-size-luxury-suv', 'midsize-luxury-car'],
  ],
};

/**
 * Read the kind of vehicle a query names: a size with a body ("compact suv",
 * "midsize truck", "full size sedan"), a segment ("sports car", "muscle car",
 * "supercar", "hot hatch") or "luxury". Body words stay in the text for the
 * body-style filter; the size word and the phrase are taken out. Searches for
 * "compact suv" or "sports car" matched no name and showed nothing, or cars
 * with "Sport" in their trim.
 */
function readVehicleClass(text: string): { text: string; vehicleClass?: VehicleClassQuery } {
  let rest = text;
  let luxury = false;
  // Not "premium": it is a trim (Outback Premium, Audi Premium Plus).
  const luxuryHit = /\bluxury\b/.exec(rest);
  if (luxuryHit) {
    luxury = true;
    rest = rest.replace(luxuryHit[0], ' ');
  }

  for (const [re, found] of CLASS_PHRASES) {
    const hit = re.exec(rest);
    if (!hit) continue;
    rest = rest.replace(hit[0], ' ');
    return {
      text: rest,
      vehicleClass: {
        ...found,
        ...(luxury ? { luxury, label: `luxury ${found.label}` } : {}),
      },
    };
  }

  // "family suv", "suv for family", "family car": with the body wherever it
  // stands, which stays for the body filter ("car" goes: it says nothing more).
  const family = /\bfamily\b/.exec(rest);
  if (family) {
    const words = rest.replace(family[0], ' ').trim().split(/\s+/);
    const body = BODY_GROUPS.find(([word]) => words.some((w) => word.test(w)));
    const sets = FAMILY_SETS[body ? body[1] : 'any'][luxury ? 1 : 0];
    rest = rest.replace(family[0], ' ').replace(/\b(?:cars?|autos?)\b/, ' ');
    return {
      text: rest,
      vehicleClass: {
        sets,
        ...(luxury ? { luxury } : {}),
        label: `${luxury ? 'luxury ' : ''}family ${body ? body[2] : 'vehicles'}`,
      },
    };
  }

  for (const [re, size] of SIZE_WORDS) {
    const hit = re.exec(rest);
    if (!hit) continue;
    const after =
      rest
        .slice(hit.index + hit[0].length)
        .trim()
        .split(/\s+/)[0] ?? '';
    const body = BODY_GROUPS.find(([word]) => word.test(after));
    const bySize = SIZE_SETS[size];
    const pick = (pair?: [CompetitiveSet[], CompetitiveSet[]]) => pair?.[luxury ? 1 : 0] ?? [];
    const sets = body
      ? pick(bySize[body[1]])
      : [...new Set(Object.values(bySize).flatMap((pair) => pick(pair)))];
    if (!sets.length) continue;
    // "compact car": "car" says nothing more once the size is read.
    let end = hit.index + hit[0].length;
    if (body && /^(?:cars?|autos?)$/.test(after)) end += /^\s*\S+/.exec(rest.slice(end))![0].length;
    rest = `${rest.slice(0, hit.index)} ${rest.slice(end)}`;
    const noun = body ? body[2] : 'vehicles';
    return {
      text: rest,
      vehicleClass: {
        sets,
        ...(luxury ? { luxury } : {}),
        label: `${luxury ? 'luxury ' : ''}${size} ${noun}`,
      },
    };
  }

  if (luxury) {
    const words = rest.trim().split(/\s+/);
    const body = BODY_GROUPS.find(([word]) => words.some((w) => word.test(w)));
    // "luxury car" means a car: "car" is a filler word, so the body filter
    // never saw it, and a Range Rover Evoque led the results.
    const carWord = body && /^(?:cars?|autos?)$/.test(words.find((w) => body[0].test(w)) ?? '');
    return {
      text: rest,
      vehicleClass: {
        ...(carWord ? { sets: LUXURY_CAR_SETS } : {}),
        luxury,
        label: `luxury ${body ? body[2] : 'vehicles'}`,
      },
    };
  }
  return { text };
}

const YEAR = '((?:19|20)\\d{2})';

/** Year phrases, most specific first. Each returns the range it reads. */
const YEAR_PHRASES: Array<[RegExp, (a: number, b?: number) => { min?: number; max?: number }]> = [
  // "2015-2018", "2015 to 2018", "between 2015 and 2018"
  [
    new RegExp(`(?:between\\s+)?${YEAR}\\s*(?:-|–|to|through|thru|and)\\s*${YEAR}`),
    (a, b) => ({ min: Math.min(a, b!), max: Math.max(a, b!) }),
  ],
  // "2015+", "2015 or newer", "since 2015", "from 2015"
  [new RegExp(`${YEAR}\\s*\\+`), (a) => ({ min: a })],
  [new RegExp(`${YEAR}\\s+(?:or|and)\\s+(?:newer|later|up|above)`), (a) => ({ min: a })],
  [new RegExp(`(?:since|from)\\s+${YEAR}`), (a) => ({ min: a })],
  [new RegExp(`(?:after|newer than)\\s+${YEAR}`), (a) => ({ min: a + 1 })],
  // "before 2015", "older than 2015", "2015 or older"
  [new RegExp(`(?:before|older than)\\s+${YEAR}`), (a) => ({ max: a - 1 })],
  [new RegExp(`${YEAR}\\s+(?:or|and)\\s+(?:older|earlier|below)`), (a) => ({ max: a })],
];

const SORT_PHRASES: Array<[RegExp, SortIntent]> = [
  [
    /\b(?:most fuel[- ]efficient|fuel[- ]efficient|most efficient|(?:best|good|great|high|better) (?:mpg|gas mileage|mileage|fuel economy)|high mpg|(?:good|easy|great|light) on (?:gas|fuel)|gas mileage|fuel economy|gas saver|economical|efficient)\b/,
    'fuelEconomy',
  ],
  // Not "fast charging": no charging speeds are on file.
  [/\b(?:fastest|quickest|most powerful|powerful|fast|quick)\b(?!\s+charg)/, 'horsepower'],
  [/\b(?:longest|most|best|max(?:imum)?) (?:driving )?range\b/, 'range'],
  [/\b(?:safest|safe|(?:best|highest|top) safety(?: rating)?)\b/, 'safety'],
];

/**
 * Words about one car for sale, not a model: "like new civic" was read as
 * "new" and showed only this year's Civic.
 */
const LISTING_WORDS =
  /\b(?:like[- ]new|low (?:mileage|miles|kms?|kilomet(?:re|er)s)|(?:one|single)[- ]owner|accident[- ]free|no accidents?|clean (?:title|carfax|history)|mint|(?:excellent|good|great|mint) condition|well[- ]maintained|garage[- ]kept)\b/g;

/**
 * Words that ask for a judgement no data on file can make, and words about
 * who will drive: "first car for a teenager" found nothing, "teenager" being
 * read as a name.
 */
const UNMEASURED =
  /\b(?:best|good|great|top|reliable|dependable|quality|nice|decent|perfect|ideal|recommended|popular|comfortable|fun|cool|first|beginner|starter|tow|towing|haul|hauling|seniors?|elderly|kids?|son|daughter|wife|husband|mom|dad|girlfriend|boyfriend|grand(?:ma|pa|mother|father))\b/g;

/**
 * A first car, or a car for someone learning: "good first car for a teenager"
 * listed every car newest first, a Lotus Emira at the top.
 */
const FIRST_CAR_WORDS =
  /\b(?:first|starter|beginner)\s+(?:cars?|vehicles?)\b|\bteen(?:ager)?s?\b|\b(?:new|young|student|learner)\s+drivers?\b|\bstudents?\b|\bcollege\b/g;

/**
 * Equipment, which no source on file records (EPA and NHTSA describe the
 * powertrain and crash tests): "suv with sunroof" or "car with apple carplay"
 * found nothing at all. Set aside and named instead.
 */
const EQUIPMENT =
  /\b(?:apple carplay|carplay|android auto|(?:panoramic |pano )?(?:sun|moon)roof|panoramic roof|(?:heated|cooled|ventilated|leather|power|memory|massage) seats?|heated (?:steering )?wheel|leather|navigation|nav|gps|(?:backup|back-up|rear(?:view)?|360|surround[- ]view) cameras?|remote start|keyless(?: entry| start)?|push[- ]button start|(?:adaptive )?cruise control|adaptive cruise|lane (?:keep(?:ing)?|departure) (?:assist|warning)|lane assist|blind[- ]spot(?: monitoring| monitor| warning)?|(?:automatic )?emergency braking|bluetooth|wireless charging|premium (?:sound|audio)|bose|harman kardon|tow(?:ing)? (?:package|hitch)|trailer hitch)\b/g;

/** "car for snow", "good in winter": the drive, the one thing EPA records that helps. */
const SNOW = /\b(?:snowy?|winters?|icy|ice)\b/g;
/**
 * Words that carry no search meaning: "best suv for family" read "for" as a
 * prefix of Ford and showed only Fords. Not "and" or "to": "Town and
 * Country", "up to 30k".
 */
const STOP_WORDS =
  /\b(?:for|with|the|a|an|of|in|on|my|me|i|is|are|that|which|what|can|could|should|buy|get|sale|near|deals?|please|want|need|looking|find|show|most|least|more|very|really|super|pretty|quite|highly|extremely)\b/g;
/**
 * Stop words that begin a model name when its number follows: "is 350" is a
 * Lexus IS 350 (the query read "350" and found a 350Z), "i 4" a BMW i4,
 * "i 35" an Infiniti I35, "a 220" a Mercedes A220.
 */
const MODEL_CODE_AFTER: Record<string, RegExp> = {
  is: /^\s+(?:\d{3}[a-z]?|f)\b/,
  i: /^\s+(?:\d{1,2}|x)\b/,
  a: /^\s+\d{3}\b/,
};

const TRANSMISSION_PHRASES: Array<[RegExp, string[]]> = [
  [
    /\b(?:stick ?shift|stick|(?:\d|six|five)[- ]speed manual|manual transmission|manual)\b/,
    ['manual'],
  ],
  [/\b(?:automatic transmission|automatic)\b/, ['automatic', 'cvt']],
  [/\bcvt\b/, ['cvt']],
];

const CYLINDER_PHRASES: Array<[RegExp, number]> = [
  // Not "i4": that is BMW's electric sedan.
  [/\b(?:4|four)[- ]?cyl(?:inder)?s?\b/, 4],
  [/\b(?:6|six)[- ]?cyl(?:inder)?s?\b|\b(?:v6|inline[- ]?6|inline six)\b/, 6],
  [/\b(?:8|eight)[- ]?cyl(?:inder)?s?\b|\bv8\b/, 8],
  [/\bv10\b/, 10],
  [/\bv12\b/, 12],
];

const THREE_ROW_PHRASE =
  /\b(?:third[- ]row|3rd[- ]row|3[- ]row|three[- ]row|[78][- ]?seat(?:er|s)?|[78][- ]passenger|seven[- ]seat(?:er|s)?|eight[- ]seat(?:er|s)?)\b/;

/** Words that say nothing EPA records: every listing is a model, new or used, and a car. */
const FILLER = /\b(?:used|pre-?owned|second[- ]hand|certified|cars?|vehicles?|automobiles?)\b/g;
/** "New" names a model in a few places. */
const NEW_IN_NAME = /\bnew (?:beetle|yorker|range rover)\b/;

/**
 * Read years, order, gearbox, engine and seating out of a query and return
 * the rest. "2015-2018 accord", "used civic", "new camry", "most fuel
 * efficient suv", "stick shift sedan", "v8 truck" and "third row suv" all
 * found nothing, or the wrong years, because only names and single years
 * were read.
 */
export function extractQueryModifiers(
  raw: string,
  options: { classes?: boolean } = {},
): QueryModifiers {
  let text = ` ${raw.toLowerCase()} `;
  const out: Omit<QueryModifiers, 'text'> = {};
  const take = (re: RegExp) => {
    const hit = re.exec(text);
    if (hit) text = text.replace(hit[0], ' ');
    return hit;
  };

  for (const [re, read] of YEAR_PHRASES) {
    const hit = take(re);
    if (hit) {
      out.year = read(Number(hit[1]), hit[2] ? Number(hit[2]) : undefined);
      break;
    }
  }

  // Before the filler words go: "sports car" and "compact car" need their "car".
  if (options.classes !== false) {
    const classRead = readVehicleClass(text);
    text = classRead.text;
    if (classRead.vehicleClass) out.vehicleClass = classRead.vehicleClass;
  }

  // Before "hybrid" is read as a fuel.
  if (take(/\b(?:mild[- ]hybrids?|mhev|48[- ]?v(?:olt)?|etorque|e-?assist|eq ?boost)\b/)) {
    out.mildHybrid = true;
  }
  // Before the filler words go: "first car" needs its "car".
  if (text.match(FIRST_CAR_WORDS)) {
    out.firstCar = true;
    text = text.replace(FIRST_CAR_WORDS, ' ');
  }
  text = text.replace(FILLER, ' ');
  const listing = text.match(LISTING_WORDS) ?? [];
  text = text.replace(LISTING_WORDS, ' ');
  if (!NEW_IN_NAME.test(text) && take(/\b(?:brand new|newest|latest|new)\b/)) {
    out.newest = true;
    if (!out.year) out.year = { min: LATEST_FULL_MODEL_YEAR };
  }

  const charging = take(/\b(?:fast|quick|rapid|dc) charg(?:ing|er|e)\b/);
  for (const [re, intent] of SORT_PHRASES) {
    const hit = take(re);
    if (hit) {
      out.sortedBy = intent;
      // "gas mileage", "good on gas", "mpg": the shopper counts gallons.
      if (intent === 'fuelEconomy' && /gas|mpg|mileage|fuel economy/.test(hit[0])) {
        out.gasMileage = true;
      }
      break;
    }
  }
  if (text.match(SNOW)) {
    out.snow = true;
    text = text.replace(SNOW, ' ');
  }
  // After the sort phrases, which use "best" ("best mpg"), and the class
  // phrases, which use "for" nowhere but keep "family".
  const equipment = text.match(EQUIPMENT) ?? [];
  text = text.replace(EQUIPMENT, ' ');
  const unmeasured = [
    ...listing,
    ...equipment,
    ...(charging ? ['fast charging'] : []),
    ...(text.match(UNMEASURED) ?? []),
  ];
  if (unmeasured.length) {
    out.unmeasured = [...new Set(unmeasured)];
    text = text.replace(UNMEASURED, ' ');
  }
  // Before "manual" is read as a gearbox: "automated manual" is not one.
  if (take(/\b(?:dual[- ]clutch|dct|dsg|pdk|s[- ]tronic|automated manual)\b/)) {
    out.automatedManual = true;
  }
  for (const [re, types] of TRANSMISSION_PHRASES) {
    if (take(re)) {
      out.transmission = types;
      break;
    }
  }
  const cylinders = CYLINDER_PHRASES.filter(([re]) => take(re)).map(([, n]) => n);
  if (cylinders.length) out.cylinders = cylinders;
  if (take(THREE_ROW_PHRASE)) out.threeRow = true;
  // "300 mile range", "with 300+ miles of range", "400 km range", "range over 300 miles"
  const range = take(
    /\b(?:(?:with|range|over|at least|of)\s+)*(\d{2,4})\s*\+?\s*(mi|miles?|km|kilomet(?:re|er)s?)\b(?:\s+(?:of\s+)?range)?/,
  );
  if (range) {
    const km = /^k/.test(range[2]);
    out.minRangeMiles = Math.round(Number(range[1]) / (km ? 1.609 : 1));
  }

  // Last, so a number the phrases above took ("i 4 cylinder", "a 300 mile
  // range") cannot keep its stop word as a model code.
  text = text.replace(STOP_WORDS, (word: string, at: number, whole: string) =>
    MODEL_CODE_AFTER[word]?.test(whole.slice(at + word.length)) ? word : ' ',
  );
  // An "and" left at either end once phrases are gone ("suv with sunroof and
  // navigation"); "Town and Country" keeps its own.
  text = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:and|&)\s+|\s+(?:and|&)$/g, '');
  if (text === 'and' || text === '&') text = '';
  return { text: text.replace(/\s+/g, ' ').trim(), ...out };
}
