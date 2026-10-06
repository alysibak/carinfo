/**
 * Natural Resources Canada's fuel consumption ratings, for the cars sold in
 * Canada that EPA never rated: models built for Canada (the Acura EL and CSX,
 * the Chevrolet Orlando, the Pontiac Firefly), years a model stayed on sale
 * here after it left the US (a 2016 Venza, a 2014-17 Rondo), and the names
 * Canadians bought some cars under (a Kia Magentis is an Optima, a Nissan
 * Qashqai a Rogue Sport). It also fills the model years EPA's file is
 * missing though NRCan has them (a 2026 GR86, a 2023 Range Rover), until EPA
 * lists them.
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

/** One row of NRCan's conventional, battery-electric or plug-in hybrid CSVs, keyed by header. */
export type NrcanRow = Record<string, string>;

export interface CanadianModel {
  /** The make as the site (and EPA) spells it. */
  make: string;
  /** NRCan's spelling of the make, where it differs ("INEOS"). */
  nrcanMake?: string;
  /** NRCan's model names this entry takes. */
  model: RegExp;
  years: [number, number];
  /** The drive when the name does not give one. */
  drive?: DriveType;
  /** The body, where NRCan's class reads it as another (it files small crossovers as wagons). */
  body?: BodyStyle;
  /**
   * EPA's name for the model, for a year EPA's file is missing: once EPA
   * lists the model that year, NRCan's row is skipped. Without one, a row is
   * skipped when EPA lists a model of the same make and year by the same
   * first word ("B 250" against EPA's "B250e" is another car).
   */
  epaModel?: RegExp;
  /** Why EPA does not list it, for the report and the README. */
  why: string;
}

/** A model year EPA's file is missing, though NRCan has it. */
function missingYear(
  make: string,
  model: RegExp,
  year: number,
  epaModel: RegExp,
  more: Partial<CanadianModel> = {},
): CanadianModel {
  return {
    make,
    model,
    years: [year, year],
    epaModel,
    why: `not in EPA's file for ${year}`,
    ...more,
  };
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

  // Model years EPA's file is missing (checked against EPA's file of October
  // 2026). Each names EPA's spelling, so the import stops taking NRCan's row
  // once EPA lists that year.
  missingYear('Toyota', /^GR86$/, 2026, /^GR ?86\b/, { drive: 'RWD' }),
  missingYear(
    'Land Rover',
    /^Range Rover (?!Evoque|Velar)/,
    2023,
    /^Range Rover (?!Evoque|Velar)/,
    {
      drive: '4WD',
    },
  ),
  missingYear('Porsche', /^911 GT3\b/, 2025, /^911 GT3/, { drive: 'RWD' }),
  missingYear(
    'Porsche',
    /^Cayenne (?:S |Turbo )?(?:Coupe )?Electric\b/,
    2026,
    /^Cayenne.*Electric/,
    {
      drive: 'AWD',
    },
  ),
  missingYear('Audi', /^(?:A6 60|S6) e-tron\b/, 2025, /^[AS]6\b.*e-tron/, { drive: 'AWD' }),
  missingYear('Hyundai', /^Kona Electric$/, 2026, /^Kona Electric/),
  missingYear('Cadillac', /^OPTIQ \(/, 2025, /^OPTIQ/, { drive: 'AWD' }),
  missingYear('INEOS Automotive', /^Grenadier\b/, 2026, /^Grenadier/, {
    nrcanMake: 'INEOS',
    drive: '4WD',
  }),
  missingYear('Lotus', /^Eletre\b/, 2026, /^Eletre/, { drive: 'AWD' }),
  missingYear('Vinfast', /^VF8\b/, 2024, /^VF ?8\b/i, { nrcanMake: 'VinFast', drive: 'AWD' }),
  missingYear('Vinfast', /^VF8\b/, 2026, /^VF ?8\b/i, { nrcanMake: 'VinFast', drive: 'AWD' }),
  missingYear('Aston Martin', /^DBS V12$/, 2024, /^DBS/, { drive: 'RWD' }),
  missingYear('Ferrari', /^12Cilindri\b/, 2025, /^12 ?Cilindri/, { drive: 'RWD' }),
  missingYear('Ferrari', /^296 GT[BS]$/, 2024, /^296/, { drive: 'RWD' }),
  missingYear('Ferrari', /^849 Testarossa$/, 2026, /^849/, { drive: 'AWD' }),
  missingYear('Lamborghini', /^Revuelto$/, 2026, /^Revuelto/, { drive: 'AWD' }),
  missingYear('Lamborghini', /^Temerario$/, 2026, /^Temerario/, { drive: 'AWD' }),
  missingYear('Bentley', /^Bentayga Hybrid$/, 2024, /^Bentayga Hybrid/, { drive: 'AWD' }),
  missingYear('BMW', /^750e\b/, 2024, /^750e/),
  missingYear('BMW', /^XM Label Red$/, 2024, /^XM Label/, { drive: 'AWD' }),
  missingYear('Lexus', /^NX 450h\+/, 2026, /^NX 450h(?:\+| Plus)/),
  missingYear('Lexus', /^RX 450h\+/, 2024, /^RX 450h(?:\+| Plus)/),
  missingYear('Lexus', /^RX 450h\+/, 2026, /^RX 450h(?:\+| Plus)/),
  missingYear('Lincoln', /^Corsair Grand Touring$/, 2024, /^Corsair Grand Touring/, {
    drive: 'AWD',
  }),
  missingYear('Mercedes-Benz', /^EQB\b/, 2023, /^EQB/),
  missingYear('Mercedes-Benz', /^(?:AMG )?EQE\b/, 2023, /^(?:AMG )?EQE/),
  missingYear('Mercedes-Benz', /^AMG EQS\b/, 2023, /^AMG EQS/),
  missingYear('Mercedes-Benz', /^EQS 580 4MATIC Sedan$/, 2023, /^EQS ?580 4matic$/i),
  missingYear('Mercedes-Benz', /^GLC 350e\b/, 2026, /^GLC ?350e/),
  missingYear('Mercedes-Benz', /^GLE 450e\b/, 2024, /^GLE ?450e/),
  missingYear('Mercedes-Benz', /^GLE 450e\b/, 2026, /^GLE ?450e/),
  missingYear('Mercedes-Benz', /^S 580e\b/, 2024, /^S ?580e/),
  missingYear('Nissan', /^Rogue Plug-in Hybrid$/, 2026, /^Rogue Plug-in/, { drive: 'AWD' }),
  // Sold only in Canada: the US had the iX's larger batteries, and no Soul EV
  // after 2020 or gasoline Tonale.
  missingYear('BMW', /^iX xDrive40\b/, 2023, /^iX xDrive40/, { why: 'not sold in the US' }),
  missingYear('Kia', /^Soul EV\b/, 2023, /^Soul EV/, { why: 'not sold in the US after 2020' }),
  missingYear('Alfa Romeo', /^Tonale AWD$/, 2023, /^Tonale/, {
    why: 'a gasoline Tonale only Canada had',
  }),
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

function fuelOf(row: NrcanRow, model: string): FuelType {
  if ('Fuel type 1' in row) return 'plug-in hybrid';
  const c = (row['Fuel type'] ?? '').trim().toUpperCase();
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

/**
 * The curated entry a row belongs to, if any. NRCan's footnote mark
 * ("Pursuit #") is ignored, and so are its E85 rows: NRCan rates a flex-fuel
 * car twice, and the site lists it by its gasoline figures, as EPA does.
 */
export function canadianModelOf(row: NrcanRow): CanadianModel | undefined {
  if (row['Fuel type']?.trim().toUpperCase() === 'E') return undefined;
  const year = parseInt(row['Model year'], 10);
  const model = cleanModel(row.Model);
  return CANADIAN_MODELS.find(
    (entry) =>
      (entry.nrcanMake ?? entry.make).toLowerCase() === row.Make.trim().toLowerCase() &&
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
  return (
    model
      .replace(/\s*#\s*$/, '')
      .replace(/\s*\((?:Autostick|SIL)\)/gi, '')
      // Wheel sizes as EPA writes them: '(20" Wheels)' is "(20 inch Wheels)".
      .replace(/(\d+)"/g, '$1 inch')
      .trim()
  );
}

const AUTOSTICK = /\(Autostick\)/i;

/**
 * EPA's spelling of the name, where EPA lists it in nearby years and the two
 * differ only in spaces and punctuation ("GR 86" for NRCan's "GR86"), or in
 * the "Sedan" or "SUV" NRCan adds where EPA has none ("S580e 4matic" for
 * "S 580e 4MATIC Sedan"), so a year from NRCan joins the model's other years.
 * The exact form is tried first, so "EQE 350 4MATIC SUV" takes EPA's
 * "EQE 350 4matic (SUV)" rather than the sedan's name.
 */
export function epaSpelling(model: string, nearbyEpaModels: string[]): string | undefined {
  const bare = (name: string) => name.toLowerCase().replace(/[^a-z0-9+]/g, '');
  for (const form of [model, model.replace(/\s+(?:Sedan|SUV)$/i, '')]) {
    const match = nearbyEpaModels.find((name) => bare(name) === bare(form));
    if (match) return match;
  }
  return undefined;
}

/**
 * A car from one NRCan row, under `name` when given (EPA's spelling).
 * Fuel use is stored in EPA's units, as every other car's is.
 */
export function mapNrcanRow(row: NrcanRow, entry: CanadianModel, name?: string): Car {
  const year = parseInt(row['Model year'], 10);
  const make = entry.make;
  const model = name ?? cleanModel(row.Model);
  const fuelType = fuelOf(row, model);
  const electric = fuelType === 'electric';
  const plugIn = fuelType === 'plug-in hybrid';
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
  // A plug-in hybrid's range is its electric range ("Range 1"), as EPA's is.
  const rangeKm = num(row['Range (km)'] ?? row['Range 1 (km)']);
  const rechargeHours = num(row['Recharge time (h)']);
  // "2.8 ([24.7 kWh + 0.0 L]/100 km)": the electric mode's Le/100 km comes first.
  const electricLe = num(row['Combined Le/100 km']);

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
      ...(electric || plugIn
        ? {
            ...(kWh100Km != null ? { kWhPer100Mi: round2(kWh100Km * KM_PER_MILE) } : {}),
            ...(rangeKm != null ? { rangeMiles: Math.round(rangeKm / KM_PER_MILE) } : {}),
            ...(rechargeHours != null ? { charge240Hours: rechargeHours } : {}),
          }
        : {}),
      // Gas mode and electric mode, as EPA's enrichment gives a plug-in hybrid.
      ...(plugIn
        ? {
            phev: {
              ...(fuelEconomy.combined != null ? { gasMpg: Math.round(fuelEconomy.combined) } : {}),
              ...(electricLe != null ? { electricMpge: Math.round(MPG_L100 / electricLe) } : {}),
              ...(rangeKm != null ? { electricRangeMi: Math.round(rangeKm / KM_PER_MILE) } : {}),
              ...(rechargeHours != null ? { chargeL2Hours: rechargeHours } : {}),
            },
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

/** "B 250" → "b250", "City Golf" → "city": the word a model line goes by. */
export function firstWord(model: string): string {
  return model
    .toLowerCase()
    .replace(/^([a-z]{1,3})\s+(\d)/, '$1$2')
    .split(/\s+/)[0]
    .replace(/[^a-z0-9+]/g, '');
}

/**
 * Whether EPA lists the car a row stands for, given EPA's model names for its
 * make and year: by the entry's EPA spelling where it has one, else by the
 * first word of the name.
 */
export function listedByEpa(entry: CanadianModel, model: string, epaModels: string[]): boolean {
  const { epaModel } = entry;
  if (epaModel) return epaModels.some((name) => epaModel.test(name));
  const word = firstWord(model);
  return epaModels.some((name) => firstWord(name) === word);
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
