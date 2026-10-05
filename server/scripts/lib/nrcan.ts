/**
 * Natural Resources Canada's fuel consumption ratings, for the cars sold in
 * Canada that EPA never rated: models built for Canada (the Acura EL and CSX,
 * the Chevrolet Orlando, the Pontiac Firefly), years a model stayed on sale
 * here after it left the US (a 2016 Venza, a 2014-17 Rondo), and the names
 * Canadians bought some cars under (a Kia Magentis is an Optima, a Nissan
 * Qashqai a Rogue Sport).
 *
 * NRCan rates every car sold in Canada, so its files repeat most of EPA's
 * catalogue under other spellings ("A8L" for "A8 L", "TJ" for the Wrangler,
 * "C1500 Silverado" for the Silverado). Only the models listed here are
 * imported: each was checked against cars.json, and the importer still skips
 * a row EPA has since listed.
 *
 * Source: https://open.canada.ca/data/en/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64
 */
import type { BodyStyle, Car, DriveType, FuelType, Provenance } from '../../src/types/car.types.js';
import { lookupCountry, mapTransmission, mapVClassToBodyStyle, slugify } from './epa-row.js';

/** One row of NRCan's conventional-vehicle or battery-electric CSVs, keyed by header. */
export type NrcanRow = Record<string, string>;

export interface CanadianModel {
  make: string;
  /** NRCan's model names this entry takes. */
  model: RegExp;
  years: [number, number];
  /** The drive when the name does not give one. */
  drive?: DriveType;
  /** The body, where NRCan's class reads it as another (it files small crossovers as wagons). */
  body?: BodyStyle;
  /** Why EPA does not list it, for the report and the README. */
  why: string;
}

/** The cars sold in Canada that EPA never rated, as NRCan names them. */
export const CANADIAN_MODELS: CanadianModel[] = [
  { make: 'Acura', model: /^1\.6EL$/, years: [1997, 2000], why: 'Canada-only Acura' },
  { make: 'Acura', model: /^1\.7EL$/, years: [2001, 2005], why: 'Canada-only Acura' },
  { make: 'Acura', model: /^CSX\b/, years: [2006, 2011], why: 'Canada-only Acura' },
  { make: 'Chevrolet', model: /^Orlando$/, years: [2012, 2014], why: 'sold only in Canada' },
  {
    make: 'Chevrolet',
    model: /^Tracker (?:Convertible|Van)\b/,
    years: [1995, 1995],
    drive: 'RWD',
    why: "Canada's name for the Geo Tracker",
  },
  { make: 'Chevrolet', model: /^Trax\b/, years: [2013, 2014], why: 'in Canada two years early' },
  { make: 'Chevrolet', model: /^Uplander$/, years: [2009, 2009], why: 'a year longer in Canada' },
  {
    make: 'Chrysler',
    model: /^Intrepid\b/,
    years: [1996, 2004],
    why: 'Canada sold the Intrepid as a Chrysler',
  },
  {
    make: 'Chrysler',
    model: /^Neon\b/,
    years: [2000, 2002],
    why: 'Canada sold the Neon as a Chrysler',
  },
  {
    make: 'Chrysler',
    model: /^Grand Caravan$/,
    years: [2021, 2026],
    why: "Canada's name for the Voyager",
  },
  { make: 'Dodge', model: /^Colt$/, years: [1995, 1996], why: 'a Colt only Canada kept' },
  { make: 'Plymouth', model: /^Colt$/, years: [1995, 1996], why: 'a Colt only Canada kept' },
  { make: 'Kia', model: /^Magentis$/, years: [2001, 2010], why: "Canada's name for the Optima" },
  { make: 'Kia', model: /^Rondo$/, years: [2014, 2017], why: 'sold only in Canada after 2012' },
  { make: 'Kia', model: /^EV4\b/, years: [2026, 2026], why: 'not sold in the US' },
  { make: 'Mazda', model: /^CX-3\b/, years: [2022, 2022], why: 'a year longer in Canada' },
  { make: 'Mazda', model: /^MX-30$/, years: [2024, 2024], why: 'a year longer in Canada' },
  {
    make: 'Mercedes-Benz',
    model: /^A 250\b/,
    years: [2019, 2022],
    body: 'hatchback',
    why: 'Canada-only A-Class hatchback',
  },
  { make: 'Mercedes-Benz', model: /^B 200\b/, years: [2006, 2011], why: 'Canada-only B-Class' },
  {
    make: 'Mercedes-Benz',
    model: /^B 250\b/,
    years: [2013, 2019],
    why: 'Canada-only B-Class (the US had only the electric one)',
  },
  {
    make: 'Mercedes-Benz',
    model: /^C 230 4MATIC$/,
    years: [2008, 2009],
    why: 'Canada-only C-Class',
  },
  { make: 'Mitsubishi', model: /^i-MiEV$/, years: [2015, 2015], why: 'a year the US skipped' },
  { make: 'Mitsubishi', model: /^Mirage$/, years: [2016, 2016], why: 'a year the US skipped' },
  {
    make: 'Mitsubishi',
    model: /^RVR\b/,
    years: [2011, 2026],
    why: "Canada's name for the Outlander Sport",
  },
  { make: 'Nissan', model: /^Axxess$/, years: [1995, 1995], why: 'a year longer in Canada' },
  { make: 'Nissan', model: /^Micra$/, years: [2015, 2019], why: 'sold only in Canada' },
  {
    make: 'Nissan',
    model: /^Qashqai\b/,
    years: [2017, 2023],
    body: 'suv',
    why: "Canada's name for the Rogue Sport",
  },
  { make: 'Nissan', model: /^X-Trail\b/, years: [2005, 2006], why: 'sold only in Canada' },
  { make: 'Pontiac', model: /^Firefly$/, years: [1995, 2000], why: "Pontiac's Canada-only Metro" },
  { make: 'Pontiac', model: /^Montana SV6\b/, years: [2007, 2009], why: 'longer in Canada' },
  { make: 'Pontiac', model: /^Pursuit$/, years: [2005, 2006], why: 'Canada-only Pontiac' },
  {
    make: 'Pontiac',
    model: /^Sunrunner\b/,
    years: [1995, 1997],
    drive: 'RWD',
    why: "Pontiac's Canada-only Tracker",
  },
  { make: 'Pontiac', model: /^Wave\b/, years: [2007, 2008], why: 'longer in Canada' },
  {
    make: 'smart',
    model: /^fortwo CDI\b/,
    years: [2005, 2006],
    drive: 'RWD',
    why: 'the diesel fortwo Canada had before the US got the car',
  },
  { make: 'Toyota', model: /^Venza\b/, years: [2016, 2016], why: 'a year longer in Canada' },
  { make: 'Toyota', model: /^Yaris$/, years: [2006, 2006], why: 'in Canada a year early' },
  {
    make: 'Volkswagen',
    model: /^City (?:Golf|Jetta)$/,
    years: [2007, 2010],
    why: 'sold only in Canada',
  },
  { make: 'Volkswagen', model: /^e-Golf$/, years: [2020, 2020], why: 'a year longer in Canada' },
];

const MPG_L100 = 235.215; // US mpg × L/100 km
const KM_PER_MILE = 1.609344;

/** NRCan's vehicle class in EPA's words, so body style and taxonomy read it the same way. */
const VEHICLE_CLASS: Record<string, string> = {
  'Two-seater': 'Two Seaters',
  Minicompact: 'Minicompact Cars',
  Subcompact: 'Subcompact Cars',
  Compact: 'Compact Cars',
  'Mid-size': 'Midsize Cars',
  'Full-size': 'Large Cars',
  'Station wagon: Small': 'Small Station Wagons',
  'Station wagon: Mid-size': 'Midsize Station Wagons',
  'Sport utility vehicle': 'Sport Utility Vehicle',
  'Sport utility vehicle: Small': 'Small Sport Utility Vehicle',
  'Sport utility vehicle: Standard': 'Standard Sport Utility Vehicle',
  Minivan: 'Minivan',
  'Van: Cargo': 'Vans, Cargo Type',
  'Van: Passenger': 'Vans, Passenger Type',
  'Pickup truck: Small': 'Small Pickup Trucks',
  'Pickup truck: Standard': 'Standard Pickup Trucks',
  'Special purpose vehicle': 'Special Purpose Vehicle',
};

/** NRCan's gearbox code ("AS6", "AV", "M5") in EPA's words, so mapTransmission reads it. */
export function transmissionDescription(code: string): string {
  const c = code.trim().toUpperCase();
  let m: RegExpMatchArray | null;
  if ((m = c.match(/^M(\d+)$/))) return `Manual ${m[1]}-spd`;
  if ((m = c.match(/^AS(\d+)$/))) return `Automatic (S${m[1]})`;
  if ((m = c.match(/^AM(\d+)$/))) return `Automatic (AM${m[1]})`;
  if ((m = c.match(/^AV(\d+)?$/)))
    return m[1] && m[1] !== '1' ? `Automatic (AV-S${m[1]})` : 'Automatic (variable gear ratios)';
  if ((m = c.match(/^A(\d+)$/)))
    return Number(m[1]) <= 2 ? `Automatic (A${m[1]})` : `Automatic ${m[1]}-spd`;
  return 'Automatic';
}

/** The drive a model name gives ("XC70 AWD", "RVR 4WD", "C 230 4MATIC"), or the fallback. */
export function driveFromName(
  model: string,
  fallback: DriveType,
): { drive: DriveType; named: boolean } {
  if (/\b(?:AWD|4MATIC|quattro|xDrive|ALL4|4MOTION|AWC)\b/i.test(model))
    return { drive: 'AWD', named: true };
  if (/\b(?:4X4|4WD)\b/i.test(model)) return { drive: '4WD', named: true };
  return { drive: fallback, named: false };
}

function fuelOf(code: string, model: string): FuelType {
  const c = code.trim().toUpperCase();
  if (c === 'B') return 'electric';
  if (c === 'D') return 'diesel';
  if (c === 'N') return 'natural gas';
  return /\bhybrid\b/i.test(model) ? 'hybrid' : 'gasoline';
}

function num(value: string | undefined): number | undefined {
  const n = parseFloat(value ?? '');
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
/** L/100 km (or Le/100 km) as US mpg (or MPGe), to a tenth so the litres survive the trip back. */
const toMpg = (l100: number | undefined) => (l100 ? round1(MPG_L100 / l100) : undefined);

/** The curated entry a row belongs to, if any. NRCan's footnote mark ("Pursuit #") is ignored. */
export function canadianModelOf(row: NrcanRow): CanadianModel | undefined {
  const year = parseInt(row['Model year'], 10);
  const model = cleanModel(row.Model);
  return CANADIAN_MODELS.find(
    (entry) =>
      entry.make.toLowerCase() === row.Make.trim().toLowerCase() &&
      entry.model.test(model) &&
      year >= entry.years[0] &&
      year <= entry.years[1],
  );
}

/**
 * NRCan's model name as the site lists it: without its footnote mark
 * ("Pursuit #") or the notes EPA keeps out of a name, which go to the
 * gearbox ("Intrepid (Autostick)" shifts by hand) or the trim ("CX-3 (SIL)",
 * Mazda's idle-stop engine).
 */
export function cleanModel(model: string): string {
  return model
    .replace(/\s*#\s*$/, '')
    .replace(/\s*\((?:Autostick|SIL)\)/gi, '')
    .trim();
}

const AUTOSTICK = /\(Autostick\)/i;

/** A car from one NRCan row. Fuel use is stored in EPA's units, as every other car's is. */
export function mapNrcanRow(row: NrcanRow, entry: CanadianModel): Car {
  const year = parseInt(row['Model year'], 10);
  const make = entry.make;
  const model = cleanModel(row.Model);
  const fuelType = fuelOf(row['Fuel type'] ?? '', model);
  const electric = fuelType === 'electric';
  // Chrysler's Autostick is an automatic shifted by hand, which EPA writes "(S4)".
  const coded = transmissionDescription(row.Transmission ?? '');
  const description = AUTOSTICK.test(row.Model)
    ? coded.replace(/^Automatic (\d+)-spd$/, 'Automatic (S$1)')
    : coded;
  const transmission = mapTransmission(description);
  const idleStop = /\(SIL\)/i.test(row.Model) ? ' SIL' : '';
  const { drive, named } = driveFromName(model, entry.drive ?? 'FWD');
  const nrcanClass = VEHICLE_CLASS[row['Vehicle class']?.trim()] ?? row['Vehicle class'] ?? '';
  // A crossover NRCan files as a wagon takes EPA's SUV class, as its US twin has.
  const vClass = entry.body === 'suv' ? 'Small Sport Utility Vehicle' : nrcanClass;

  const fuelEconomy: Car['fuelEconomy'] = electric
    ? {
        city: toMpg(num(row['City (Le/100 km)'])),
        highway: toMpg(num(row['Highway (Le/100 km)'])),
        combined: toMpg(num(row['Combined (Le/100 km)'])),
      }
    : {
        city: toMpg(num(row['City (L/100 km)'])),
        highway: toMpg(num(row['Highway (L/100 km)'])),
        combined: toMpg(num(row['Combined (L/100 km)'])),
      };
  const co2Km = num(row['CO2 emissions (g/km)']);
  const kWh100Km = num(row['Combined (kWh/100 km)']);
  const rangeKm = num(row['Range (km)']);
  const rechargeHours = num(row['Recharge time (h)']);

  const provenance: Provenance = {};
  const car: Car = {
    id: '', // assigned by assignNrcanIds
    make,
    model,
    year,
    trim: slugify(`${model}${idleStop} ${description}`),
    provenance,
    engine: {
      fuelType,
      ...(electric
        ? {}
        : { displacement: num(row['Engine size (L)']), cylinders: num(row.Cylinders) }),
      ...(!electric && /\bturbo\b/i.test(model) ? { aspiration: 'turbocharged' as const } : {}),
    },
    fuelEconomy,
    transmission,
    driveType: drive,
    bodyStyle: entry.body ?? mapVClassToBodyStyle(vClass, model) ?? 'sedan',
    // Not EPA's record: the class in EPA's words, and NRCan's own figures in EPA's units.
    epa: {
      vClass,
      ...(co2Km != null ? { co2: Math.round(co2Km * KM_PER_MILE) } : {}),
      ...(electric
        ? {
            ...(kWh100Km != null ? { kWhPer100Mi: round2(kWh100Km * KM_PER_MILE) } : {}),
            ...(rangeKm != null ? { rangeMiles: Math.round(rangeKm / KM_PER_MILE) } : {}),
            ...(rechargeHours != null ? { charge240Hours: rechargeHours } : {}),
          }
        : {}),
    },
  };

  for (const field of [
    'make',
    'model',
    'year',
    'bodyStyle',
    'transmission',
    'engine.fuelType',
    'fuelEconomy.city',
    'fuelEconomy.highway',
    'fuelEconomy.combined',
  ])
    provenance[field] = 'nrcan';
  if (!electric) {
    provenance['engine.displacement'] = 'nrcan';
    provenance['engine.cylinders'] = 'nrcan';
  }
  if (car.engine.aspiration) provenance['engine.aspiration'] = 'nrcan';
  provenance.driveType = named ? 'nrcan' : 'estimated';
  if (car.epa?.co2 != null) provenance['epa.co2'] = 'nrcan';
  if (car.epa?.kWhPer100Mi != null) provenance['epa.kWhPer100Mi'] = 'nrcan';
  if (car.epa?.rangeMiles != null) provenance['epa.rangeMiles'] = 'nrcan';
  if (car.epa?.charge240Hours != null) provenance['epa.charge240Hours'] = 'nrcan';

  const country = lookupCountry(make);
  if (country) {
    car.countryOfOrigin = country;
    provenance.countryOfOrigin = 'estimated';
  }
  return car;
}

/**
 * IDs in EPA's pattern (make-model-year-trim) with "-ca" at the end, so none
 * can take an EPA listing's ID. Rows that share one (two engines with one
 * gearbox) add the engine size, then a count. Rows arrive in NRCan's order,
 * which keeps the IDs stable from one refresh to the next.
 */
export function assignNrcanIds(cars: Car[]): Car[] {
  const taken = new Set<string>();
  return cars.map((car) => {
    const base = `${slugify(car.make)}-${slugify(car.model)}-${car.year}-${car.trim}-ca`;
    let id = base;
    if (taken.has(id) && car.engine.displacement)
      id = `${base}-${slugify(`${car.engine.displacement}l`)}`;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    return { ...car, id };
  });
}
