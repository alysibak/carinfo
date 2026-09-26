/**
 * Turning one row of EPA's vehicles.csv into a Car. Shared by the full import
 * (build-verified-database.ts) and the variant backfill (backfill-epa-variants.ts)
 * so both read EPA the same way.
 */
import type {
  Aspiration,
  BodyStyle,
  Car,
  DriveType,
  Provenance,
  ProvenanceSource,
} from '../../src/types/car.types.js';
import { mapEpaFuelType } from './epa-fuel-type.js';

export interface EpaRow {
  id: string;
  make: string;
  model: string;
  year: string;
  trany: string;
  trans_dscr?: string;
  baseModel?: string;
  drive: string;
  cylinders: string;
  displ: string;
  city08: string;
  highway08: string;
  comb08: string;
  combA08?: string;
  combE?: string;
  cityE?: string;
  co2: string;
  fuelCost08: string;
  fuelType: string;
  fuelType1?: string;
  atvType?: string;
  phevBlended?: string;
  VClass: string;
  rangeA?: string;
  charge120?: string;
  charge240?: string;
  /** "T" when turbocharged. */
  tCharger?: string;
  /** "S" or "SC" when supercharged. */
  sCharger?: string;
  /** Free-text engine notes: "VTEC", "DOHC", "(FFS,TRBO)", "SIDI", "PZEV"... */
  eng_dscr?: string;
}

/** Oldest model year imported. */
export const MIN_MODEL_YEAR = 1995;

/** EPA lists next year's models as they are certified, from mid-year on. */
export function maxModelYear(now = new Date()): number {
  return now.getFullYear() + 1;
}

/**
 * EPA's "Special Purpose Vehicle" class (how it filed most SUVs, minivans and
 * some vans and chassis cabs through the 2000s) says nothing about the body,
 * so read it from the name. Hearses, limousines, livery, taxi and postal
 * conversions and incomplete chassis are left out: they are not cars anyone
 * shops for here.
 */
const SPECIALTY =
  /\b(hearse|limo|livery|funeral|coachbuilder|federal coach|usps|us postal|taxi|mv-1|incomplete)\b/;
const SPV_TRUCK = /\b(cab chassis|chassis cab|pickup)\b/;
const SPV_MINIVAN =
  /\b(caravan|voyager|town (?:&|and) country|minivan|windstar|freestar|aerostar|villager|quest|odyssey|sienna|previa|mpv|silhouette|trans ?sport|montana|venture|monterey|sedona|entourage|routan|pacifica|uplander|relay|terraza)\b/;
const SPV_VAN =
  /\b(van|vandura|transit|metris|sprinter|express|savana|econoline|astro|safari|promaster|club wagon)\b/;

function specialPurposeBodyStyle(model: string): BodyStyle | null {
  if (SPECIALTY.test(model)) return null;
  if (SPV_TRUCK.test(model)) return 'truck';
  if (SPV_MINIVAN.test(model)) return 'minivan';
  if (SPV_VAN.test(model)) return 'van';
  return 'suv';
}

/**
 * VClass → bodyStyle mapping table:
 * - Special Purpose → by name (see specialPurposeBodyStyle), or excluded
 * - Sport Utility / SUV → suv
 * - Pickup → truck
 * - Station Wagon → wagon
 * - Minivan → minivan
 * - Van / Passenger Van / Cargo Van → van
 * - Two Seaters → coupe
 * - *Cars* (compact/subcompact/mid/large/minicompact) → sedan
 */
export function mapVClassToBodyStyle(vclass: string, model = ''): BodyStyle | null {
  const v = vclass.toLowerCase();
  const m = model.toLowerCase();
  if (v.includes('special purpose')) return specialPurposeBodyStyle(m);
  if (v.includes('sport utility') || v.includes('suv')) return 'suv';
  if (v.includes('pickup')) return 'truck';
  if (v.includes('station wagon') || v.includes('wagon')) return 'wagon';
  if (v.includes('minivan')) return 'minivan';
  if (
    v.includes('cargo van') ||
    v.includes('passenger van') ||
    (v.includes('van') && !v.includes('minivan'))
  )
    return 'van';
  if (v.includes('two-seater') || v.includes('two seaters')) return 'coupe';
  if (/\b(gti|golf r|e-golf|hatchback|leaf|bolt|prius|veloster|fit|yaris)\b/.test(m))
    return 'hatchback';
  if (v.includes('car')) return 'sedan';
  return 'sedan';
}

export function mapDrive(drive: string): DriveType {
  const d = drive.toLowerCase();
  if (d.includes('front')) return 'FWD';
  if (d.includes('rear')) return 'RWD';
  // EPA uses "2-Wheel Drive" mostly for RWD trucks
  if (d.includes('2-wheel')) return 'RWD';
  if (d.includes('part-time') || d === '4-wheel drive') return '4WD';
  if (d.includes('all-wheel') || d.includes('4-wheel')) return 'AWD';
  // Unknown/blank: FWD is the most common passenger-car layout
  return 'FWD';
}

export function mapTransmission(trany: string): {
  type: Car['transmission']['type'];
  speeds?: number;
  description: string;
} {
  const t = trany.toLowerCase();
  const speedMatch = trany.match(/(\d+)[-\s]?spd/i);
  const avMatch = trany.match(/(?:AV|AM)-S(\d+)/i);
  const parenS = trany.match(/\(S(\d+)\)/i);
  let speeds = speedMatch ? parseInt(speedMatch[1], 10) : undefined;
  if (!speeds && avMatch) speeds = parseInt(avMatch[1], 10);
  if (!speeds && parenS) speeds = parseInt(parenS[1], 10);
  if (speeds != null && (speeds < 1 || speeds > 12)) speeds = undefined;
  if (t.includes('manual')) return { type: 'manual', speeds, description: trany };
  if (t.includes('variable gear') || t.includes('cvt'))
    return { type: 'cvt', speeds, description: trany };
  if (t.includes('dual') || t.includes('dct'))
    return { type: 'dual-clutch', speeds, description: trany };
  return { type: 'automatic', speeds, description: trany };
}

export function parseNum(value: string | undefined): number | undefined {
  if (!value || value === '-1') return undefined;
  const n = parseFloat(value);
  return Number.isNaN(n) || n < 0 ? undefined : n;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'base'
  );
}

function setProv(provenance: Provenance, field: string, source: ProvenanceSource): void {
  provenance[field] = source;
}

/** The marque's home country (not where a given car was assembled). */
const MAKE_COUNTRY: Record<string, string> = {
  acura: 'Japan',
  'alfa romeo': 'Italy',
  audi: 'Germany',
  bmw: 'Germany',
  buick: 'USA',
  cadillac: 'USA',
  chevrolet: 'USA',
  chrysler: 'USA',
  dodge: 'USA',
  ferrari: 'Italy',
  fiat: 'Italy',
  ford: 'USA',
  genesis: 'South Korea',
  gmc: 'USA',
  honda: 'Japan',
  hyundai: 'South Korea',
  infiniti: 'Japan',
  jaguar: 'UK',
  jeep: 'USA',
  kia: 'South Korea',
  lamborghini: 'Italy',
  'land rover': 'UK',
  lexus: 'Japan',
  lincoln: 'USA',
  maserati: 'Italy',
  mazda: 'Japan',
  'mercedes-benz': 'Germany',
  mini: 'UK',
  mitsubishi: 'Japan',
  nissan: 'Japan',
  porsche: 'Germany',
  ram: 'USA',
  subaru: 'Japan',
  tesla: 'USA',
  toyota: 'Japan',
  volkswagen: 'Germany',
  volvo: 'Sweden',
  // Makes the table used to miss (3,368 listings).
  'aston martin': 'UK',
  'azure dynamics': 'Canada',
  bentley: 'UK',
  'bmw alpina': 'Germany',
  bugatti: 'France',
  'bugatti rimac': 'Croatia',
  byd: 'China',
  'coda automotive': 'USA',
  'dabryan coach builders inc': 'USA',
  daewoo: 'South Korea',
  eagle: 'USA',
  'federal coach': 'USA',
  fisker: 'USA',
  geo: 'USA',
  hummer: 'USA',
  'ineos automotive': 'UK',
  isuzu: 'Japan',
  kandi: 'China',
  karma: 'USA',
  koenigsegg: 'Sweden',
  lordstown: 'USA',
  lotus: 'UK',
  lucid: 'USA',
  mahindra: 'India',
  maybach: 'Germany',
  'mclaren automotive': 'UK',
  mercury: 'USA',
  morgan: 'UK',
  oldsmobile: 'USA',
  pagani: 'Italy',
  'panoz auto-development': 'USA',
  plymouth: 'USA',
  polestar: 'Sweden',
  pontiac: 'USA',
  'quantum technologies': 'USA',
  qvale: 'Italy',
  rivian: 'USA',
  'rolls-royce': 'UK',
  'roush performance': 'USA',
  'ruf automobile': 'Germany',
  saab: 'Sweden',
  saleen: 'USA',
  'saleen performance': 'USA',
  saturn: 'USA',
  scion: 'Japan',
  shelby: 'USA',
  smart: 'Germany',
  spyker: 'Netherlands',
  srt: 'USA',
  sti: 'Japan',
  suzuki: 'Japan',
  'tecstar, lp': 'USA',
  vector: 'USA',
  vinfast: 'Vietnam',
};

export function lookupCountry(make: string): string | undefined {
  return MAKE_COUNTRY[make.toLowerCase()];
}

/** The ID suffix: base model and transmission. Engine is not part of it. */
export function buildTrim(row: EpaRow): string {
  const parts = [row.baseModel, row.trans_dscr, row.trany].filter(Boolean);
  const raw = parts.join(' ').trim() || 'base';
  return slugify(raw);
}

/** make-model-year-trim: what an EPA listing's ID is when nothing else claims it. */
export function baseCarId(row: EpaRow): string {
  return `${slugify(row.make)}-${slugify(row.model)}-${parseInt(row.year, 10)}-${buildTrim(row)}`;
}

/**
 * The ID for a listing whose base ID another configuration already holds (a
 * second engine with the same transmission, say). EPA's own row ID keeps it
 * unique and stable across rebuilds.
 */
export function variantCarId(row: EpaRow): string {
  return `${baseCarId(row)}-epa${row.id}`;
}

export function aspirationOf(row: EpaRow): Aspiration | undefined {
  const turbo = Boolean(row.tCharger?.trim());
  const supercharged = Boolean(row.sCharger?.trim());
  if (turbo && supercharged) return 'turbocharged and supercharged';
  if (turbo) return 'turbocharged';
  if (supercharged) return 'supercharged';
  return undefined;
}

/** EPA's engine notes minus emissions and injection tags that name no engine. */
function engineCode(row: EpaRow): string {
  return (row.eng_dscr ?? '')
    .toUpperCase()
    .replace(/\b(PZEV|SULEV|ULEV|LEV|CA MODEL|CA|FFS|MPFI|SIDI|FFV|GUZZLER|POLICE)\b/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

/**
 * What makes two EPA listings the same vehicle for a shopper. Rows that share
 * it differ only in emissions certification or test set-up, and one listing
 * stands for them. The importer used to key on model, year and transmission
 * alone, so a second engine with the same gearbox (a Mustang GT beside the
 * EcoBoost, a Civic Type R beside the 1.5T) was dropped as a duplicate.
 */
export function configurationKey(row: EpaRow): string {
  return [
    row.make.trim(),
    row.model.trim(),
    parseInt(row.year, 10),
    row.trany,
    row.displ,
    row.cylinders,
    aspirationOf(row) ?? '',
    row.fuelType1 ?? row.fuelType,
    row.atvType ?? '',
    row.drive,
    engineCode(row),
  ].join('|');
}

export function mapEpaRow(row: EpaRow, maxYear = maxModelYear()): Car | null {
  const year = parseInt(row.year, 10);
  if (Number.isNaN(year) || year < MIN_MODEL_YEAR || year > maxYear) return null;

  const bodyStyle = mapVClassToBodyStyle(row.VClass || '', row.model || '');
  if (!bodyStyle) return null;

  const fuelType = mapEpaFuelType(row);
  const provenance: Provenance = {};
  const trim = buildTrim(row);
  const id = baseCarId(row);

  let city: number | undefined;
  let highway: number | undefined;
  let combined: number | undefined;

  if (fuelType === 'electric') {
    city = parseNum(row.cityE);
    combined = parseNum(row.combE);
    highway = combined;
  } else if (fuelType === 'plug-in hybrid' && row.phevBlended === 'true') {
    city = parseNum(row.city08);
    highway = parseNum(row.highway08);
    combined = parseNum(row.combA08) ?? parseNum(row.comb08);
  } else {
    city = parseNum(row.city08);
    highway = parseNum(row.highway08);
    combined = parseNum(row.comb08);
  }

  if (!combined && !city && !highway) return null;

  const displacement = parseNum(row.displ);
  const cylinders = parseInt(row.cylinders, 10);
  const transmission = mapTransmission(row.trany || 'Automatic');
  const co2 = parseNum(row.co2);
  const annualFuelCost = parseNum(row.fuelCost08);
  const rangeMiles = parseNum(row.rangeA);
  const charge120 = parseNum(row.charge120);
  const charge240 = parseNum(row.charge240);
  const aspiration = fuelType === 'electric' ? undefined : aspirationOf(row);

  let kWhPer100Mi: number | undefined;
  if (fuelType === 'electric' && combined && combined > 0) {
    kWhPer100Mi = Math.round((3370 / combined) * 10) / 10;
  }

  const car: Car = {
    id,
    make: row.make.trim(),
    model: row.model.trim(),
    year,
    trim,
    epaId: parseInt(row.id, 10) || undefined,
    provenance,
    engine: {
      fuelType,
      displacement,
      cylinders: Number.isNaN(cylinders) ? undefined : cylinders,
      // EPA gives a cylinder count, never a bank layout. Inferring one is safe
      // where the count implies it, but 6 and 5 cylinders were being labelled
      // "I6" and "V5" — usually a V6 and always an inline-5. Leave those unset
      // and let NHTSA's EngineConfiguration fill them in when available.
      configuration:
        cylinders && cylinders !== 5 && cylinders !== 6
          ? cylinders <= 4
            ? `I${cylinders}`
            : `V${cylinders}`
          : undefined,
      ...(aspiration ? { aspiration } : {}),
    },
    fuelEconomy: { city, highway, combined },
    transmission,
    driveType: mapDrive(row.drive || ''),
    bodyStyle,
    epa: {
      co2,
      annualFuelCost,
      ...(fuelType === 'electric' || fuelType === 'plug-in hybrid'
        ? {
            rangeMiles,
            kWhPer100Mi,
            ...(charge120 && charge120 > 0 ? { charge120Hours: charge120 } : {}),
            ...(charge240 && charge240 > 0 ? { charge240Hours: charge240 } : {}),
          }
        : {}),
      vClass: row.VClass,
    },
  };

  setProv(provenance, 'make', 'epa');
  setProv(provenance, 'model', 'epa');
  setProv(provenance, 'year', 'epa');
  setProv(provenance, 'fuelEconomy.city', 'epa');
  setProv(provenance, 'fuelEconomy.highway', 'epa');
  setProv(provenance, 'fuelEconomy.combined', 'epa');
  setProv(provenance, 'engine.displacement', 'epa');
  setProv(provenance, 'engine.cylinders', 'epa');
  if (aspiration) setProv(provenance, 'engine.aspiration', 'epa');
  setProv(provenance, 'driveType', 'epa');
  setProv(provenance, 'transmission', 'epa');
  setProv(provenance, 'bodyStyle', 'epa');
  setProv(provenance, 'engine.fuelType', 'epa');
  if (co2 !== undefined) setProv(provenance, 'epa.co2', 'epa');
  if (annualFuelCost !== undefined) setProv(provenance, 'epa.annualFuelCost', 'epa');
  if (rangeMiles !== undefined) setProv(provenance, 'epa.rangeMiles', 'epa');
  if (kWhPer100Mi !== undefined) setProv(provenance, 'epa.kWhPer100Mi', 'epa');
  if (charge120 !== undefined) setProv(provenance, 'epa.charge120Hours', 'epa');
  if (charge240 !== undefined) setProv(provenance, 'epa.charge240Hours', 'epa');

  const country = lookupCountry(car.make);
  if (country) {
    car.countryOfOrigin = country;
    setProv(provenance, 'countryOfOrigin', 'estimated');
  }

  // HP/torque are NOT in EPA data — omit rather than invent misleading estimates

  return car;
}

export function completenessScore(car: Car): number {
  let score = 0;
  if (car.fuelEconomy.combined) score += 2;
  if (car.fuelEconomy.city) score += 1;
  if (car.fuelEconomy.highway) score += 1;
  if (car.safetyRating?.overall) score += 5;
  if (car.countryOfOrigin) score += 1;
  if (car.epa?.co2) score += 1;
  if (car.engine.displacement) score += 1;
  return score;
}
