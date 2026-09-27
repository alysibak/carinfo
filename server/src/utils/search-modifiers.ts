import { LATEST_FULL_MODEL_YEAR } from '../config/model-years.js';

export type SortIntent = 'price' | 'fuelEconomy' | 'horsepower';

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
    /\b(?:most fuel[- ]efficient|fuel[- ]efficient|most efficient|best (?:mpg|gas mileage|fuel economy)|high mpg|economical|efficient)\b/,
    'fuelEconomy',
  ],
  [/\b(?:fastest|quickest|most powerful|powerful)\b/, 'horsepower'],
];

const TRANSMISSION_PHRASES: Array<[RegExp, string[]]> = [
  [
    /\b(?:stick ?shift|stick|(?:\d|six|five)[- ]speed manual|manual transmission|manual)\b/,
    ['manual'],
  ],
  [/\b(?:automatic transmission|automatic)\b/, ['automatic', 'cvt']],
  [/\bcvt\b/, ['cvt']],
];

const CYLINDER_PHRASES: Array<[RegExp, number]> = [
  [/\b(?:4|four)[- ]?cyl(?:inder)?s?\b|\bi4\b/, 4],
  [/\b(?:6|six)[- ]?cyl(?:inder)?s?\b|\b(?:v6|i6|inline[- ]?6|inline six)\b/, 6],
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
export function extractQueryModifiers(raw: string): QueryModifiers {
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

  text = text.replace(FILLER, ' ');
  if (!NEW_IN_NAME.test(text) && take(/\b(?:brand new|newest|latest|new)\b/)) {
    out.newest = true;
    if (!out.year) out.year = { min: LATEST_FULL_MODEL_YEAR };
  }

  for (const [re, intent] of SORT_PHRASES) {
    if (take(re)) {
      out.sortedBy = intent;
      break;
    }
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

  return { text: text.replace(/\s+/g, ' ').trim(), ...out };
}
