import { LATEST_FULL_MODEL_YEAR } from '../config/model-years.js';
import type { ShoppingSegment } from '../types/car.types.js';
import type { CompetitiveSet } from './competitive-sets.js';
import type { EngineFamilyId } from './engine-families.js';
import type { EnginePosition } from './engine-position.js';

export type SortIntent =
  'price' | 'fuelEconomy' | 'horsepower' | 'range' | 'safety' | 'runningCost';

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
  /** "5 seater", "two row": models sold with a third row left out. */
  twoRow?: boolean;
  /** "2 seater", "two-seat": EPA's two-seater class. */
  twoSeater?: boolean;
  /** "2 door", "four-door": the doors asked for. */
  doors?: number;
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
  /** "over 30 mpg", "under 7 l/100km", "40 mpg highway": an EPA rating, in the unit asked. */
  fuelEconomy?: FuelEconomyBound;
  /** "over 300 hp", "300+ horsepower", "under 200 hp". */
  horsepower?: { min?: number; max?: number };
  /** "boxer", "straight six", "rotary", "w12": layouts as utils/engine-layout.ts names them. */
  layouts?: string[];
  /** "f150 5.0", "2.0t": an engine size in litres. */
  engineSize?: number;
  /** "hemi", "ecoboost", "duramax": an engine family (utils/engine-families.ts). */
  engineFamily?: EngineFamilyId;
  /** "mid engine", "rear-engined": where the engine sits (utils/engine-position.ts). */
  enginePosition?: EnginePosition;
}

export type FuelEconomyUnit = 'MPG' | 'MPGe' | 'L/100 km';

export interface FuelEconomyBound {
  min?: number;
  max?: number;
  unit: FuelEconomyUnit;
  /** The city or highway rating; combined when absent. */
  basis?: 'city' | 'highway';
}

export interface VehicleClassQuery {
  /** Competitive sets, any of which a car must be in. */
  sets?: CompetitiveSet[];
  /** Shopping segments, any of which a car must be in. */
  segments?: ShoppingSegment[];
  /** Luxury makes only. */
  luxury?: boolean;
  /** Drives kept, where the kind of car implies one ("drift car"). */
  drive?: string[];
  /** An order the kind of car implies, where the query gives none ("car for uber"). */
  sortedBy?: SortIntent;
  /** What the phrase asked that nothing on file measures ("tow vehicle": towing capacity). */
  unmeasured?: string;
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
  // Cars bought to drive: "track car" found the Chevrolet Tracker, "fun to
  // drive" a Cherokee "Active Drive II", and "drift car" nothing.
  [
    /\bdrift(?:ing)?(?: cars?| machines?)?\b/,
    {
      segments: ['sports-car', 'muscle', 'supercar'],
      drive: ['RWD'],
      label: 'rear-drive sports cars',
    },
  ],
  [
    /\b(?:track(?:[- ]day)?|autocross|weekend|enthusiast'?s?'?|driver'?s?'?) cars?\b|\btrack toys?\b|\bfun[- ]to[- ]drive(?: cars?)?\b|\bfun cars?\b/,
    {
      segments: ['sports-car', 'hot-hatch', 'sport-compact', 'muscle', 'supercar'],
      label: 'sports cars and hot hatches',
    },
  ],
  // No towing capacity is on file; pickups and body-on-frame SUVs tow.
  [
    /\b(?:tow(?:ing)?|haul(?:ing)?|trailer) (?:vehicles?|rigs?|cars?|machines?)\b|\b(?:to|for) (?:tow(?:ing)?|haul(?:ing)?)\b/,
    {
      sets: ['midsize-pickup', 'full-size-pickup', 'heavy-duty-pickup', 'full-size-suv'],
      unmeasured: 'towing capacity',
      label: 'pickups and full-size SUVs',
    },
  ],
  // Ride-hailing: "car for uber" fuzzy-matched a Saleen "Supercharged" F-150.
  [
    /\b(?:uber|lyft|ride[- ]?shar(?:e|ing)|ride[- ]?hail(?:ing)?|taxis?)\b/,
    {
      sets: [
        'subcompact-car',
        'compact-car',
        'midsize-car',
        'large-car',
        'small-ev',
        'ev-sedan',
        'subcompact-suv',
        'compact-suv',
        'midsize-suv',
        'three-row-suv',
        'ev-suv',
        'minivan',
      ],
      sortedBy: 'runningCost',
      label: 'sedans, hatchbacks, SUVs and minivans for ride-hailing',
    },
  ],
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
    /\b(?:economy|commuter|city) cars?\b|\b(?:long |daily )?commut(?:ing|es?|er)\b/,
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
  // Before "cheap" is read as the lowest price: "cheap to run" is not "cheap".
  [
    /\b(?:(?:cheap(?:est)?|inexpensive|affordable|less expensive|least expensive) to (?:own|run|keep|maintain|insure|operate)|low(?:est)? (?:running|ownership|operating|maintenance) costs?|low(?:est)? cost (?:of|to) (?:ownership|own|run)|cheap(?:est)? (?:insurance|maintenance)|low(?:est)? (?:insurance|maintenance))\b/,
    'runningCost',
  ],
  [
    /\b(?:most fuel[- ]efficient|fuel[- ]efficient|most efficient|(?:best|good|great|high|better) (?:mpg|gas mileage|mileage|fuel economy)|high mpg|(?:good|easy|great|light) on (?:gas|fuel)|gas mileage|fuel economy|gas saver|economical|efficient|(?:low(?:est)?|best|good) (?:fuel |gas )?consumption)\b/,
    'fuelEconomy',
  ],
  // Not "fast charging": no charging speeds are on file.
  [
    /\b(?:fastest|quickest|most powerful|powerful|fast|quick|(?:most|highest|high|best|top|max(?:imum)?|lots of) (?:horsepower|hp|power))\b(?!\s+charg)/,
    'horsepower',
  ],
  [/\b(?:longest|most|best|max(?:imum)?) (?:driving )?range\b/, 'range'],
  [/\b(?:safest|safe|(?:best|highest|top) safety(?: rating)?)\b/, 'safety'],
  // A unit alone asks for the figure: "civic mpg", "mustang horsepower".
  [/\b(?:mpg|l\/100 ?km)(?=\s)/, 'fuelEconomy'],
  [/\b(?:horsepower|hp)\b/, 'horsepower'],
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
  /\b(?:best|good|great|top|reliable|dependable|quality|nice|decent|perfect|ideal|recommended|popular|comfortable|fun|cool|first|beginner|starter|tow|towing|haul|hauling|seniors?|elderly|kids?|son|daughter|wife|husband|mom|dad|girlfriend|boyfriend|grand(?:ma|pa|mother|father)|roomy|spacious|cargo space|cargo room|(?:big|large|huge|roomy|spacious) (?:trunk|boot)s?|trunk space|legroom|headroom|dogs?|pets?|(?:tall|short|big) (?:people|persons?|drivers?|guys?)|road[- ]?trips?|long drives?|highway driving|deliver(?:y|ies|ing)|work(?= (?:trucks?|vans?|pickups?)\b))\b/g;

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
  [/\b(?:3|three)[- ]?cyl(?:inder)?s?\b/, 3],
  // Not "i4": that is BMW's electric sedan.
  [/\b(?:4|four)[- ]?cyl(?:inder)?s?\b/, 4],
  [/\b(?:5|five)[- ]?cyl(?:inder)?s?\b/, 5],
  [/\b(?:6|six)[- ]?cyl(?:inder)?s?\b/, 6],
  [/\b(?:8|eight)[- ]?cyl(?:inder)?s?\b/, 8],
  [/\b(?:10|ten)[- ]?cyl(?:inder)?s?\b/, 10],
  [/\b(?:12|twelve)[- ]?cyl(?:inder)?s?\b/, 12],
];

/**
 * Layouts, as utils/engine-layout.ts derives them from the engine family.
 * Not "i4" or "i5": those are BMW's electric cars.
 */
const LAYOUT_PHRASES: Array<[RegExp, string[]]> = [
  [/\b(?:inline|straight)[- ]?(?:6|six)\b|\bi-?6\b/, ['I6']],
  [/\b(?:inline|straight)[- ]?(?:5|five)\b/, ['I5']],
  [/\b(?:inline|straight)[- ]?(?:4|four)\b/, ['I4']],
  [/\b(?:inline|straight)[- ]?(?:3|three)\b/, ['I3']],
  [/\bflat[- ]?(?:6|six)\b|\bh-?6\b/, ['Flat-6']],
  [/\bflat[- ]?(?:4|four)\b|\bh-?4\b/, ['Flat-4']],
  [/\bflat[- ]?(?:12|twelve)\b/, ['Flat-12']],
  [/\b(?:boxer|horizontally opposed)(?: engines?| motors?)?\b/, ['Flat-4', 'Flat-6']],
  [/\bvr-?6\b/, ['VR6']],
  // A "v6" was any six, so a BMW straight six led "twin turbo v6". Volkswagen's
  // narrow-angle VR6 is a V6 too; a W8 or W12 is not a V8 or V12.
  [/\bv-?6\b/, ['V6', 'VR6']],
  [/\bv-?8\b/, ['V8']],
  [/\bv-?10\b/, ['V10']],
  [/\bv-?12\b/, ['V12']],
  [/\bw-?8\b/, ['W8']],
  [/\bw-?12\b/, ['W12']],
  [/\bw-?16\b/, ['W16']],
  [/\b(?:rotary|wankel)(?: engines?| motors?)?\b/, ['Rotary']],
];

const ENGINE_FAMILY_PHRASES: Array<[RegExp, EngineFamilyId]> = [
  [/\bhemi\b/, 'hemi'],
  [/\beco-?boost\b/, 'ecoboost'],
  [/\bcoyote\b/, 'coyote'],
  [/\bpower-? ?stroke\b/, 'power-stroke'],
  [/\bduramax\b/, 'duramax'],
  [/\beco-? ?diesel\b/, 'ecodiesel'],
  [/\btdi\b/, 'tdi'],
];

/** Where the engine sits, which EPA does not record: read by model instead. */
const ENGINE_POSITION_PHRASES: Array<[RegExp, EnginePosition]> = [
  [/\bmid[- ]?engine[sd]?\b/, 'mid'],
  [/\brear[- ]?engine[sd]?\b/, 'rear'],
  [/\bfront[- ]?engine[sd]?\b/, 'front'],
];

const THREE_ROW_PHRASE =
  /\b(?:third[- ]row|3rd[- ]row|3[- ]row|three[- ]row|[78][- ]?seat(?:er|s)?|[78][- ]passengers?|(?:seven|eight)[- ]seat(?:er|s)?|(?:seven|eight)[- ]passengers?|(?:seats?|seating for|room for) (?:[78]|seven|eight)(?: (?:people|passengers|adults))?)\b/;

/** Two rows of seats: "seating for 7" asks for a third row, "5 seater" for none. */
const TWO_ROW_PHRASE =
  /\b(?:[45]|four|five)[- ]?(?:seat(?:er|s)?|passengers?)\b|\b(?:seats?|seating for|room for) (?:[45]|four|five)\b|\b(?:2|two)[- ]row\b/;

/** EPA's "Two Seaters" size class: roadsters, sports cars and city cars. */
const TWO_SEATER_PHRASE = /\b(?:2|two)[- ]?seat(?:er|s)?\b/;

const DOOR_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5 };
const DOOR_PHRASE = /\b([2-5]|two|three|four|five)[- ]?(?:doors?|dr)\b/;

/** Words that say nothing EPA records: every listing is a model, new or used, and a car. */
const FILLER = /\b(?:used|pre-?owned|second[- ]hand|certified|cars?|vehicles?|automobiles?)\b/g;
/** "New" names a model in a few places. */
const NEW_IN_NAME = /\bnew (?:beetle|yorker|range rover)\b/;

const AT_LEAST = String.raw`over|above|more than|greater than|at least|min(?:imum)?(?:\s+of)?|no less than|>=?`;
const AT_MOST = String.raw`under|below|less than|at most|max(?:imum)?(?:\s+of)?|no more than|up to|<=?`;
const OR_MORE = String.raw`or (?:more|better|higher|above|over|greater)|and (?:up|above|over|higher)|plus|minimum|min`;
const OR_LESS = String.raw`or (?:less|lower|under|below|fewer|worse)|and (?:under|below|less|lower)|maximum|max`;
const FIGURE = String.raw`\d+(?:[.,]\d+)?`;

const HORSEPOWER_UNIT = String.raw`hp|bhp|horse ?power|horses`;
const RATING_BASIS = String.raw`city|highway|hwy|combined`;
const FUEL_ECONOMY_UNITS: Array<[FuelEconomyUnit, string]> = [
  ['MPGe', String.raw`mpg-?e`],
  ['L/100 km', String.raw`(?:l|litres?|liters?)\s*(?:\/|per)\s*100\s*(?:kms?|kilomet(?:re|er)s?)?`],
  ['MPG', String.raw`mpg|miles per gallon|mi\/gal`],
];

/**
 * A figure with its unit and the words that bound it: "over 300 hp", "300+
 * hp", "300 hp or more", "hp over 300", "under 200 hp", "200 to 300 hp". A
 * bare figure is a floor ("300 hp", "40 mpg"), or a ceiling where less is
 * better ("7 l/100km"): nobody asks for exactly 300.
 */
function readFigure(
  text: string,
  unit: string,
  lessIsBetter = false,
): { hit: string; min?: number; max?: number } | undefined {
  const value = (figure: string) => Number(figure.replace(',', '.'));
  const between = new RegExp(
    String.raw`(?<=\s)(?:between\s+|from\s+)?(${FIGURE})\s*(?:-|–|to|and)\s*(${FIGURE})\s*(?:${unit})(?=\s)`,
  ).exec(text);
  if (between) {
    const [a, b] = [value(between[1]), value(between[2])];
    return { hit: between[0], min: Math.min(a, b), max: Math.max(a, b) };
  }
  const figureFirst = new RegExp(
    String.raw`(?<=\s)(?:(${AT_LEAST})|(${AT_MOST}))?\s*(${FIGURE})\s*(\+|plus)?[\s-]*(?:${unit})(?:\s+(?:(${OR_MORE})|(${OR_LESS})))?(?=\s)`,
  ).exec(text);
  if (figureFirst) {
    const figure = value(figureFirst[3]);
    const atMost = figureFirst[2] != null || figureFirst[6] != null;
    const atLeast = figureFirst[1] != null || figureFirst[4] != null || figureFirst[5] != null;
    const ceiling = atMost || (!atLeast && lessIsBetter);
    return { hit: figureFirst[0], ...(ceiling ? { max: figure } : { min: figure }) };
  }
  // "hp over 300", "mpg 40+", "mpg 40": no more than three digits without a
  // bound, or "mpg 2020 civic" read a model year as a rating.
  const unitFirst = new RegExp(
    String.raw`(?<=\s)(?:${unit})\s+(?:of\s+)?(?:(?:(${AT_LEAST})|(${AT_MOST}))\s*(${FIGURE})|(\d{1,3}(?:[.,]\d+)?))\s*(\+)?(?=\s)`,
  ).exec(text);
  if (unitFirst) {
    const figure = value(unitFirst[3] ?? unitFirst[4]);
    const ceiling = unitFirst[2] != null || (unitFirst[1] == null && !unitFirst[5] && lessIsBetter);
    return { hit: unitFirst[0], ...(ceiling ? { max: figure } : { min: figure }) };
  }
  return undefined;
}

/**
 * Figures nothing on file records, set aside by name: EPA and NHTSA publish
 * no acceleration, torque, towing or weight. "0-60 under 4 seconds" found
 * nothing, and "0 to 100 km/h" was read as a 100 km range.
 */
const UNRECORDED_FIGURES: Array<[RegExp, string]> = [
  [
    /(?<=\s)(?:(?:a|with|under|in)\s+)?0\s*(?:-|to)\s*(?:60|100)(?:\s*(?:mph|km\/?h|kph))?(?:\s+times?)?(?:\s+(?:(?:under|in|below|less than|of)\s+)?\d+(?:\.\d+)?\s*(?:s|secs?|seconds?)?)?(?=\s)/,
    '0-60 times',
  ],
  [
    new RegExp(
      String.raw`(?<=\s)(?:(?:${AT_LEAST}|${AT_MOST})\s+)?\d{2,4}\s*(?:lbs?[- ]?-?ft|pound[- ]?(?:feet|foot)|ft[- ]?lbs?|foot[- ]?pounds?|nm)(?:\s+(?:of\s+)?torque)?(?=\s)|\btorque\b`,
    ),
    'torque',
  ],
  [
    new RegExp(
      String.raw`(?<=\s)(?:(?:can\s+)?tow(?:s|ing)?(?:\s+capacity)?(?:\s+(?:of|over|at least|up to))?\s+)?(?:(?:${AT_LEAST})\s+)?\d{1,2},?\d{3}\s*(?:lbs?|pounds|kg|kilograms?)(?:\s+(?:or more|and up|\+))?(?:\s+(?:towing|trailer))?(?=\s)`,
    ),
    'towing',
  ],
  [/\b(?:light ?weight|curb weight)\b/, 'weight'],
];

interface FiguresRead {
  text: string;
  setAside: string[];
  horsepower?: { min?: number; max?: number };
  fuelEconomy?: FuelEconomyBound;
  /** "low fuel consumption" beside a figure: an order as well. */
  lowConsumption?: boolean;
}

/** Horsepower and fuel-economy figures, and those nothing on file records. */
function readFigures(padded: string): FiguresRead {
  let text = padded;
  const take = (re: RegExp) => {
    const hit = re.exec(text);
    if (hit) text = text.replace(hit[0], ' ');
    return hit;
  };
  const out: FiguresRead = { text, setAside: [] };
  for (const [re, name] of UNRECORDED_FIGURES) {
    const hit = take(re);
    if (hit) {
      out.setAside.push(
        name === '0-60 times' && /0\s*(?:-|to)\s*100/.test(hit[0]) ? '0-100 km/h times' : name,
      );
    }
  }
  const horsepower = readFigure(text, HORSEPOWER_UNIT);
  if (horsepower) {
    text = text.replace(horsepower.hit, ' ');
    out.horsepower = { min: horsepower.min, max: horsepower.max };
  }
  for (const [unit, pattern] of FUEL_ECONOMY_UNITS) {
    const withBasis = String.raw`(?:(?:${RATING_BASIS})\s+)?(?:${pattern})(?:\s+(?:${RATING_BASIS}))?`;
    const figure = readFigure(text, withBasis, unit === 'L/100 km');
    if (!figure) continue;
    text = text.replace(figure.hit, ' ');
    const basis = /\bcity\b/.test(figure.hit)
      ? 'city'
      : /\b(?:highway|hwy)\b/.test(figure.hit)
        ? 'highway'
        : undefined;
    out.fuelEconomy = { min: figure.min, max: figure.max, unit, ...(basis ? { basis } : {}) };
    // "fuel consumption under 7 l/100km": the words that name the figure go,
    // and "low fuel consumption" is an order as well.
    const naming = take(
      /\b(?:(low(?:est)?|best|good)\s+)?(?:(?:fuel|gas)\s+)?consumption(?:\s+of)?\b/,
    );
    if (naming?.[1]) out.lowConsumption = true;
    break;
  }
  out.text = text;
  return out;
}

/**
 * The query without its figures, for ranking by name: "camry over 200 hp"
 * scored "over", "200" and "hp" against model names, and a 2008 Solara
 * convertible led the V6 Camrys.
 */
/**
 * An engine size: "f150 5.0", "3.5 liter", "2.0t". A figure with a decimal
 * point, not part of a name ("x5 4.8is") or a rating ("4.5 stars").
 */
const ENGINE_SIZE = /\b([0-8]\.\d)(?:\s*(?:l|lit(?:re|er)s?)\b|(t)\b|(?![\w.]))(?!\s*stars?\b)/;

export function withoutFigures(raw: string): string {
  // The engine size too: ranked as a word, "f150 5.0" put a model named
  // "F150 5.0L 2WD FFV GVWR>7599 LBS" before every F150 Pickup.
  return readFigures(` ${raw.toLowerCase()} `)
    .text.replace(ENGINE_SIZE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  // Figures first: "between 2000 and 2500 lbs" is not a run of model years,
  // and "7 l/100 km" is not a 100 km range.
  const figures = readFigures(text);
  text = figures.text;
  const setAside = figures.setAside;
  if (figures.horsepower) out.horsepower = figures.horsepower;
  if (figures.fuelEconomy) out.fuelEconomy = figures.fuelEconomy;
  if (figures.lowConsumption) {
    out.sortedBy = 'fuelEconomy';
    out.gasMileage = true;
  }

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
    if (classRead.vehicleClass?.unmeasured) setAside.push(classRead.vehicleClass.unmeasured);
  }
  for (const [re, position] of ENGINE_POSITION_PHRASES) {
    if (take(re)) {
      out.enginePosition = position;
      break;
    }
  }

  // Before "hybrid" is read as a fuel.
  if (take(/\b(?:mild[- ]hybrids?|mhev|48[- ]?v(?:olt)?|etorque|e-?assist|eq ?boost)\b/)) {
    out.mildHybrid = true;
  }
  // Fuels named in several words, before "in" goes as a stop word: "plug in
  // hybrid suv" found only models named "Plug-in Hybrid", "fuel cell" only
  // the Tucson Fuel Cell.
  text = text
    .replace(/\bplug[- ]?in(?: electric)? hybrids?\b/g, ' phev ')
    .replace(/\bplug[- ]?ins?\b/g, ' plug-in ')
    .replace(/\bfuel[- ]cells?(?: electric)?\b/g, ' fcev ');
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
  // "cheapest suv to own": the kind of car sits inside the phrase, and stays.
  const cheapToOwn =
    /\b(?:cheap(?:est)?|inexpensive|affordable|less expensive|least expensive)\s+((?:[a-z0-9-]+\s+){1,2}?)to (?:own|run|keep|maintain|insure|operate)\b/.exec(
      text,
    );
  if (cheapToOwn) {
    out.sortedBy = 'runningCost';
    text = text.replace(cheapToOwn[0], ` ${cheapToOwn[1]} `);
  }
  for (const [re, intent] of out.sortedBy ? [] : SORT_PHRASES) {
    const hit = take(re);
    if (hit) {
      out.sortedBy = intent;
      // "gas mileage", "good on gas", "mpg": the shopper counts gallons.
      if (
        intent === 'fuelEconomy' &&
        /gas|mpg|mileage|fuel economy|consumption|l\/100/.test(hit[0])
      ) {
        out.gasMileage = true;
      }
      break;
    }
  }
  if (!out.sortedBy && out.vehicleClass?.sortedBy) out.sortedBy = out.vehicleClass.sortedBy;
  // No acceleration is on file: the most powerful cars come nearest.
  if (!out.sortedBy && setAside.some((name) => name.startsWith('0-'))) out.sortedBy = 'horsepower';
  if (text.match(SNOW)) {
    out.snow = true;
    text = text.replace(SNOW, ' ');
  }
  // After the sort phrases, which use "best" ("best mpg"), and the class
  // phrases, which use "for" nowhere but keep "family".
  const equipment = text.match(EQUIPMENT) ?? [];
  text = text.replace(EQUIPMENT, ' ');
  const unmeasured = [
    ...setAside,
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
  // Before the cylinder counts: "inline 6" is a layout, not any six.
  const layouts = LAYOUT_PHRASES.filter(([re]) => take(re)).flatMap(([, names]) => names);
  if (layouts.length) out.layouts = [...new Set(layouts)];
  for (const [re, family] of ENGINE_FAMILY_PHRASES) {
    if (take(re)) {
      out.engineFamily = family;
      break;
    }
  }
  const size = take(ENGINE_SIZE);
  if (size) {
    const litres = Number(size[1]);
    if (litres >= 0.6 && litres <= 8.4) {
      out.engineSize = litres;
      if (size[2]) text += ' turbo ';
    } else text += ` ${size[0]} `;
  }
  const cylinders = CYLINDER_PHRASES.filter(([re]) => take(re)).map(([, n]) => n);
  if (cylinders.length) out.cylinders = cylinders;
  if (take(THREE_ROW_PHRASE)) out.threeRow = true;
  else if (take(TWO_SEATER_PHRASE)) out.twoSeater = true;
  else if (take(TWO_ROW_PHRASE)) out.twoRow = true;
  const doors = take(DOOR_PHRASE);
  if (doors) out.doors = DOOR_WORDS[doors[1]] ?? Number(doors[1]);
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
