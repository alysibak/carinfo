import { readFileSync } from 'fs';
import type { Car, NhtsaRating, SafetyAvailability } from '../types/car.types.js';
import { resolveDataFile } from './data-paths.js';
import { withoutCab } from './gov-models.js';

/**
 * NHTSA rates configurations, not model lines: "2020 Toyota Camry 4 DR FWD"
 * and "2020 Toyota Camry 4 DR AWD" are separate tests with their own stars.
 * This reads the body and drivetrain from NHTSA's description of each tested
 * vehicle and picks, for one of the site's cars, the tests that describe it.
 * A car no test describes gets none: a rating from another body, drivetrain
 * or model year would be NHTSA's word on a car it never tested.
 */

/** A vehicle as NHTSA's SafetyRatings API returns it (the fields used). */
export interface NhtsaVehicle {
  VehicleId: number;
  VehicleDescription: string;
  Make: string;
  Model: string;
  ModelYear: number;
  OverallRating?: string;
  OverallFrontCrashRating?: string;
  OverallSideCrashRating?: string;
  RolloverRating?: string;
  RolloverPossibility?: number;
  NHTSAElectronicStabilityControl?: string;
  NHTSAForwardCollisionWarning?: string;
  NHTSALaneDepartureWarning?: string;
}

/** A tested vehicle with NHTSA's make, model and year, as data/nhtsa-ratings.json keeps it. */
export interface NhtsaTest extends NhtsaRating {
  make: string;
  model: string;
  year: number;
}

type Body = 'sedan' | 'coupe' | 'hatchback' | 'wagon' | 'convertible' | 'suv' | 'truck' | 'van';
type Drive = 'fwd' | 'rwd' | 'awd' | '4wd' | '2wd';

export interface TestedConfiguration {
  body?: Body;
  drive?: Drive;
  /** NHTSA names the vehicle a hybrid or electric one: "CAMRY HV", "KONA ELECTRIC". */
  electrified: boolean;
  /** The words of NHTSA's model name that tell versions apart: "yukon xl 1500" → yukon, xl, 1500. */
  name: string[];
}

const DRIVES: Record<string, Drive> = {
  fwd: 'fwd',
  rwd: 'rwd',
  awd: 'awd',
  '4wd': '4wd',
  '4x4': '4wd',
  '2wd': '2wd',
  '4x2': '2wd',
};

/** Words naming a hybrid, plug-in, electric or fuel-cell version: "CAMRY HV", "RAV4 PRIME", "SOUL EV". */
const ELECTRIFIED_WORD =
  /^(?:hybrid|hv|hev|phev|plug-?in|electric|ev|bev|energi|e-tron|prime|fcv|fcev)$/;

/**
 * The powertrain NHTSA's newest descriptions add before the drivetrain:
 * "CR-V SUV N/A FWD", "CR-V HYBRID SUV HEV AWD".
 */
const POWERTRAIN_CODE = /^(?:n\/a|ice|gas|bev|hev|phev|mhev|fcv)$/;
/** Words in NHTSA's newest model names that tell no versions apart: "CR-V ICE", "MODEL Y (All Variants)". */
const NAME_NOISE = /^(?:n\/a|ice|gas|mhev|fcv|all|variants)$/;

/** What a car's fuel says its name would, were it written out: a Prius is a hybrid. */
const FUEL_WORDS: Partial<Record<Car['engine']['fuelType'], string[]>> = {
  hybrid: ['hybrid'],
  'plug-in hybrid': ['phev', 'plugin'],
  electric: ['electric'],
  hydrogen: ['fcev'],
};

/** NHTSA's words for a powertrain, and those the site's names may use for it. */
const HYBRID = ['hybrid', 'hv', 'hev'];
const PLUG_IN = ['phev', 'plugin'];
const ELECTRIC = ['electric', 'ev', 'bev'];
const SYNONYMS: Record<string, string[]> = {
  hybrid: HYBRID,
  hv: HYBRID,
  hev: HYBRID,
  phev: PLUG_IN,
  plugin: PLUG_IN,
  electric: ELECTRIC,
  ev: ELECTRIC,
  bev: ELECTRIC,
};
/** Codes found only as words: "hev" is inside "phev", "ev" inside "chevelle". */
const CODES = new Set(['hv', 'hev', 'phev', 'ev', 'bev']);

const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * "2011 Acura MDX SUV AWD" → SUV, AWD. NHTSA's body codes: "4 DR" a sedan,
 * "2 DR" a coupe, "C" a convertible ("A5 Cabriolet C"), "3 HB"/"5 HB" a
 * hatchback, "SW" a wagon, "PU/CC", "PU/EC", "PU/RC" a pickup by cab, "PV"
 * and "CV" a passenger and a cargo van.
 */
export function testedConfiguration(vehicle: NhtsaVehicle): TestedConfiguration {
  const words = vehicle.VehicleDescription.toLowerCase()
    .replace(/\b(?:early|later) release\b/, '')
    .split(/\s+/)
    .filter(Boolean);
  const drive = DRIVES[words.at(-1) ?? ''];
  const before = words.slice(0, drive ? -1 : undefined);
  while (before.length > 1 && POWERTRAIN_CODE.test(before.at(-1)!)) before.pop();
  const last = before.at(-1) ?? '';
  const prior = before.at(-2) ?? '';
  let body: Body | undefined;
  if (last === 'suv') body = 'suv';
  else if (last.startsWith('pu/') || last === 'pickup') body = 'truck';
  else if (['van', 'pv', 'cv', 'minivan'].includes(last)) body = 'van';
  else if (last === 'sw' || last === 'wagon') body = 'wagon';
  else if (last === 'hb' || last === 'hatchback') body = 'hatchback';
  // The Veloster's "3 C": three doors, a hatch.
  else if (last === 'c') body = prior === '3' ? 'hatchback' : 'convertible';
  else if (last === 'convertible') body = 'convertible';
  else if (last === 'coupe' || last === '2dr') body = 'coupe';
  else if (last === '4dr' || last === 'sedan') body = 'sedan';
  else if (last === 'dr') {
    body =
      prior === '4'
        ? 'sedan'
        : prior === '2'
          ? 'coupe'
          : /^[35]$/.test(prior)
            ? 'hatchback'
            : undefined;
  }
  const make = compact(vehicle.Make);
  // A pickup's cabs are versions of one truck, which the site lists once.
  const modelWords = withoutCab(vehicle.Model)
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean);
  return {
    ...(body ? { body } : {}),
    ...(drive ? { drive } : {}),
    // "Silverado 1500 Hybrid PU/CC RWD": some say so only in the description.
    electrified: [...modelWords, ...vehicle.VehicleDescription.toLowerCase().split(/\s+/)].some(
      (w) => ELECTRIFIED_WORD.test(w),
    ),
    name: modelWords
      .filter((w) => !DRIVES[w] && !NAME_NOISE.test(w))
      .map(compact)
      // "MAZDA3": the make written into the name.
      .map((w) => (w.startsWith(make) && w.length > make.length ? w.slice(make.length) : w))
      .filter(Boolean),
  };
}

/**
 * The site's body, as NHTSA files it, and the bodies NHTSA may file the same
 * car under: a Kia Soul is an "SUV" to NHTSA, a Mazda5 a wagon, a GLA a "4 DR".
 * Coupes, convertibles and pickups are their own structures and take no other's.
 */
const BODY_OF: Record<Car['bodyStyle'], { own: Body; near: Body[] }> = {
  sedan: { own: 'sedan', near: ['hatchback'] },
  coupe: { own: 'coupe', near: ['hatchback'] },
  convertible: { own: 'convertible', near: [] },
  hatchback: { own: 'hatchback', near: ['sedan', 'wagon', 'suv', 'van', 'coupe'] },
  wagon: { own: 'wagon', near: ['suv', 'hatchback'] },
  suv: { own: 'suv', near: ['wagon', 'van', 'hatchback', 'sedan', 'truck'] },
  truck: { own: 'truck', near: [] },
  van: { own: 'van', near: ['suv', 'wagon'] },
  minivan: { own: 'van', near: ['suv', 'wagon'] },
};

/** NHTSA's "2WD" is a pickup's or SUV's rear- or front-wheel drive; "4WD" can be an AWD system. */
const DRIVE_OF: Record<Car['driveType'], { own: Drive; near: Drive[] }> = {
  FWD: { own: 'fwd', near: ['2wd'] },
  RWD: { own: 'rwd', near: ['2wd'] },
  AWD: { own: 'awd', near: ['4wd'] },
  '4WD': { own: '4wd', near: ['awd'] },
};

/** Those of `items` nearest by one trait: its own value, else a near one, else those without it. */
function nearest<T, V>(items: T[], valueOf: (item: T) => V | undefined, own: V, near: V[]): T[] {
  const exact = items.filter((item) => valueOf(item) === own);
  if (exact.length) return exact;
  const close = items.filter((item) => near.includes(valueOf(item) as V));
  if (close.length) return close;
  // A description without the trait says nothing against the car.
  return items.filter((item) => valueOf(item) === undefined);
}

/**
 * Where NHTSA names versions apart ("YUKON", "YUKON XL 1500", "YUKON XL
 * 2500"), the most specific whose every word is in the car's name: a Yukon XL
 * 1500 takes "YUKON XL 1500", a Yukon "YUKON". When none is, the plain name
 * the others extend ("C-CLASS" of "C-CLASS COUPE"); else none, rather than a
 * version the car is not (an Express 2500 is neither "EXPRESS CARGO 1500"
 * nor "EXPRESS PASSENGER 1500").
 */
function byName<T extends { config: TestedConfiguration }>(
  car: Pick<Car, 'model' | 'engine'>,
  tests: T[],
): T[] {
  const names = new Set(tests.map((test) => test.config.name.join(' ')));
  if (names.size < 2) return tests;
  const whole = compact(car.model);
  const words = new Set([
    ...car.model.toLowerCase().split(/[^a-z0-9]+/),
    ...(FUEL_WORDS[car.engine.fuelType] ?? []),
  ]);
  const has = (w: string) => words.has(w) || (!CODES.has(w) && w.length > 1 && whole.includes(w));
  const fits = tests.filter((test) =>
    test.config.name.every((w) => (SYNONYMS[w] ?? [w]).some(has)),
  );
  if (fits.length) {
    const most = Math.max(...fits.map((test) => test.config.name.length));
    const specific = fits.filter((test) => test.config.name.length === most);
    // "IONIQ HYBRID" and "IONIQ PLUG-IN" both fit an "Ioniq Plug-in Hybrid": its fuel decides.
    const fuel = FUEL_WORDS[car.engine.fuelType] ?? [];
    const ownFuel = specific.filter((test) =>
      test.config.name.some((w) => (SYNONYMS[w] ?? [w]).some((v) => fuel.includes(v))),
    );
    return ownFuel.length ? ownFuel : specific;
  }
  const fewest = Math.min(...tests.map((test) => test.config.name.length));
  const plain = tests.filter((test) => test.config.name.length === fewest);
  const plainName = plain[0].config.name;
  const extended = tests.every((test) => plainName.every((w) => test.config.name.includes(w)));
  return new Set(plain.map((test) => test.config.name.join(' '))).size === 1 && extended
    ? plain
    : [];
}

const ELECTRIFIED_FUELS = new Set(['electric', 'hybrid', 'plug-in hybrid', 'hydrogen']);

function isElectrified(car: Pick<Car, 'model' | 'engine'>): boolean {
  return ELECTRIFIED_FUELS.has(car.engine.fuelType) || /\bhybrid\b/i.test(car.model);
}

/**
 * The tests among one model line's that year that describe the car: its body
 * and drivetrain, and its version where NHTSA names versions ("CAMRY" and
 * "CAMRY HV", "PRIUS" and "PRIUS PLUG-IN"). A gas car never takes a hybrid's
 * or EV's test; a hybrid NHTSA tested only as the gas car takes the gas car's.
 */
export function testsDescribing<T extends { config: TestedConfiguration }>(
  car: Pick<Car, 'model' | 'engine' | 'bodyStyle' | 'driveType'>,
  tests: T[],
): T[] {
  const electrified = isElectrified(car);
  const pool = electrified ? tests : tests.filter((test) => !test.config.electrified);
  const body = BODY_OF[car.bodyStyle];
  const drive = DRIVE_OF[car.driveType];
  const byBody = nearest(pool, (test) => test.config.body, body.own, body.near);
  const byDrive = nearest(byBody, (test) => test.config.drive, drive.own, drive.near);
  const named = byName(car, byDrive);
  // One name for both: the hybrid's own test, where NHTSA ran one.
  const own = electrified ? named.filter((test) => test.config.electrified) : [];
  return own.length ? own : named;
}

function stars(value: string | undefined): number | undefined {
  const n = Number(value);
  return n >= 1 && n <= 5 ? n : undefined;
}

function availability(value: string | undefined): SafetyAvailability | undefined {
  const v = value?.toLowerCase().trim();
  if (v === 'standard' || v === 'stanard') return 'standard';
  if (v === 'optional') return 'optional';
  if (v === 'standard & optional') return 'some';
  // "No" and "Not Available": NHTSA does not list it for this configuration.
  return undefined;
}

export function ratingOf(vehicle: NhtsaVehicle): NhtsaRating {
  const overall = stars(vehicle.OverallRating);
  const frontal = stars(vehicle.OverallFrontCrashRating);
  const side = stars(vehicle.OverallSideCrashRating);
  const rollover = stars(vehicle.RolloverRating);
  const risk = vehicle.RolloverPossibility;
  const esc = availability(vehicle.NHTSAElectronicStabilityControl);
  const fcw = availability(vehicle.NHTSAForwardCollisionWarning);
  const ldw = availability(vehicle.NHTSALaneDepartureWarning);
  return {
    id: vehicle.VehicleId,
    tested: vehicle.VehicleDescription.replace(/\s+/g, ' ').trim(),
    ...(overall ? { overall } : {}),
    ...(frontal ? { frontal } : {}),
    ...(side ? { side } : {}),
    ...(rollover ? { rollover } : {}),
    // A risk is published with the rollover rating it comes from.
    ...(rollover && risk && risk > 0 && risk < 1 ? { rolloverRisk: risk } : {}),
    ...(esc ? { esc } : {}),
    ...(fcw ? { fcw } : {}),
    ...(ldw ? { ldw } : {}),
  };
}

/** Anything NHTSA says of the configuration: stars, or a listed technology. */
export function saysAnything(rating: NhtsaRating): boolean {
  return Boolean(
    rating.overall ||
    rating.frontal ||
    rating.side ||
    rating.rollover ||
    rating.esc ||
    rating.fcw ||
    rating.ldw,
  );
}

const STAR_FIELDS = ['overall', 'frontal', 'side', 'rollover'] as const;
const TECH_FIELDS = ['esc', 'fcw', 'ldw'] as const;

/**
 * What the car can be said to have from the tests that describe it: each
 * score the lowest any of them got, the rollover risk the highest, and a
 * technology standard only where every one lists it standard. A Tacoma is
 * three tests, one per cab; a 2011 Camry two, built early and late in the
 * year. The page lists each.
 */
export function summarize(tests: NhtsaRating[]): Car['safetyRating'] & object {
  const summary: NonNullable<Car['safetyRating']> = { nhtsaIds: tests.map((t) => t.id) };
  for (const field of STAR_FIELDS) {
    const values = tests.map((t) => t[field]).filter((v): v is number => v != null);
    if (values.length) summary[field] = Math.min(...values);
  }
  const risks = tests.map((t) => t.rolloverRisk).filter((v): v is number => v != null);
  if (risks.length) summary.rolloverRisk = Math.max(...risks);
  return summary;
}

export function techSummary(tests: NhtsaRating[]): Car['safetyTech'] {
  const tech: NonNullable<Car['safetyTech']> = {};
  for (const field of TECH_FIELDS) {
    const listed = tests.map((t) => t[field]);
    if (listed.every((v) => v === 'standard')) tech[field] = 'standard';
    else if (listed.some((v) => v === 'standard' || v === 'some')) tech[field] = 'some';
    else if (listed.some((v) => v === 'optional')) tech[field] = 'optional';
  }
  return Object.keys(tech).length ? tech : undefined;
}

/**
 * Every car's NHTSA ratings from the tests of its model line that year
 * (`lineOf` the site's line key, `match` government names to it). Ratings a
 * car already carries are replaced: none may come from another model year.
 */
export function withNhtsaRatings(
  cars: Car[],
  tests: NhtsaTest[],
  lineOf: (car: Car) => string,
  match: (make: string, model: string, year: number) => string | null,
): { cars: Car[]; rated: number; described: number } {
  const byLine = new Map<string, Array<{ config: TestedConfiguration; rating: NhtsaTest }>>();
  for (const test of tests) {
    const line = match(test.make, test.model, test.year);
    if (!line) continue;
    const key = `${line}|${test.year}`;
    const list = byLine.get(key) ?? [];
    list.push({
      config: testedConfiguration({
        VehicleId: test.id,
        VehicleDescription: test.tested,
        Make: test.make,
        Model: test.model,
        ModelYear: test.year,
      }),
      rating: test,
    });
    byLine.set(key, list);
  }
  let rated = 0;
  let described = 0;
  const out = cars.map((car) => {
    const candidates = byLine.get(`${lineOf(car)}|${car.year}`);
    const chosen = candidates ? testsDescribing(car, candidates).map((t) => t.rating) : [];
    const { safetyRating: _old, safetyTech: _oldTech, ...rest } = car;
    if (!chosen.length) {
      if (!car.safetyRating && !car.safetyTech) return car;
      const provenance = { ...car.provenance };
      delete provenance.safetyRating;
      return { ...rest, provenance } as Car;
    }
    described++;
    const safetyRating = summarize(chosen);
    const safetyTech = techSummary(chosen);
    if (safetyRating.overall) rated++;
    return {
      ...rest,
      safetyRating,
      ...(safetyTech ? { safetyTech } : {}),
      provenance: { ...car.provenance, safetyRating: 'nhtsa' },
    } as Car;
  });
  return { cars: out, rated, described };
}

let loaded: Map<number, NhtsaTest> | undefined;

/** data/nhtsa-ratings.json's tests by NHTSA's id (scripts/build-nhtsa-ratings.ts builds it). */
function testsById(): Map<number, NhtsaTest> {
  if (loaded) return loaded;
  const path = resolveDataFile('nhtsa-ratings.json');
  let tests: NhtsaTest[] = [];
  if (path) {
    try {
      tests = (JSON.parse(readFileSync(path, 'utf8')) as { tests: NhtsaTest[] }).tests;
    } catch (err) {
      console.warn(`[nhtsa-ratings] Failed to parse ${path}:`, (err as Error).message);
    }
  }
  loaded = new Map(tests.map((test) => [test.id, test]));
  return loaded;
}

export function loadNhtsaTests(): NhtsaTest[] {
  return [...testsById().values()];
}

/** The tests a car's ratings come from, as NHTSA lists them. */
export function nhtsaTestsFor(car: Pick<Car, 'safetyRating'>): NhtsaRating[] {
  const byId = testsById();
  return (car.safetyRating?.nhtsaIds ?? []).flatMap((id) => {
    const test = byId.get(id);
    if (!test) return [];
    const { make: _make, model: _model, year: _year, ...rating } = test;
    return [rating];
  });
}
