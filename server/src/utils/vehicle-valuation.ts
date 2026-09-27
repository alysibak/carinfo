import type { CarSpecs, FuelType } from '../types/car.types.js';
import {
  getRegionalAssumptions,
  usdAnchorToCadValue,
  type RegionalAssumptions,
} from '../config/regional-assumptions.js';
import { inferEffectiveFuelType } from './fuel-type-inference.js';
import { deriveVariant } from './performance-trims.js';
import { isPorsche911 } from './porsche-911.js';

const REFERENCE_YEAR = new Date().getFullYear();

export type EvRetentionTier = 'A' | 'B' | 'C';
export type MarketSegment =
  'economy' | 'mainstream' | 'luxury' | 'performance' | 'utility' | 'exotic';
export type Confidence = 'low' | 'medium' | 'high';

export interface BatteryHealthEstimate {
  factor: number;
  label: string;
  chemistryNote: string;
}

export interface ConditionValueBand {
  label: string;
  low: number;
  high: number;
}

export interface MarketValueEstimate {
  low: number;
  high: number;
  mid: number;
  confidence: Confidence;
  confidenceLabel: string;
  conditionBands?: ConditionValueBand[];
  batteryHealth?: BatteryHealthEstimate;
  retentionTier?: EvRetentionTier;
  msrpAnchor: number;
  retainedFraction: number;
}

const LUXURY_MAKES = new Set([
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Porsche',
  'Lexus',
  'Jaguar',
  'Land Rover',
  'Infiniti',
  'Acura',
  'Cadillac',
  'Lincoln',
  'Genesis',
  'Volvo',
  'Maserati',
  'Ferrari',
  'Lamborghini',
  'Bentley',
  'Rolls-Royce',
  'Alfa Romeo',
  'Lucid',
  'Rivian',
  'Polestar',
  'Fisker',
  // The Revero and GS-6 listed at US$83,000-145,000; as a mainstream make a
  // 2018 Revero read $12,000 against listings near US$34,000 (Cars.com,
  // September 2026).
  'Karma',
]);

/**
 * Typical current US MSRP by marque, for makers whose cars no size class can
 * price. Anchoring them on a class with a multiplier valued a Bugatti Chiron
 * at $50,500, an Aston Martin DB12 at $21,250 and a Koenigsegg at $36,000.
 * These are still thin-market guesses, and are labelled low confidence.
 */
const MARQUE_ANCHORS_USD: Record<string, number> = {
  Bugatti: 3_500_000,
  'Bugatti Rimac': 3_500_000,
  Pagani: 3_200_000,
  Koenigsegg: 3_000_000,
  'Rolls-Royce': 420_000,
  Maybach: 400_000,
  'RUF Automobile': 300_000,
  Ferrari: 330_000,
  Lamborghini: 280_000,
  'McLaren Automotive': 280_000,
  Bentley: 250_000,
  Spyker: 250_000,
  Vector: 250_000,
  'Aston Martin': 230_000,
  Lotus: 110_000,
  Maserati: 110_000,
};

const EXOTIC_MAKES = new Set(
  Object.keys(MARQUE_ANCHORS_USD).filter((make) => make !== 'Lotus' && make !== 'Maserati'),
);

const BRAND_RETENTION: Record<string, number> = {
  Toyota: 1.08,
  // Toyota's youth brand (2004-2016), built and serviced by Toyota; it had no
  // entry and fell to the neutral 1.0 (a 2016 tC read $8,500 against listings
  // of $10,000-14,000 CAD).
  Scion: 1.08,
  // Lexus keeps more than the luxury curve (a 2018 RX lists ~57% of its sticker
  // at eight years); German makes, especially their SUVs, keep less (a 2015 X5
  // ~22% at eleven). CarGurus Canada averages, September 2026.
  Lexus: 1.18,
  BMW: 0.92,
  Audi: 0.92,
  Honda: 1.06,
  Mazda: 1.04,
  Subaru: 1.03,
  // Was 1.14. Tesla's 2023–25 price cuts took residuals down with them: a 2022
  // Model 3 lists around $32,600 CAD in 2026, about 55% of its original price.
  Tesla: 1.0,
  Ford: 1.0,
  Chevrolet: 0.98,
  Nissan: 0.96,
  Fiat: 0.88,
  Mitsubishi: 0.9,
  // A 2018 Ghibli lists around US$18,500, a quarter of its sticker (CarGurus,
  // September 2026).
  Maserati: 0.6,
  // A 2019 Q50 lists around US$19,100 and a QX60 ~US$16,200 (Cars.com).
  Infiniti: 0.85,
  // Bankrupt makers: no dealers, software updates or assured parts. A 2023
  // Fisker Ocean Extreme ($69,000 new) sells for about $16,000 in 2026.
  Fisker: 0.4,
  Lordstown: 0.4,
  // Karma: a 2018 Revero lists near US$34,000, about a quarter of its
  // US$131,000 sticker (Cars.com, September 2026).
  Karma: 0.6,
};

/**
 * Resale by make for mainstream cars, SUVs and minivans, where it differs most.
 * Against the same compact-SUV sticker, 2019 models list (CarGurus.ca,
 * September 2026) at: CR-V ~$25,600, CX-5 ~$21,200, Forester ~$21,400, Tucson
 * ~$17,300, Equinox ~$16,300, Rogue ~$16,100, Escape ~$15,800; sedans and
 * minivans split the same way (Camry, Sienna and Odyssey high; Altima, Malibu
 * and Grand Caravan low). With one factor for all segments, a 2019 CR-V came
 * out 17% under its listings and an Escape 26% over. Pickups, performance and
 * luxury cars keep BRAND_RETENTION.
 */
const MAINSTREAM_BRAND_RETENTION: Record<string, number> = {
  Toyota: 1.16,
  Scion: 1.1,
  Honda: 1.14,
  Subaru: 1.06,
  Mazda: 1.05,
  Kia: 0.92,
  Volkswagen: 0.92,
  Hyundai: 0.88,
  GMC: 0.9,
  Chrysler: 0.88,
  Dodge: 0.86,
  Buick: 0.85,
  Mitsubishi: 0.85,
  Nissan: 0.84,
  Chevrolet: 0.83,
  Ford: 0.82,
  Fiat: 0.8,
};

/**
 * A make's resale reputation shows over the first few years; a new car is
 * worth its sticker whoever built it. Without the ramp a new Ford would have
 * been marked 18% under its price on day one.
 */
function brandFactorAt(factor: number, age: number): number {
  return 1 + (factor - 1) * Math.min(1, age / 3);
}

/** A trim EPA leaves out of the name, whether or not the record carries it yet. */
function trimOf(car: CarSpecs): string | undefined {
  return car.variant ?? deriveVariant(car);
}

interface ModelMsrpRule {
  test: (car: CarSpecs) => boolean;
  msrp: number | ((car: CarSpecs) => number);
  /** The price is for the core trim; scale it by evTrimFactor for the others. */
  evTrims?: true;
}

/**
 * Where an EV trim sits against its line's core trim, from the words EPA puts
 * in its name. Before this, every trim of a line shared one price: a Mach-E GT
 * Performance matched the base RWD, and a Model S Plaid a Standard Range.
 */
export function evTrimFactor(car: CarSpecs): number {
  const m = car.model.toLowerCase();
  if (/\bmaybach\b/.test(m)) return 1.7;
  if (/\bplaid\b/.test(m)) return 1.35;
  if (
    /\b(performance|perf|ss|amg)\b|\bgt\b(?!-line)|\bp\d+d?\b|\bm\d0\b|^(rs|sq?\d?) |\be-tron s\b|\bn$/.test(
      m,
    )
  ) {
    return 1.2;
  }
  if (/\bstandard\b|\bmid range\b|\bsr\b|\blfp\b/.test(m)) return 0.9;
  let factor = 1;
  if (/\b(awd|4wd|dual motor|twin|e-4orce|4motion|4matic|quattro|xdrive)\b|\b\d+d\b/.test(m)) {
    factor *= 1.07;
  }
  if (/\blong range\b|\bextended\b|\ber\d?\b/.test(m)) factor *= 1.04;
  return factor;
}

/**
 * EPA names it "Civic Type R" only for 2017–18; since then it is a "Civic 5Dr"
 * with the 2.0-litre turbo and a manual, which no other Civic has.
 */
function isCivicTypeR(c: CarSpecs): boolean {
  return (
    c.make === 'Honda' &&
    /^civic/i.test(c.model) &&
    c.year >= 2017 &&
    c.engine.displacement === 2 &&
    c.engine.aspiration === 'turbocharged' &&
    c.transmission.type === 'manual'
  );
}

const cyl = (c: CarSpecs) => c.engine.cylinders ?? 0;
const litres = (c: CarSpecs) => c.engine.displacement ?? 0;

const luxTrim = (c: CarSpecs) =>
  /\b(cs|csl|gts|black series)\b/i.test(c.model)
    ? 1.35
    : /\bcompetition\b/i.test(c.model)
      ? 1.08
      : 1;
const lux = (make: string, model: RegExp, msrp: number): ModelMsrpRule => ({
  test: (c) => c.make === make && c.engine.fuelType !== 'electric' && model.test(c.model),
  msrp: (c) => msrp * luxTrim(c),
});

const LUXURY_PERFORMANCE_RULES: ModelMsrpRule[] = [
  // The i8 plug-in: about US$140,000 new, the Roadster $163,000. Priced as a
  // three-cylinder two-door it anchored at $47,700 and a 2014 read $15,750.
  {
    test: (c) => c.make === 'BMW' && /^i8\b/i.test(c.model),
    msrp: (c) => (/roadster/i.test(c.model) ? 163000 : 140000),
  },
  lux('BMW', /^alpina\b/i, 145000),
  lux('BMW', /^m2\b/i, 65000),
  lux('BMW', /^m3\b/i, 77000),
  lux('BMW', /^m4\b/i, 80000),
  lux('BMW', /^m5\b/i, 110000),
  lux('BMW', /^m6\b/i, 115000),
  lux('BMW', /^x[34] m\b(?!\d)/i, 76000),
  lux('BMW', /^x[56] m\b(?!\d)/i, 118000),
  lux('BMW', /^m2[34]\d/i, 50000),
  lux('BMW', /^m340/i, 58000),
  lux('BMW', /^m440/i, 62000),
  lux('BMW', /^m550/i, 80000),
  lux('BMW', /^m760/i, 120000),
  lux('BMW', /^x[12] m35/i, 50000),
  lux('BMW', /^x[34] m[45]0/i, 65000),
  lux('BMW', /^x[56] m[56]0/i, 90000),
  lux('BMW', /^x7 m[56]0/i, 105000),
  lux('Mercedes-Benz', /\b(a|cla|gla|glb) ?35\b/i, 50000),
  lux('Mercedes-Benz', /\b(a|cla|gla) ?45\b/i, 60000),
  lux('Mercedes-Benz', /\bslc ?43\b/i, 62000),
  lux('Mercedes-Benz', /\bslk ?55\b/i, 72000),
  lux('Mercedes-Benz', /\b(c ?43|c450 amg)\b/i, 62000),
  lux('Mercedes-Benz', /\bc ?63\b/i, 85000),
  lux('Mercedes-Benz', /\bcle ?53\b/i, 75000),
  lux('Mercedes-Benz', /\bcls ?53\b/i, 82000),
  lux('Mercedes-Benz', /\bcls ?63\b/i, 110000),
  lux('Mercedes-Benz', /\be ?43\b/i, 72000),
  lux('Mercedes-Benz', /\be ?53\b/i, 82000),
  lux('Mercedes-Benz', /\be ?63\b/i, 110000),
  lux('Mercedes-Benz', /\bglc ?43\b/i, 64000),
  lux('Mercedes-Benz', /\bglc ?63\b/i, 88000),
  lux('Mercedes-Benz', /\b(gle ?43|gle450 amg)\b/i, 72000),
  lux('Mercedes-Benz', /\bgle ?53\b/i, 90000),
  lux('Mercedes-Benz', /\b(gle|ml) ?63\b/i, 120000),
  lux('Mercedes-Benz', /\bgls? ?63\b/i, 140000),
  lux('Mercedes-Benz', /\bg ?(500|550)\b/i, 150000),
  lux('Mercedes-Benz', /\bg ?(55|63)\b/i, 180000),
  lux('Mercedes-Benz', /\bg ?65\b/i, 225000),
  lux('Mercedes-Benz', /\bs ?63\b/i, 180000),
  lux('Mercedes-Benz', /\bs ?65\b/i, 230000),
  lux('Mercedes-Benz', /\bcl ?63\b/i, 150000),
  lux('Mercedes-Benz', /\bcl ?65\b/i, 215000),
  lux('Audi', /^s3\b/i, 50000),
  lux('Audi', /^rs ?3\b/i, 62000),
  lux('Audi', /^s4\b/i, 52000),
  // The 2007-08 RS4 (US$66,900 new) had no rule and priced as an A4: $8,000.
  lux('Audi', /^rs ?4\b/i, 70000),
  lux('Audi', /^s5\b/i, 57000),
  lux('Audi', /^rs ?5\b/i, 80000),
  lux('Audi', /^s6\b/i, 75000),
  lux('Audi', /^rs ?6\b/i, 125000),
  lux('Audi', /^s7\b/i, 85000),
  lux('Audi', /^rs ?7\b/i, 130000),
  lux('Audi', /^s8\b/i, 120000),
  lux('Audi', /^sq5\b/i, 60000),
  lux('Audi', /^sq7\b/i, 95000),
  lux('Audi', /^sq8\b/i, 100000),
  lux('Audi', /^rs ?q8\b/i, 125000),
];

const exo = (make: string, model: RegExp, msrp: number): ModelMsrpRule => ({
  test: (c) => c.make === make && c.engine.fuelType !== 'electric' && model.test(c.model),
  msrp,
});

/**
 * Exotic and halo models priced by line rather than by marque. One figure per
 * make put a McLaren 570S and a 765LT, or a Roma and an Aventador, at the same
 * sticker, and priced a GT-R by its EPA size class ("Subcompact", $22,000).
 * Current US list prices of each line's successor.
 */
const EXOTIC_MODEL_RULES: ModelMsrpRule[] = [
  // First-generation R8s (2008–15) listed at $115,000–$175,000; the line
  // closed at about $200,000.
  {
    test: (c) => c.make === 'Audi' && /^r8\b/i.test(c.model),
    msrp: (c) => (c.year >= 2017 ? 200000 : 130000),
  },
  exo('Ferrari', /^(california|portofino|roma)\b/i, 250000),
  exo('Ferrari', /^(ff|gtc4)/i, 320000),
  exo('Ferrari', /^(599|f12|812|12cilindri)/i, 400000),
  exo('Ferrari', /^sf90/i, 530000),
  exo('Ferrari', /^purosangue/i, 400000),
  exo('Lamborghini', /^(aventador|revuelto|murcielago|l-147)/i, 600000),
  exo('Lamborghini', /^urus/i, 260000),
  exo('McLaren Automotive', /^(540c|570s|570gt|600lt|620r|gt)\b/i, 210000),
  exo('McLaren Automotive', /^artura/i, 240000),
  exo('McLaren Automotive', /^(mp4-12c|650s|675lt|720s|750s)/i, 310000),
  exo('McLaren Automotive', /^765lt/i, 380000),
  exo('Maserati', /^ghibli/i, 80000),
  exo('Maserati', /^levante/i, 95000),
  // By trim: one figure for all put a 2023 Trofeo (US$104,000 new) at the
  // GT's value.
  exo('Maserati', /^grecale trofeo/i, 104000),
  exo('Maserati', /^grecale modena/i, 80000),
  exo('Maserati', /^grecale/i, 67000),
  exo('Maserati', /^quattroporte/i, 115000),
  exo('Karma', /^revero gt/i, 145000),
  exo('Karma', /^revero/i, 130000),
  exo('Karma', /^gs-6/i, 83000),
  exo('Maserati', /^gran ?(turismo|cabrio)/i, 180000),
  exo('Maserati', /^(mc20|mcpura|gt2 stradale)/i, 250000),
  exo('Rolls-Royce', /^phantom/i, 520000),
  exo('Rolls-Royce', /^(ghost|wraith|dawn)/i, 360000),
  exo('Bentley', /^bentayga/i, 220000),
  exo('Bentley', /^mulsanne/i, 340000),
  exo('Aston Martin', /^dbx/i, 200000),
  exo('Aston Martin', /^(v8 |v12 )?vantage/i, 190000),
  exo('Aston Martin', /^(db9|db11|db12)/i, 245000),
  exo('Aston Martin', /^(dbs|v12 vanquish|vanquish)/i, 330000),
  exo('Aston Martin', /^valhalla/i, 1000000),
  exo('Lotus', /^elise|^exige/i, 60000),
  exo('Lotus', /^(evora|emira)/i, 100000),
  exo('Nissan', /^gt-r/i, 120000),
];

const litresAtLeast = (c: CarSpecs, l: number) => (c.engine.displacement ?? 0) >= l;

/**
 * Flagships, luxury SUVs and luxury performance sedans the size-class table
 * priced at half their sticker: an S 580 or a 750i at $52,700, a Range Rover
 * at $69,750, a CT5-V Blackwing at $46,440 and a Maybach S 680 at $64,000.
 * Current US list prices of each line, typical trim.
 */
/**
 * Enthusiast cars and MINIs the size-class table priced as their base car: a
 * GR Corolla at $22,000 (about $38,000–$50,000 new), a Focus RS at $27,000
 * (about $41,000), an S60 Polestar at $24,000 (about $61,000), a Polestar 1 at
 * $47,700 (about $155,000), and every MINI at $22,000 whatever its trim.
 */
const ENTHUSIAST_RULES: ModelMsrpRule[] = [
  { test: (c) => c.make === 'Toyota' && /^gr corolla/i.test(c.model), msrp: 42000 },
  { test: (c) => c.make === 'Ford' && /^focus rs/i.test(c.model), msrp: 41000 },
  { test: (c) => c.make === 'Volvo' && /polestar/i.test(c.model), msrp: 61000 },
  // Volvo by line; the luxury size-class table priced an XC90 above $69,000
  // and an XC60 like a C-Class.
  {
    test: (c) => c.make === 'Volvo' && c.engine.fuelType !== 'electric',
    msrp: (c) => {
      const m = c.model.toLowerCase();
      if (/^xc90/.test(m)) return 60000;
      if (/^xc60/.test(m)) return 46000;
      if (/^(xc40|c40)/.test(m)) return 42000;
      if (/^(xc70|v60 cross|v90 cross)/.test(m)) return 50000;
      if (/^(s90|v90|s80)/.test(m)) return 57000;
      if (/^(s60|v60)/.test(m)) return 45000;
      if (/^c70/.test(m)) return 42000;
      return 32000;
    },
  },
  {
    test: (c) => c.make === 'Polestar' && /^1\b/.test(c.model) && c.engine.fuelType !== 'electric',
    msrp: 155000,
  },
  {
    // Current US prices by line and trim: Cooper, Cooper S, John Cooper Works.
    test: (c) => c.make === 'MINI' && c.engine.fuelType !== 'electric',
    msrp: (c) => {
      const m = c.model.toLowerCase();
      const [base, s, jcw] = /countryman|paceman/.test(m)
        ? [34000, 40000, 46000]
        : /clubman|clubvan/.test(m)
          ? [30000, 34000, 42000]
          : [28500, 33000, 40000];
      const price = /john cooper works|\bjcw/.test(m)
        ? jcw
        : /cooper se?\b|countryman s\b/.test(m)
          ? s
          : base;
      return /convertible|roadster/.test(m) ? price + 5000 : price;
    },
  },
];

const FLAGSHIP_RULES: ModelMsrpRule[] = [
  // Mercedes-Benz S-Class (AMG models have their own rules) and Maybach.
  {
    test: (c) =>
      c.make === 'Mercedes-Benz' && /maybach/i.test(c.model) && /\bs ?\d{3}/i.test(c.model),
    msrp: (c) =>
      /convertible/i.test(c.model) ? 300000 : /\bs ?6[0-8]0\b/i.test(c.model) ? 240000 : 200000,
  },
  { test: (c) => c.make === 'Mercedes-Benz' && /^gls ?600.*maybach/i.test(c.model), msrp: 180000 },
  {
    test: (c) => c.make === 'Mercedes-Benz' && /^s ?\d{3}/i.test(c.model) && !/amg/i.test(c.model),
    msrp: (c) => {
      const n = Number(/^s ?(\d{3})/i.exec(c.model)![1]);
      const base = n >= 600 ? 175000 : n >= 500 ? 130000 : 118000;
      return /coupe|convertible/i.test(c.model) ? base * 1.08 : base;
    },
  },
  {
    test: (c) => c.make === 'Mercedes-Benz' && /^cl ?\d{3}/i.test(c.model) && !/amg/i.test(c.model),
    msrp: (c) => (/^cl ?6/i.test(c.model) ? 160000 : 115000),
  },
  // BMW 7 Series and X7 (the M760i and Alpinas have their own rules).
  {
    test: (c) => c.make === 'BMW' && /^7[1-6]\d/i.test(c.model),
    msrp: (c) =>
      /^760/i.test(c.model)
        ? c.year >= 2023
          ? 120000
          : 140000
        : /^750/i.test(c.model)
          ? 110000
          : 98000,
  },
  { test: (c) => c.make === 'BMW' && /^x7(?! m)/i.test(c.model), msrp: 85000 },
  {
    test: (c) => c.make === 'Audi' && /^a8/i.test(c.model),
    msrp: (c) => (cyl(c) >= 12 ? 135000 : 92000),
  },
  // EPA's weight classes put the GX and LX at one price; one lists at about
  // $55,000-$65,000, the other $90,000-$100,000.
  {
    test: (c) => c.make === 'Lexus' && /^gx\b/i.test(c.model),
    msrp: (c) => (c.year >= 2024 ? 65000 : 55000),
  },
  { test: (c) => c.make === 'Lexus' && /^lx\b/i.test(c.model), msrp: 95000 },
  { test: (c) => c.make === 'Audi' && /^q7\b/i.test(c.model), msrp: 60000 },
  { test: (c) => c.make === 'Audi' && /^q8\b/i.test(c.model), msrp: 75000 },
  {
    test: (c) => c.make === 'Lexus' && /^ls\b/i.test(c.model),
    msrp: (c) => (/600h/i.test(c.model) ? 120000 : 82000),
  },
  {
    test: (c) => c.make === 'Genesis' && /^g90/i.test(c.model),
    msrp: (c) => (c.year >= 2023 ? 90000 : 72000),
  },
  { test: (c) => c.make === 'Hyundai' && /^equus/i.test(c.model), msrp: 65000 },
  { test: (c) => c.make === 'Kia' && /^k900/i.test(c.model), msrp: 60000 },
  // Cadillac's flagship and V models (Blackwings by their engines).
  {
    test: (c) => c.make === 'Cadillac' && /^ct6/i.test(c.model),
    msrp: (c) => (litresAtLeast(c, 4) ? 90000 : 60000),
  },
  {
    test: (c) => c.make === 'Cadillac' && /^ct4[ -]?v/i.test(c.model),
    msrp: (c) => (litresAtLeast(c, 3.5) ? 62000 : 48000),
  },
  {
    test: (c) => c.make === 'Cadillac' && /^ct5[ -]?v/i.test(c.model),
    msrp: (c) => (litresAtLeast(c, 6) ? 95000 : 52000),
  },
  { test: (c) => c.make === 'Cadillac' && /^cts[ -]?v/i.test(c.model), msrp: 85000 },
  { test: (c) => c.make === 'Cadillac' && /^ats[ -]?v/i.test(c.model), msrp: 62000 },
  // Alfa Romeo: the Quadrifoglios share a 2.9-litre V6.
  {
    test: (c) => c.make === 'Alfa Romeo' && /^giulia/i.test(c.model),
    msrp: (c) => (c.engine.displacement === 2.9 ? 80000 : 46000),
  },
  {
    test: (c) => c.make === 'Alfa Romeo' && /^stelvio/i.test(c.model),
    msrp: (c) => (c.engine.displacement === 2.9 ? 90000 : 50000),
  },
  { test: (c) => c.make === 'Alfa Romeo' && /^4c/i.test(c.model), msrp: 70000 },
  // Jaguar sedans and SUVs.
  {
    test: (c) => c.make === 'Jaguar' && /^xj(?!s)/i.test(c.model),
    msrp: (c) => (/^xjr/i.test(c.model) ? 110000 : 80000),
  },
  { test: (c) => c.make === 'Jaguar' && /^xf/i.test(c.model), msrp: 50000 },
  { test: (c) => c.make === 'Jaguar' && /^xe/i.test(c.model), msrp: 45000 },
  {
    test: (c) => c.make === 'Jaguar' && /^f-pace/i.test(c.model),
    msrp: (c) => (/svr/i.test(c.model) ? 90000 : 58000),
  },
  { test: (c) => c.make === 'Jaguar' && /^e-pace/i.test(c.model), msrp: 50000 },
  // Land Rover, by line.
  {
    test: (c) => c.make === 'Land Rover' && /^(new )?range rover sport/i.test(c.model),
    msrp: (c) => (/\bsv/i.test(c.model) ? 135000 : 85000),
  },
  { test: (c) => c.make === 'Land Rover' && /^range rover velar/i.test(c.model), msrp: 65000 },
  { test: (c) => c.make === 'Land Rover' && /evoque/i.test(c.model), msrp: 52000 },
  { test: (c) => c.make === 'Land Rover' && /^range rover sv coupe/i.test(c.model), msrp: 250000 },
  {
    test: (c) => c.make === 'Land Rover' && /^(new )?range rover\b/i.test(c.model),
    msrp: (c) => (/\bsva?\b/i.test(c.model) ? 210000 : 120000),
  },
  { test: (c) => c.make === 'Land Rover' && /^discovery sport/i.test(c.model), msrp: 50000 },
  { test: (c) => c.make === 'Land Rover' && /^discovery\b/i.test(c.model), msrp: 62000 },
  { test: (c) => c.make === 'Land Rover' && /^lr4/i.test(c.model), msrp: 55000 },
  { test: (c) => c.make === 'Land Rover' && /^lr3/i.test(c.model), msrp: 50000 },
  { test: (c) => c.make === 'Land Rover' && /^(lr2|freelander)/i.test(c.model), msrp: 38000 },
  {
    test: (c) => c.make === 'Land Rover' && /^defender/i.test(c.model),
    msrp: (c) =>
      litresAtLeast(c, 5)
        ? 110000
        : /\b130\b/.test(c.model)
          ? 75000
          : /\b90\b/.test(c.model)
            ? 58000
            : 65000,
  },
  // Macan trims (the base Macan and the electric ones have their own rules).
  {
    test: (c) =>
      c.make === 'Porsche' &&
      c.engine.fuelType !== 'electric' &&
      /^macan (s|gts|turbo|t)\b/i.test(c.model),
    msrp: (c) =>
      /turbo/i.test(c.model)
        ? 105000
        : /gts/i.test(c.model)
          ? 92000
          : /^macan t\b/i.test(c.model)
            ? 72000
            : 80000,
  },
];

/**
 * Performance versions EPA files under the base model's name, told apart by
 * engine. A Mustang GT, a Camaro ZL1 or a Challenger Hellcat used to be priced
 * as the base car, half or a third of its sticker. US list prices by era.
 */
const PERFORMANCE_VARIANT_RULES: ModelMsrpRule[] = [
  // Ford Mustang (not the Mach-E)
  {
    test: (c) => c.make === 'Ford' && /mustang/i.test(c.model) && /gtd/i.test(c.model),
    msrp: 325000,
  },
  {
    test: (c) =>
      c.make === 'Ford' &&
      /mustang/i.test(c.model) &&
      (/gt500/i.test(c.model) || (c.engine.aspiration === 'supercharged' && c.year <= 2014)),
    msrp: (c) => (c.year >= 2020 ? 73000 : 55000),
  },
  { test: (c) => c.make === 'Ford' && /gt350/i.test(c.model), msrp: 60000 },
  { test: (c) => c.make === 'Ford' && /mustang dark horse/i.test(c.model), msrp: 60000 },
  { test: (c) => c.make === 'Ford' && /mustang bullitt/i.test(c.model), msrp: 47000 },
  { test: (c) => c.make === 'Ford' && /mustang mach 1/i.test(c.model), msrp: 53000 },
  {
    test: (c) =>
      c.make === 'Ford' && /^mustang/i.test(c.model) && !/mach-e/i.test(c.model) && cyl(c) >= 8,
    msrp: (c) =>
      (c.year >= 2024 ? 44000 : c.year >= 2018 ? 37000 : c.year >= 2011 ? 32000 : 27000) +
      (/convertible/i.test(c.model) ? 5000 : 0),
  },
  {
    test: (c) => c.make === 'Ford' && /^mustang/i.test(c.model) && !/mach-e/i.test(c.model),
    msrp: (c) =>
      (c.year >= 2024 ? 32000 : c.year >= 2015 ? 28000 : c.year >= 2011 ? 24000 : 20000) +
      (/convertible/i.test(c.model) ? 5000 : 0), // EcoBoost / V6
  },
  // Chevrolet Camaro
  {
    test: (c) => c.make === 'Chevrolet' && /^camaro/i.test(c.model) && litres(c) >= 7,
    msrp: 75000, // Z/28
  },
  {
    test: (c) =>
      c.make === 'Chevrolet' && /^camaro/i.test(c.model) && c.engine.aspiration === 'supercharged',
    msrp: (c) => (c.year >= 2017 ? 64000 : 56000), // ZL1
  },
  {
    test: (c) => c.make === 'Chevrolet' && /^camaro/i.test(c.model) && cyl(c) >= 8,
    msrp: (c) => (c.year >= 2016 ? 38000 : c.year >= 2010 ? 33000 : 26000), // SS
  },
  {
    test: (c) => c.make === 'Chevrolet' && /^camaro/i.test(c.model),
    msrp: (c) =>
      (c.year >= 2016 ? 27000 : c.year >= 2010 ? 24000 : 20000) +
      (/convertible/i.test(c.model) ? 6000 : 0), // 2.0T / V6
  },
  // Chevrolet Corvette
  { test: (c) => c.make === 'Chevrolet' && /corvette zr1x/i.test(c.model), msrp: 208000 },
  {
    test: (c) => c.make === 'Chevrolet' && /corvette zr1/i.test(c.model),
    msrp: (c) => (c.year >= 2025 ? 175000 : 120000),
  },
  {
    test: (c) =>
      c.make === 'Chevrolet' &&
      /^corvette/i.test(c.model) &&
      (/z06/i.test(c.model) || c.engine.aspiration === 'supercharged'),
    msrp: (c) => (c.year >= 2023 ? 110000 : 80000),
  },
  { test: (c) => c.make === 'Chevrolet' && /corvette e-ray/i.test(c.model), msrp: 105000 },
  {
    test: (c) => c.make === 'Chevrolet' && /^corvette/i.test(c.model),
    msrp: (c) => (c.year >= 2020 ? 68000 : c.year >= 2014 ? 56000 : 48000),
  },
  // Dodge Challenger / Charger
  { test: (c) => c.make === 'Dodge' && /demon/i.test(c.model), msrp: 100000 },
  {
    test: (c) =>
      c.make === 'Dodge' &&
      /^(challenger|charger)/i.test(c.model) &&
      c.engine.aspiration === 'supercharged',
    msrp: 70000, // SRT Hellcat
  },
  {
    test: (c) => c.make === 'Dodge' && /^(challenger|charger)/i.test(c.model) && litres(c) === 6.4,
    msrp: (c) => (/widebody/i.test(c.model) ? 50000 : 44000), // SRT 392 / Scat Pack
  },
  {
    test: (c) => c.make === 'Dodge' && /^(challenger|charger)/i.test(c.model) && litres(c) === 5.7,
    msrp: 37000, // R/T
  },
  {
    test: (c) => c.make === 'Dodge' && /^challenger/i.test(c.model),
    msrp: (c) => (c.year >= 2015 ? 30000 : 26000), // SXT / GT (V6)
  },
  {
    test: (c) => c.make === 'Dodge' && /^charger (?:2-dr )?daytona/i.test(c.model),
    msrp: (c) => (/scat pack/i.test(c.model) ? 73000 : 59000), // electric
  },
  {
    test: (c) =>
      c.make === 'Dodge' &&
      /^charger/i.test(c.model) &&
      c.year >= 2025 &&
      c.engine.aspiration === 'turbocharged',
    msrp: (c) => (/scat pack/i.test(c.model) ? 55000 : 50000), // Sixpack I6
  },
  // Other two-doors EPA files as small cars (see vehicle-taxonomy COUPE_NAMES):
  // without a rule they would take the generic $42,000 coupe anchor.
  {
    test: (c) => /^(subaru brz|toyota (gr )?86|scion fr-s)/i.test(`${c.make} ${c.model}`),
    msrp: (c) => (c.year >= 2022 ? 30000 : 27000),
  },
  {
    test: (c) => c.make === 'Lexus' && /^rc /i.test(c.model),
    msrp: (c) => (/\brc f\b/i.test(c.model) ? 68000 : 46000),
  },
  {
    test: (c) => c.make === 'Infiniti' && /^q60/i.test(c.model),
    msrp: (c) => (/red sport/i.test(c.model) ? 58000 : 44000),
  },
  { test: (c) => c.make === 'Honda' && /^civic 2dr/i.test(c.model), msrp: 23000 },
  { test: (c) => c.make === 'Kia' && /forte koup/i.test(c.model), msrp: 21000 },
  { test: (c) => c.make === 'Toyota' && /^celica/i.test(c.model), msrp: 22000 },
  { test: (c) => c.make === 'Honda' && /^prelude/i.test(c.model), msrp: 26000 },
  { test: (c) => c.make === 'Mitsubishi' && /^eclipse(?! cross)/i.test(c.model), msrp: 24000 },
  { test: (c) => c.make === 'Scion' && /^tc\b/i.test(c.model), msrp: 20000 },
  // Luxury flagships the cylinder table would undersell.
  { test: (c) => c.make === 'Acura' && /^nsx/i.test(c.model) && c.year >= 2016, msrp: 157000 },
  // BMW M, Mercedes-AMG and Audi S/RS. Luxury sedans anchor on their size
  // class, so a new M3 came out at $48,000 (a C300's value) and an M4, M4
  // Competition and M440i all at one $70,000. Current US prices of the core
  // model; Competition, S and CS/CSL/GTS trims scale from it.
  ...LUXURY_PERFORMANCE_RULES,
  {
    test: (c) => c.make === 'Mercedes-Benz' && /amg gt\b/i.test(c.model),
    msrp: (c) =>
      /black series/i.test(c.model) ? 325000 : /\bgt r\b/i.test(c.model) ? 165000 : 130000,
  },
  {
    test: (c) => c.make === 'Mercedes-Benz' && /^(amg )?sl ?\d/i.test(c.model),
    msrp: (c) => (cyl(c) >= 8 ? 115000 : 90000),
  },
  { test: (c) => c.make === 'BMW' && /^m8\b/i.test(c.model), msrp: 133000 },
  {
    test: (c) => c.make === 'BMW' && /^(m850i|840i)/i.test(c.model),
    msrp: (c) => (/m850i/i.test(c.model) ? 112000 : 90000),
  },
  // Two-seaters (EPA "Two Seaters" has no size class to price from).
  {
    test: (c) => c.make === 'Mazda' && /^mx-5/i.test(c.model),
    msrp: (c) => (c.year >= 2016 ? 30000 : 25000),
  },
  {
    test: (c) => c.make === 'Nissan' && /^(350z|370z|z)\b/i.test(c.model),
    msrp: (c) => (c.year >= 2023 ? 42000 : c.year >= 2009 ? 33000 : 30000),
  },
  {
    test: (c) => c.make === 'Audi' && /^tt/i.test(c.model),
    msrp: (c) => (/tt ?rs/i.test(c.model) ? 72000 : /tts/i.test(c.model) ? 55000 : 48000),
  },
  { test: (c) => /^(pontiac solstice|saturn sky)/i.test(`${c.make} ${c.model}`), msrp: 25000 },
  { test: (c) => c.make === 'Toyota' && /^mr2/i.test(c.model), msrp: 25000 },
  { test: (c) => c.make === 'Fiat' && /124 spider/i.test(c.model), msrp: 27000 },
  // City cars and small hybrids EPA also files as two-seaters: they took the
  // class's sports-car price ($42,000-48,000), so a 2017 smart fortwo was
  // worth $28,000 CAD and a CR-Z $28,500.
  {
    test: (c) => c.make === 'smart' && /^fortwo/i.test(c.model) && c.engine.fuelType !== 'electric',
    // The 2016 third generation sold at US$14,650-18,480, the cabrio $17,650-21,480.
    msrp: (c) =>
      /convertible|cabriolet/i.test(c.model)
        ? c.year >= 2016
          ? 20000
          : 18000
        : c.year >= 2016
          ? 16500
          : 15000,
  },
  { test: (c) => c.make === 'Honda' && /^cr-z/i.test(c.model), msrp: 22000 },
  { test: (c) => c.make === 'Honda' && /del sol/i.test(c.model), msrp: 17000 },
  { test: (c) => c.make === 'Suzuki' && /^x-90/i.test(c.model), msrp: 14000 },
  // Trucks and SUVs with a performance engine
  {
    test: (c) => c.make === 'Ford' && /f150 raptor r/i.test(c.model),
    msrp: 110000,
  },
  { test: (c) => c.make === 'Ford' && /^ranger raptor/i.test(c.model), msrp: 57000 },
  {
    test: (c) => c.make === 'Ford' && /raptor/i.test(c.model),
    msrp: (c) => (c.year >= 2021 ? 70000 : c.year >= 2017 ? 52000 : 45000),
  },
  { test: (c) => c.make === 'Ram' && /trx/i.test(c.model), msrp: 80000 },
  {
    test: (c) =>
      c.make === 'Jeep' &&
      /grand cherokee/i.test(c.model) &&
      c.engine.aspiration === 'supercharged',
    msrp: 87000, // Trackhawk
  },
  {
    test: (c) => c.make === 'Jeep' && /grand cherokee/i.test(c.model) && litres(c) === 6.4,
    msrp: 67000, // SRT
  },
];

const isEv = (c: CarSpecs) => c.engine.fuelType === 'electric';
const evLine = (make: string, model: RegExp) => (c: CarSpecs) =>
  isEv(c) && c.make.toLowerCase() === make.toLowerCase() && model.test(c.model);

/**
 * Launch prices (USD, core trim) for EV lines the size-class anchor gets
 * wrong. EPA files EVs in odd classes (the Ariya and the $340,000 Celestiq as
 * "Small Station Wagons", the e-tron GT as "Subcompact"), so the generic path
 * put a Celestiq at $45,000, an Ariya at $29,000 and a smart EQ at $47,000.
 */
const EV_LINE_RULES: ModelMsrpRule[] = [
  { test: evLine('Acura', /^zdx/i), msrp: 65000, evTrims: true },
  {
    test: evLine('Audi', /e-tron gt/i),
    msrp: (c) =>
      /^rs.*performance/i.test(c.model)
        ? 170000
        : /^rs/i.test(c.model)
          ? 143000
          : /^s /i.test(c.model)
            ? 126000
            : 104000,
  },
  { test: evLine('Audi', /^q4\b/i), msrp: 50000, evTrims: true },
  { test: evLine('Audi', /^s?q6\b/i), msrp: 64000, evTrims: true },
  { test: evLine('Audi', /^s?a?6 e-tron/i), msrp: 66000, evTrims: true },
  {
    test: evLine('Audi', /^(s?q8 )?(sportback )?e-tron|^sq8/i),
    msrp: (c) => (c.year >= 2024 ? 74000 : 68000),
    evTrims: true,
  },
  { test: evLine('BMW', /^i4\b/i), msrp: 56000, evTrims: true },
  { test: evLine('BMW', /^i5\b/i), msrp: 67000, evTrims: true },
  { test: evLine('BMW', /^i7\b/i), msrp: 106000, evTrims: true },
  { test: evLine('BMW', /^ix3\b/i), msrp: 60000, evTrims: true },
  { test: evLine('BMW', /^ix\b/i), msrp: 80000, evTrims: true },
  { test: evLine('Cadillac', /^celestiq/i), msrp: 340000 },
  { test: evLine('Cadillac', /^lyriq/i), msrp: 60000, evTrims: true },
  { test: evLine('Cadillac', /^optiq/i), msrp: 54000, evTrims: true },
  { test: evLine('Cadillac', /^vistiq/i), msrp: 78000, evTrims: true },
  {
    // $56,000 at launch (2LT/RS), cut to about $45,000 for 2025.
    test: evLine('Chevrolet', /^blazer ev/i),
    msrp: (c) => (c.year >= 2025 ? 47000 : 54000),
    evTrims: true,
  },
  { test: evLine('Chevrolet', /^equinox ev/i), msrp: 36000, evTrims: true },
  {
    test: evLine('Chevrolet', /^silverado ev/i),
    msrp: (c) => (c.year >= 2026 ? 70000 : 78000),
  },
  { test: evLine('Chevrolet', /^spark ev/i), msrp: 27500 },
  { test: evLine('GMC', /^sierra ev/i), msrp: (c) => (c.year >= 2026 ? 80000 : 100000) },
  {
    test: evLine('Fisker', /^ocean/i),
    msrp: (c) => (/extreme|one/i.test(c.model) ? 61500 : /ultra/i.test(c.model) ? 50000 : 39000),
  },
  { test: evLine('Genesis', /^gv60/i), msrp: 52000, evTrims: true },
  { test: evLine('Genesis', /gv70/i), msrp: 66000 },
  { test: evLine('Genesis', /g80/i), msrp: 80000 },
  { test: evLine('Honda', /^prologue/i), msrp: 48000, evTrims: true },
  { test: evLine('Hyundai', /^ioniq 9/i), msrp: 60000, evTrims: true },
  { test: evLine('Hyundai', /^ioniq electric/i), msrp: 32000 },
  { test: evLine('Jaguar', /^i-pace/i), msrp: 70000 },
  { test: evLine('Jeep', /^wagoneer s/i), msrp: 72000 },
  { test: evLine('Kia', /^ev9/i), msrp: 56000, evTrims: true },
  { test: evLine('Kia', /^soul (ev|electric)/i), msrp: 34000 },
  { test: evLine('Lexus', /^rz\b/i), msrp: 57000, evTrims: true },
  { test: evLine('Maserati', /^gran(turismo|cabrio) folgore/i), msrp: 205000 },
  { test: evLine('Maserati', /^grecale folgore/i), msrp: 103000 },
  { test: evLine('Mazda', /^mx-30/i), msrp: 34500 },
  { test: evLine('MINI', /^cooper se/i), msrp: 31000 },
  { test: evLine('MINI', /^countryman se/i), msrp: 45000 },
  { test: evLine('Mercedes-Benz', /^eqb/i), msrp: 54000, evTrims: true },
  { test: evLine('Mercedes-Benz', /^cla\d+/i), msrp: 48000, evTrims: true },
  { test: evLine('Mercedes-Benz', /^g ?580/i), msrp: 162000 },
  { test: evLine('Mercedes-Benz', /^(b-class|b250e)/i), msrp: 41500 },
  { test: evLine('Nissan', /^ariya/i), msrp: 45000, evTrims: true },
  { test: evLine('Polestar', /^2\b/), msrp: 48000, evTrims: true },
  { test: evLine('Polestar', /^3\b/), msrp: 67000, evTrims: true },
  { test: evLine('Polestar', /^4\b/), msrp: 54000, evTrims: true },
  { test: evLine('smart', /./), msrp: 25000 },
  { test: evLine('Subaru', /^solterra/i), msrp: 45000, evTrims: true },
  { test: evLine('Subaru', /^(trailseeker|uncharted)/i), msrp: 40000, evTrims: true },
  {
    test: evLine('Tesla', /^cybertruck/i),
    msrp: (c) =>
      /cyberbeast/i.test(c.model) ? 100000 : /long range/i.test(c.model) ? 70000 : 80000,
  },
  { test: evLine('Toyota', /^bz4x/i), msrp: 42000, evTrims: true },
  { test: evLine('Toyota', /^bz\b/i), msrp: 37000, evTrims: true },
  { test: evLine('Toyota', /^c-hr/i), msrp: 38000, evTrims: true },
  { test: evLine('Vinfast', /^vf ?6/i), msrp: 35000 },
  { test: evLine('Vinfast', /^vf ?7/i), msrp: 40000 },
  { test: evLine('Vinfast', /^vf ?8/i), msrp: 47000 },
  { test: evLine('Vinfast', /^vf ?9/i), msrp: 76000 },
  { test: evLine('Volkswagen', /^id\. ?buzz/i), msrp: 60000, evTrims: true },
  { test: evLine('Volkswagen', /^e-golf/i), msrp: 31000 },
  { test: evLine('Volvo', /^ex30/i), msrp: 40000, evTrims: true },
  { test: evLine('Volvo', /^ex90/i), msrp: 76000, evTrims: true },
  { test: evLine('Volvo', /^(xc40|c40|ex40|ec40)/i), msrp: 54000, evTrims: true },
];

/**
 * Mid-size pickups (Tacoma, Colorado, Ranger, Frontier...). EPA files many in
 * "Standard Pickup Trucks" by weight, so the name decides. They keep more of
 * their value than full-size trucks: a 2019 Colorado lists at ~$27,100 CAD
 * (CarGurus.ca, September 2026), about 70% of its sticker at seven years.
 */
const MIDSIZE_PICKUP_NAMES =
  /^(colorado|canyon|tacoma|frontier|ranger|ridgeline|gladiator|dakota|s10|sonoma|maverick|santa cruz|explorer sport trac|baja)\b/i;

export function isMidsizePickup(car: CarSpecs): boolean {
  if (MIDSIZE_PICKUP_NAMES.test(car.model)) return true;
  return car.bodyStyle === 'truck' && /^small pickup/i.test(car.epa?.vClass ?? '');
}

/**
 * Trucks and body-on-frame SUVs whose size class misprices them. Prices are
 * the mid trim of the generation (USD).
 */
const TRUCK_SUV_RULES: ModelMsrpRule[] = [
  {
    test: (c) => c.make === 'Toyota' && /^tacoma/i.test(c.model),
    msrp: (c) => (c.year >= 2024 ? 44000 : c.year >= 2016 ? 38000 : 30000),
  },
  {
    test: (c) => /^(chevrolet|gmc)$/i.test(c.make) && /^(colorado|canyon)/i.test(c.model),
    msrp: (c) => {
      const base = c.year >= 2023 ? 40000 : 36000;
      const trim = /zr2|at4x/i.test(c.model) ? 1.25 : 1;
      return base * trim * (c.make === 'GMC' ? 1.08 : 1);
    },
  },
  {
    test: (c) => c.make === 'Nissan' && /^frontier/i.test(c.model),
    msrp: (c) => (c.year >= 2022 ? 38000 : 30000),
  },
  { test: (c) => c.make === 'Ford' && /^ranger/i.test(c.model) && c.year >= 2019, msrp: 36000 },
  { test: (c) => c.make === 'Ford' && /^maverick/i.test(c.model), msrp: 30000 },
  { test: (c) => c.make === 'Honda' && /^ridgeline/i.test(c.model), msrp: 42000 },
  { test: (c) => c.make === 'Hyundai' && /^santa cruz/i.test(c.model), msrp: 34000 },
  { test: (c) => c.make === 'Jeep' && /^gladiator/i.test(c.model), msrp: 46000 },
  // Pickups EPA filed as SUVs, which anchored on the SUV classes: a 2012
  // Avalanche listed at $12,000 against ~$15,000 on CarGurus.ca, a 2008 Sport
  // Trac at $9,000 against ~$10,900.
  { test: (c) => c.make === 'Chevrolet' && /^avalanche/i.test(c.model), msrp: 50000 },
  { test: (c) => c.make === 'Ford' && /^explorer sport trac/i.test(c.model), msrp: 38000 },
  {
    // Every Wrangler shared the $30,000 small-SUV anchor: a 2018 listed at
    // $18,500 against ~$24,300 on CarGurus.ca.
    test: (c) => c.make === 'Jeep' && /wrangler/i.test(c.model),
    msrp: (c) => {
      if (litres(c) >= 6) return 80000; // 392
      if (/4xe/i.test(c.model)) return 52000;
      const fourDoor = /unlimited|4dr/i.test(c.model);
      const base = c.year >= 2018 ? (fourDoor ? 38000 : 33000) : fourDoor ? 32000 : 28000;
      return /rubic/i.test(c.model) ? base + 8000 : base;
    },
  },
  {
    // The full-size Bronco, not the Bronco Sport (Raptor has its own rule).
    test: (c) => c.make === 'Ford' && /^bronco\b(?! sport)/i.test(c.model) && c.year >= 2021,
    msrp: (c) => (litres(c) >= 2.6 ? 50000 : 42000),
  },
  {
    test: (c) => c.make === 'Toyota' && /^4runner/i.test(c.model),
    msrp: (c) => (c.year >= 2025 ? 48000 : c.year >= 2010 ? 40000 : 34000),
  },
  {
    test: (c) => c.make === 'Toyota' && /^land cruiser/i.test(c.model),
    msrp: (c) => (c.year >= 2024 ? 58000 : c.year >= 2008 ? 85000 : 60000),
  },
  // Full-size SUVs without a V8 took the class's US$45,000 with no V8 uplift:
  // a 2024 Expedition read $40,000 against a $66,849 CarGurus.ca average, a
  // 2020 $26,500 against $44,619, a 2024 Sequoia $52,000 against ~$90,500.
  {
    test: (c) => c.make === 'Ford' && /^expedition/i.test(c.model) && c.year >= 2015,
    msrp: (c) => (c.year >= 2018 ? 72000 : 55000),
  },
  { test: (c) => c.make === 'Toyota' && /^sequoia/i.test(c.model) && c.year >= 2023, msrp: 75000 },
  { test: (c) => c.make === 'Jeep' && /^grand wagoneer/i.test(c.model), msrp: 95000 },
  { test: (c) => c.make === 'Jeep' && /^wagoneer(?! s)/i.test(c.model), msrp: 70000 },
  {
    test: (c) => c.make === 'Toyota' && /^highlander/i.test(c.model),
    msrp: (c) => (c.year >= 2020 ? 42000 : c.year >= 2014 ? 38000 : 32000),
  },
  {
    test: (c) => c.make === 'Toyota' && /^rav4 (prime|plug-in)/i.test(c.model),
    msrp: (c) => (c.year >= 2025 ? 45000 : 40000),
  },
  { test: (c) => c.make === 'Chrysler' && /^pacifica hybrid/i.test(c.model), msrp: 43000 },
  // Sold on discount to fleets and families: about $30,000 transacted, not
  // the minivan class's $38,000 (a 2019 lists at ~$18,000 on CarGurus.ca).
  {
    test: (c) => /^(dodge|chrysler)$/i.test(c.make) && /grand caravan|^caravan/i.test(c.model),
    msrp: 32000,
  },
];

const MODEL_MSRP_RULES: ModelMsrpRule[] = [
  ...EV_LINE_RULES,
  ...TRUCK_SUV_RULES,
  ...EXOTIC_MODEL_RULES,
  ...FLAGSHIP_RULES,
  ...ENTHUSIAST_RULES,
  {
    test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model s'),
    msrp: (c) => (c.year >= 2021 ? 95000 : c.year >= 2016 ? 85000 : 75000),
    evTrims: true,
  },
  {
    test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model 3'),
    msrp: (c) => (c.year >= 2021 ? 48000 : 42000),
    evTrims: true,
  },
  {
    test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model x'),
    msrp: (c) => (c.year >= 2021 ? 105000 : 90000),
    evTrims: true,
  },
  {
    test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model y'),
    msrp: (c) => (c.year >= 2021 ? 55000 : 50000),
    evTrims: true,
  },
  {
    test: (c) => c.make === 'Nissan' && c.model.toLowerCase().includes('leaf'),
    msrp: (c) => (c.year >= 2018 ? 35000 : c.year >= 2013 ? 32000 : 28000),
  },
  {
    // $33,220 for the 2016–19 car; the 2011 launch price was $41,000.
    test: (c) => c.make === 'Chevrolet' && c.model.toLowerCase().includes('volt'),
    msrp: (c) => (c.year >= 2016 ? 34000 : 38000),
  },
  { test: (c) => c.make === 'Fiat' && c.model.toLowerCase().includes('500e'), msrp: 33000 },
  {
    test: (c) => c.make === 'BMW' && c.model.toLowerCase().includes('i3'),
    msrp: (c) => (c.year >= 2018 ? 45000 : 43000),
  },
  {
    // $36,500 at launch; cut to $31,500 for 2022 and $26,500 for 2023, and the
    // 2027 relaunch starts near $29,000. The old rule anchored the 2017–21 cars
    // on the post-cut price, which put a 2017 Bolt at half its asking price.
    test: (c) => c.make === 'Chevrolet' && c.model.toLowerCase().includes('bolt'),
    msrp: (c) =>
      c.year >= 2027 ? 29000 : c.year >= 2023 ? 27000 : c.year === 2022 ? 32000 : 36500,
  },
  {
    test: (c) => c.make === 'Hyundai' && /^kona electric/i.test(c.model),
    msrp: (c) => (c.year >= 2024 ? 34000 : 37000),
  },
  {
    test: (c) => c.make === 'Kia' && /^niro (electric|ev)/i.test(c.model),
    msrp: 40000,
  },
  {
    test: (c) => c.make === 'Kia' && /^ev6/i.test(c.model),
    msrp: (c) =>
      /\bgt$/i.test(c.model)
        ? 62000
        : /standard/i.test(c.model)
          ? 43000
          : /awd/i.test(c.model)
            ? 52000
            : 47000,
  },
  {
    test: (c) => c.make === 'Volkswagen' && /^id\.4/i.test(c.model),
    msrp: (c) =>
      /pro s/i.test(c.model)
        ? /awd/i.test(c.model)
          ? 48000
          : 44500
        : /awd|1st/i.test(c.model)
          ? 44000
          : 40000,
  },
  { test: (c) => `${c.make} ${c.model}`.toLowerCase().includes('hummer ev'), msrp: 105000 },
  {
    test: (c) => c.model.toLowerCase().includes('lc 500') || c.model.toLowerCase().startsWith('lc'),
    msrp: 105000,
  },
  { test: (c) => c.model.toLowerCase().includes('mirai'), msrp: 52000 },
  { test: (c) => c.make === 'Rivian' && /^r2\b/i.test(c.model), msrp: 50000 },
  {
    // The 2022 launch trucks were quad-motor at this price; later lines split
    // into Dual Standard ($69,900) through Quad ($115,900).
    test: (c) => c.make === 'Rivian',
    msrp: (c) => {
      const m = c.model.toLowerCase();
      const base = m.includes('r1t') ? 79000 : 78000;
      const motors = /\bquad\b/.test(m) && c.year >= 2025 ? 1.4 : /\btri\b/.test(m) ? 1.25 : 1;
      const pack = /\bmax\b/.test(m) ? 1.08 : /\bstandard\b/.test(m) ? 0.9 : 1;
      return base * motors * pack * (/\bperformance\b/.test(m) ? 1.06 : 1);
    },
  },
  {
    test: (c) => c.make === 'Volkswagen' && /gti/i.test(c.model),
    msrp: (c) => (c.year >= 2022 ? 32000 : c.year >= 2018 ? 29000 : c.year >= 2015 ? 26500 : 25000),
  },
  {
    test: (c) => c.make === 'Volkswagen' && /golf r/i.test(c.model),
    msrp: (c) => (c.year >= 2022 ? 45000 : c.year >= 2016 ? 40000 : 36000),
  },
  {
    test: (c) => c.make === 'Honda' && (/civic si/i.test(c.model) || trimOf(c) === 'Si'),
    msrp: (c) => (c.year >= 2022 ? 29000 : 24000),
  },
  {
    test: (c) => c.make === 'Honda' && (/type r/i.test(c.model) || isCivicTypeR(c)),
    msrp: (c) => (c.year >= 2023 ? 44000 : 36000),
  },
  ...PERFORMANCE_VARIANT_RULES,
  // EPA files the STI as "Impreza" (to 2014) or "WRX" (2015–21); the trim comes
  // from the engine and gearbox (performance-trims.ts).
  {
    test: (c) => c.make === 'Subaru' && /\bsti\b/i.test(`${c.model} ${trimOf(c) ?? ''}`),
    msrp: 38000,
  },
  {
    test: (c) => c.make === 'Subaru' && /wrx/i.test(`${c.model} ${trimOf(c) ?? ''}`),
    msrp: (c) => (c.year >= 2022 ? 32000 : c.year >= 2015 ? 28000 : 26000),
  },
  { test: (c) => c.make === 'Ford' && /focus st|fiesta st/i.test(c.model), msrp: 26000 },
  {
    test: (c) => c.make === 'Hyundai' && /elantra n|veloster n/i.test(c.model),
    msrp: (c) => (c.year >= 2022 ? 34000 : 28000),
  },
  { test: (c) => c.make === 'Lucid' && /sapphire/i.test(c.model), msrp: 249000 },
  { test: (c) => c.make === 'Lucid' && /^gravity/i.test(c.model), msrp: 95000 },
  // Dream Edition (2022 only) and Grand Touring Performance.
  { test: (c) => c.make === 'Lucid' && /dream/i.test(c.model), msrp: 169000 },
  { test: (c) => c.make === 'Lucid' && /\bgt p\b/i.test(c.model), msrp: 155000 },
  {
    test: (c) => c.make === 'Lucid' && /grand touring|g touring/i.test(c.model),
    msrp: (c) => (c.year >= 2023 ? 139000 : 125000),
  },
  {
    test: (c) => c.make === 'Lucid' && /touring/i.test(c.model),
    msrp: (c) => (c.year >= 2024 ? 95000 : 87500),
  },
  {
    test: (c) => c.make === 'Lucid',
    msrp: (c) => (c.year >= 2024 ? 82000 : c.year >= 2022 ? 77400 : 70000),
  },
  {
    // One price for every Taycan put a Turbo S (about $190,000) at $96,000.
    test: (c) => c.make === 'Porsche' && c.model.toLowerCase().includes('taycan'),
    msrp: (c) => {
      const m = c.model.toLowerCase();
      const trim = /turbo gt/.test(m)
        ? 231000
        : /turbo s/.test(m)
          ? 190000
          : /turbo/.test(m)
            ? 155000
            : /gts/.test(m)
              ? 135000
              : /\b4s\b/.test(m)
                ? 110000
                : 92000;
      return /cross turismo|sport turismo|\bst\b/.test(m) ? trim * 1.04 : trim;
    },
  },
  {
    test: (c) => c.make === 'Mercedes-Benz' && /eqs/i.test(c.model),
    msrp: (c) => (c.year >= 2022 ? 105000 : 95000),
    evTrims: true,
  },
  {
    test: (c) => c.make === 'Mercedes-Benz' && /eqe/i.test(c.model),
    msrp: (c) => (c.year >= 2023 ? 78000 : 72000),
    evTrims: true,
  },
  {
    test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq 6'),
    msrp: (c) => (c.year >= 2024 ? 52000 : 48000),
    evTrims: true,
  },
  { test: (c) => c.make === 'Hyundai' && /^ioniq 5 n$/i.test(c.model), msrp: 66000 },
  {
    test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq 5'),
    msrp: (c) => (c.year >= 2024 ? 50000 : 45000),
    evTrims: true,
  },
  {
    // Every Lightning is 4WD, so the generic trim words do not apply.
    test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('f-150 lightning'),
    msrp: (c) => {
      const m = c.model.toLowerCase();
      if (/platinum/.test(m)) return 90000;
      if (/\bpro\b/.test(m)) return c.year >= 2023 ? 52000 : 42000;
      return /extended|\ber\d?\b/.test(m) ? 76000 : 60000;
    },
  },
  {
    test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('mustang mach-e'),
    msrp: (c) => (c.year >= 2022 ? 52000 : 48000),
    evTrims: true,
  },
  { test: (c) => c.model.toLowerCase().includes('escalade'), msrp: 85000 },
  { test: (c) => c.make === 'Mitsubishi' && c.model.toLowerCase().includes('i-miev'), msrp: 30000 },
  {
    test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('focus electric'),
    msrp: 32000,
  },
  // Subcompact nameplates. EPA files several as "Compact" by interior volume
  // (the Versa), which would anchor them at a Corolla's price. The Spark rule
  // used to say $26,000; it listed around $14,000.
  { test: (c) => c.make === 'Chevrolet' && c.model.toLowerCase().includes('spark'), msrp: 14000 },
  {
    test: (c) =>
      /^(nissan (versa|micra)|mitsubishi mirage|kia rio|hyundai accent|chevrolet (sonic|aveo)|toyota yaris|honda fit|ford fiesta)\b/i.test(
        `${c.make} ${c.model}`,
      ) && !/\bst\b/i.test(c.model),
    msrp: 17500,
  },
  {
    test: (c) => c.make === 'Toyota' && c.model.toLowerCase().includes('prius prime'),
    msrp: 34000,
  },
  { test: (c) => c.make === 'Honda' && c.model.toLowerCase().includes('clarity'), msrp: 36000 },
  {
    test: (c) => c.make === 'Porsche' && c.model.toLowerCase().includes('cayenne'),
    msrp: (c) => (c.year >= 2020 ? 98000 : c.year >= 2016 ? 88000 : 78000),
  },
  {
    test: (c) => isPorsche911(c),
    msrp: (c) => (/turbo|gt2|gt3|dakar|s\/t/i.test(c.model) ? 220000 : 135000),
  },
  { test: (c) => c.make === 'Porsche' && /^(718|boxster|cayman)\b/i.test(c.model), msrp: 80000 },
  {
    test: (c) => c.make === 'Porsche' && /^macan\b.*\belectric$/i.test(c.model),
    msrp: (c) => {
      const m = c.model.toLowerCase();
      return /turbo/.test(m)
        ? 106000
        : /gts/.test(m)
          ? 104000
          : /\b4s\b/.test(m)
            ? 88000
            : /\b4\b/.test(m)
              ? 80000
              : 76000;
    },
  },
  {
    test: (c) => c.make === 'Porsche' && c.model === 'Macan',
    msrp: (c) => (c.year >= 2022 ? 72000 : 65000),
  },
  {
    test: (c) => c.make === 'Porsche' && c.model.toLowerCase().includes('panamera'),
    msrp: (c) => (c.year >= 2020 ? 105000 : 95000),
  },
  {
    test: (c) => c.make === 'BMW' && c.model.toLowerCase().startsWith('x5'),
    // xDrive40i from 2019; the 2014–18 xDrive35i listed around $55,000.
    msrp: (c) => (c.year >= 2019 ? 62000 : c.year >= 2014 ? 55000 : 50000),
  },
  {
    test: (c) => c.make === 'BMW' && c.model.toLowerCase().startsWith('x3'),
    msrp: (c) => (c.year >= 2020 ? 52000 : 46000),
  },
  {
    test: (c) => c.make === 'Mercedes-Benz' && c.model.toLowerCase().includes('gle'),
    msrp: (c) => (c.year >= 2020 ? 78000 : 70000),
  },
];

function modelKey(car: CarSpecs): string {
  return `${car.make} ${car.model}`.toLowerCase();
}

/** Corrected fuel type — accounts for EPA PHEV mislabels. */
export function effectiveFuelType(car: CarSpecs): FuelType {
  return inferEffectiveFuelType(car);
}

function isHeavyEvTruck(car: CarSpecs): boolean {
  return (
    car.bodyStyle === 'truck' &&
    car.engine.fuelType === 'electric' &&
    (car.model.toLowerCase().includes('hummer') || car.model.toLowerCase().includes('rivian'))
  );
}

function isLuxuryPerformance(car: CarSpecs): boolean {
  const m = car.model.toLowerCase();
  return (
    (car.bodyStyle === 'coupe' && LUXURY_MAKES.has(car.make)) ||
    m.includes('lc ') ||
    m.startsWith('lc')
  );
}

export function classifyMarketSegment(car: CarSpecs): MarketSegment {
  if (EXOTIC_MAKES.has(car.make)) return 'exotic';
  if (isLuxuryPerformance(car) || LUXURY_MAKES.has(car.make)) return 'luxury';
  if (car.bodyStyle === 'truck' || car.bodyStyle === 'van') return 'utility';
  // Sports cars hold their value; a Cobalt, Altima or Forte coupe depreciates
  // like the sedan it is built from (on the performance curve a 2010 Cobalt
  // Coupe was worth $9,500 and the sedan $6,250). Convertibles, even everyday
  // ones, hold value better than their sedans and stay on it.
  if (
    car.bodyStyle === 'convertible' ||
    (car.bodyStyle === 'coupe' && car.shoppingSegment !== 'mainstream')
  ) {
    return 'performance';
  }
  const msrp = estimateNewVehicleMsrp(car);
  // Subcompacts (Versa, Mirage, Rio). Compacts anchor above this and depreciate
  // on the mainstream curve, as their listings show.
  if (msrp < 23000) return 'economy';
  return 'mainstream';
}

/**
 * Typical current US MSRP by EPA size class, mainstream brands, mid trims.
 *
 * Every sedan used to anchor at the same $32,000, so an Elantra and a Camry
 * were the same car to the model. EPA classes measure interior volume rather
 * than price (the Elantra is "Midsize", the Versa "Compact"), so this is a
 * coarse signal; model rules above take precedence where they exist.
 */
const CLASS_ANCHORS_USD: Array<[RegExp, number]> = [
  [/^minicompact|^subcompact/i, 22_000],
  [/^compact/i, 24_000],
  [/^midsize-large station/i, 36_000],
  [/^midsize station/i, 31_000],
  [/^midsize/i, 27_000],
  [/^large/i, 34_000],
  [/^small station/i, 26_000],
  [/^small sport utility/i, 30_000],
  [/^standard sport utility/i, 45_000],
  [/^sport utility/i, 33_000],
  [/^small pickup/i, 32_000],
  [/^standard pickup/i, 48_000],
  [/^minivan/i, 38_000],
  [/^vans/i, 44_000],
];

/**
 * EPA splits SUVs into "Small" and "Standard" by gross weight rating, not size
 * or price, so a Telluride (about $36,000–$50,000 new) anchored like a CR-V
 * while its twin, the Palisade, flipped between the two from year to year, and
 * a 2023 Pilot was worth $29,500 or $44,500 depending on its drive. Mainstream
 * three-row and mid-size two-row SUVs are named instead.
 */
const THREE_ROW_SUV =
  /^(pilot|pathfinder|cx-9|cx-90|atlas(?! cross)|palisade|telluride|ascent|traverse|explorer|durango|enclave|acadia|flex|borrego|santa fe xl)\b/i;
const MIDSIZE_TWO_ROW_SUV =
  /^(sorento|santa fe(?! sport)|murano|edge|blazer(?! ev)|passport|venza|atlas cross sport|cx-70)\b/i;

function classAnchorUsd(car: CarSpecs): number | null {
  if (car.bodyStyle === 'suv' && !LUXURY_MAKES.has(car.make)) {
    if (THREE_ROW_SUV.test(car.model)) return 40_000;
    if (MIDSIZE_TWO_ROW_SUV.test(car.model)) return 36_000;
  }
  const vClass = car.epa?.vClass;
  if (!vClass) return null;
  return CLASS_ANCHORS_USD.find(([pattern]) => pattern.test(vClass))?.[1] ?? null;
}

/** Original MSRP anchor — model-specific when possible. */
export function estimateNewVehicleMsrp(car: CarSpecs): number {
  for (const rule of MODEL_MSRP_RULES) {
    if (rule.test(car)) {
      const v = typeof rule.msrp === 'function' ? rule.msrp(car) : rule.msrp;
      return Math.round(rule.evTrims ? v * evTrimFactor(car) : v);
    }
  }

  const baseByStyle: Record<string, number> = {
    sedan: 32000,
    suv: 42000,
    truck: 48000,
    coupe: 42000,
    convertible: 48000,
    hatchback: 28000,
    wagon: 36000,
    minivan: 40000,
    van: 38000,
  };

  // A two-door costs a little more than its size class suggests (an Accord
  // Coupe over the sedan). The Mustang and its rivals, which EPA files as
  // "Subcompact", have model rules; two-seaters have no size class and keep
  // the body-style anchor. Coupes used to keep that $42,000 anchor whatever
  // their class, which priced a Tiburon like a Mustang GT.
  const sporty = car.bodyStyle === 'coupe' || car.bodyStyle === 'convertible';
  // BMW's four-door Gran Coupes list with the two-doors they are built from (a
  // 650i Gran Coupe near US$87,000), not with a compact sedan.
  const luxuryTwoDoor =
    (sporty || /\bgran coupe\b|\b(?:4|four)-door coupe\b/i.test(car.model)) &&
    LUXURY_MAKES.has(car.make);
  const marque = MARQUE_ANCHORS_USD[car.make];
  let price: number;
  if (marque != null) {
    price = marque;
  } else if (luxuryTwoDoor) {
    price = luxuryTwoDoorAnchorUsd(car);
  } else {
    const classAnchor = classAnchorUsd(car);
    price =
      (classAnchor != null ? classAnchor * (sporty ? 1.1 : 1) : null) ||
      baseByStyle[car.bodyStyle] ||
      34000;
    if (LUXURY_MAKES.has(car.make)) price *= luxuryClassMultiplier(car.epa?.vClass);
    // GMC sells Chevrolet's trucks and SUVs a trim step up. It used to be on
    // the luxury list, which put a 2019 Sierra 1500 at $52,500 against ~$34,500
    // listed (CarGurus.ca, September 2026).
    if (car.make === 'GMC') price *= 1.08;
  }
  if (isHeavyEvTruck(car)) price = Math.max(price, 95000);

  const ft = car.engine.fuelType;
  if (ft === 'electric') price *= 1.12 * evTrimFactor(car);
  else if (ft === 'plug-in hybrid') price *= 1.06;
  else if (ft === 'hydrogen') price *= 1.15;
  // The cylinder table already prices a luxury V8, and a marque's figure its
  // V12s (a Rolls-Royce Ghost came out at $512,000).
  if (marque == null && !luxuryTwoDoor && (car.engine.displacement ?? 0) >= 4.5) price *= 1.22;

  return Math.round(price);
}

/**
 * How far a luxury make lists above a mainstream car of the same EPA size
 * class. One 1.55 for all put a 330i or C300 (about $41,000 new) at $37,000
 * and a Q5 or RDX (about $40,000) at $46,500: the premium is widest on small
 * sedans and narrowest on small SUVs, where mainstream prices are closer.
 */
function luxuryClassMultiplier(vClass?: string): number {
  if (!vClass) return 1.55;
  if (/^(compact|midsize) cars/i.test(vClass)) return 1.72;
  if (/^small sport utility/i.test(vClass)) return 1.38;
  return 1.55;
}

/**
 * Luxury coupes and convertibles by engine. EPA files most as "Subcompact"
 * (interior volume), which says nothing about their price, and every one of
 * them used to be floored at $92,000: a BMW 230i (about $37,000 new) at the
 * same anchor as an M6, while an Audi R8 sat below its sticker.
 */
function luxuryTwoDoorAnchorUsd(car: CarSpecs): number {
  const cylinders = car.engine.cylinders ?? 0;
  const base = cylinders >= 10 ? 165000 : cylinders >= 8 ? 95000 : cylinders >= 6 ? 60000 : 45000;
  return car.bodyStyle === 'convertible' ? base * 1.08 : base;
}

export function classifyEvRetentionTier(car: CarSpecs): EvRetentionTier | null {
  if (effectiveFuelType(car) !== 'electric') return null;

  const key = modelKey(car);
  const range = car.epa?.rangeMiles ?? 0;

  if (car.make === 'Tesla') return 'A';
  if (key.includes('rivian') || key.includes('lucid') || key.includes('ioniq 6')) return 'A';
  if (key.includes('model') && car.make === 'Tesla') return 'A';

  if (
    key.includes('leaf') ||
    key.includes('500e') ||
    key.includes('i-miev') ||
    key.includes('focus electric') ||
    key.includes('spark ev') ||
    (range > 0 && range < 90)
  ) {
    return 'C';
  }

  if (
    key.includes('volt') ||
    key.includes('prius prime') ||
    key.includes('clarity') ||
    key.includes('i3') ||
    key.includes('bolt')
  ) {
    return 'B';
  }

  if (range >= 250) return 'A';
  if (range >= 180) return 'B';
  if (range > 0 && range < 120) return 'C';
  return 'B';
}

export function estimateBatteryHealth(car: CarSpecs): BatteryHealthEstimate | undefined {
  const ft = effectiveFuelType(car);
  // PHEV hybrid packs are auxiliary — degradation does not dominate vehicle value like a BEV.
  if (ft === 'plug-in hybrid') return undefined;
  if (ft !== 'electric') return undefined;

  const age = Math.max(0, REFERENCE_YEAR - car.year);
  const range = car.epa?.rangeMiles ?? 0;
  const key = modelKey(car);

  let factor = 1.0;
  let chemistryNote = 'Modern lithium-ion pack (estimated)';

  if (key.includes('leaf') && car.year <= 2016) {
    chemistryNote = 'Early Leaf. Air-cooled pack, higher degradation risk';
    factor = age <= 3 ? 0.82 : age <= 6 ? 0.68 : age <= 10 ? 0.55 : 0.42;
  } else if (key.includes('leaf')) {
    chemistryNote = 'Leaf. Moderate battery aging expected with age';
    factor = age <= 3 ? 0.9 : age <= 6 ? 0.78 : age <= 10 ? 0.65 : 0.5;
  } else if (key.includes('500e') || key.includes('i-miev') || key.includes('focus electric')) {
    chemistryNote = 'Compliance-era EV. Limited range and aging chemistry';
    factor = age <= 4 ? 0.75 : age <= 8 ? 0.58 : 0.4;
  } else if (car.make === 'Chevrolet' && key.includes('bolt') && car.year <= 2022) {
    // NHTSA recalls 21V-560 (2017–19) and 21V-650 (2019–22 Bolt EV, 2022
    // EUV): GM replaced battery modules, so many run newer cells than their age.
    chemistryNote =
      "Covered by GM's 2021 battery recall, under which many had battery modules replaced. Check the service record";
    factor = age <= 6 ? 0.92 : 0.85;
  } else if (car.make === 'Tesla') {
    chemistryNote = 'Tesla pack. Relatively strong retention vs early EVs';
    factor = age <= 3 ? 0.96 : age <= 6 ? 0.88 : age <= 10 ? 0.78 : 0.68;
  } else if (range > 0 && range < 100) {
    chemistryNote = 'Short-range pack. Degradation weighs heavily on value';
    factor = age <= 4 ? 0.72 : age <= 8 ? 0.58 : 0.45;
  } else {
    factor = age <= 3 ? 0.95 : age <= 6 ? 0.85 : age <= 10 ? 0.72 : 0.58;
  }

  const tier = classifyEvRetentionTier(car);
  if (tier === 'A') factor = Math.min(1, factor + 0.05);
  if (tier === 'C') factor *= 0.92;

  factor = Math.max(0.35, Math.min(1, factor));

  let label = '90-100% (excellent)';
  if (factor < 0.6) label = 'Below 60% (poor)';
  else if (factor < 0.75) label = '60-74% (fair)';
  else if (factor < 0.9) label = '75-89% (good)';

  return { factor, label, chemistryNote };
}

/**
 * Early EVs rated under 120 miles (the 2011–17 Leaf, i-MiEV, Focus Electric,
 * e-Golf, Soul EV) sell as second cars for short commutes, and the discount
 * grows as their packs age: a 2015 Leaf lists around US$6,000, under a fifth
 * of its sticker, where a 2019 Kona Electric keeps 40% at seven years.
 */
function shortRangeFactor(car: CarSpecs, age: number): number {
  const range = car.epa?.rangeMiles ?? 0;
  if (range <= 0 || range >= 120) return 1;
  return 1 - 0.3 * Math.min(1, age / 8);
}

/** Time-based retention fraction (0–1), no dollar floor. */
function retentionFraction(
  car: CarSpecs,
  age: number,
  segment: MarketSegment,
  fuelType: FuelType,
): number {
  // The EV and plug-in curves were fitted with BRAND_RETENTION.
  const mainstreamish =
    (segment === 'mainstream' || segment === 'economy') &&
    fuelType !== 'electric' &&
    fuelType !== 'plug-in hybrid' &&
    fuelType !== 'hydrogen';
  const brand = brandFactorAt(
    (mainstreamish ? MAINSTREAM_BRAND_RETENTION[car.make] : undefined) ??
      BRAND_RETENTION[car.make] ??
      1.0,
    age,
  );

  if (fuelType === 'electric') {
    // One curve for every EV, fitted to CarGurus Canada averages (2026): about
    // 55% of the sticker at four years, 49% at five, 44% at six and 40% at
    // seven, whether Tesla, Hyundai, Ford or Nissan (valuation-calibration
    // test). The old per-tier curves had a 2022 Ioniq 5 21% high and a 2021
    // Bolt 28% low. Used EVs drop fast early, with incentives and price cuts,
    // then flatten.
    const base = 0.2 + 0.8 * Math.exp(-0.2 * age);
    return Math.min(0.98, base * brand * shortRangeFactor(car, age));
  }

  const flat = flatCurveRetention(car);
  if (flat != null) {
    // Supercars keep most of their price for a decade, then ease off: a 2017
    // Huracán lists around $266,700 CAD (CarGurus.ca) and a 2017 R8 around
    // US$143,500, where the exotic curve said a third. Plug-in supercars (SF90,
    // 296, Revuelto) follow it too.
    const curve = 0.3 + 0.7 * Math.exp(-0.075 * age);
    return Math.min(0.97, curve * flat);
  }

  if (fuelType === 'plug-in hybrid') {
    // 0.14 had a 2020 Pacifica Hybrid 23% and a 2020 Prius Prime 9% under
    // their CarGurus.ca averages (September 2026).
    const k = 0.12;
    const base = 0.08 + 0.92 * Math.exp(-k * age);
    return Math.min(0.95, base * brand * highRetention(car) * fastDepreciation(car, age));
  }

  if (fuelType === 'hydrogen') {
    const k = 0.17;
    const infraPenalty = age > 5 ? 0.88 : 0.95;
    return Math.min(0.9, (0.06 + 0.94 * Math.exp(-k * age)) * brand * infraPenalty);
  }

  // Calibrated against Canadian listing averages in 2026 relative to today's
  // MSRP (see valuation-calibration.test.ts): about 0.85 at 3 years, 0.65 at 6,
  // 0.55 at 8 and 0.35 at 13 for a mainstream car. The previous rates (0.13
  // for mainstream) were steeper, and only landed near real prices because the
  // anchors they multiplied were inflated.
  const segmentK: Record<MarketSegment, number> = {
    economy: 0.115,
    mainstream: 0.094,
    luxury: 0.122,
    // Two-door, non-luxury cars (Mustang, Camaro, Miata, BRZ). Listings hold
    // about three-quarters of the sticker at six years (CarGurus.ca, 2026:
    // 2020 Mustang EcoBoost ~$25,000, GT ~$33,500 CAD); 0.108 gave ~57%.
    performance: 0.075,
    // Pickups and vans. Against today's sticker, 2019 full-size pickups list at
    // 45–55% (Silverado ~$30,800, Sierra ~$34,500, Tundra ~$39,600 CAD on
    // CarGurus.ca, September 2026); 0.086 held them near 60%. Mid-size pickups
    // keep more, and get a retention bonus below.
    utility: 0.12,
    exotic: 0.144,
  };
  const segmentFloor: Record<MarketSegment, number> = {
    economy: 0.06,
    mainstream: 0.08,
    luxury: 0.1,
    performance: 0.09,
    utility: 0.1,
    exotic: 0.12,
  };

  const k = segmentK[segment];
  const floorFrac = segmentFloor[segment];
  const ageCurve = floorFrac + (1 - floorFrac) * Math.exp(-k * age);

  let modifier = brand * highRetention(car) * fastDepreciation(car, age);
  if (segment === 'utility' && isMidsizePickup(car)) modifier *= 1.2;
  if (fuelType === 'hybrid') modifier *= 1.03;
  if (age > 12) modifier *= 0.92;

  return Math.min(0.97, ageCurve * modifier);
}

/**
 * Models whose resale departs from their segment's curve, mostly upward. Halo cars: 2026
 * listings put a 2020 Civic Type R and a 2021 Corvette above their original
 * sticker (CarGurus.ca averages ~$49,900 and ~$91,200 CAD). Toyota's trucks
 * and the RAV4 Prime: a 2019 Tacoma lists at ~$39,800 CAD and a 2021 RAV4
 * Prime at ~$39,200, close to what they cost new. The 0.97 cap still holds,
 * so these read as "close to sticker", never as appreciating.
 */
const HIGH_RETENTION_MODELS: Array<[(c: CarSpecs) => boolean, number]> = [
  [(c) => c.make === 'Chevrolet' && /^corvette/i.test(c.model) && c.year >= 2014, 1.5],
  [
    (c) =>
      c.make === 'Chevrolet' &&
      /^camaro/i.test(c.model) &&
      (litres(c) >= 7 || c.engine.aspiration === 'supercharged'),
    1.5,
  ],
  [(c) => c.make === 'Honda' && (/type r/i.test(c.model) || isCivicTypeR(c)), 1.5],
  [(c) => c.make === 'Ford' && /shelby|gt350|gt500|dark horse/i.test(c.model), 1.5],
  [(c) => c.make === 'Ford' && /raptor/i.test(c.model), 1.5],
  [
    (c) =>
      c.make === 'Dodge' &&
      /^(challenger|charger)/i.test(c.model) &&
      c.engine.aspiration === 'supercharged',
    1.5,
  ],
  [(c) => c.make === 'Ram' && /trx/i.test(c.model), 1.5],
  [(c) => c.make === 'Toyota' && /gr supra/i.test(c.model), 1.5],
  // A small, much-missed hybrid coupe: a 2016 CR-Z averages about US$13,500
  // in listings (Cars.com) against about $20,000-24,000 new.
  [(c) => c.make === 'Honda' && /^cr-z/i.test(c.model), 1.15],
  [(c) => c.make === 'Toyota' && /^tacoma/i.test(c.model), 1.3],
  [(c) => c.make === 'Toyota' && /^4runner/i.test(c.model), 1.4],
  [(c) => c.make === 'Toyota' && /^land cruiser/i.test(c.model), 1.3],
  [(c) => c.make === 'Toyota' && /^rav4 (prime|plug-in)/i.test(c.model), 1.4],
  // Porsche's sports cars: a 2018 718 Cayman lists around US$50,000–$57,000
  // against about $57,000 new (Cars.com, KBB).
  [(c) => isPorsche911(c), 1.7],
  [(c) => c.make === 'Porsche' && /^(718|boxster|cayman)\b/i.test(c.model), 1.55],
  [(c) => c.make === 'Lotus' && /^(evora|emira)/i.test(c.model), 1.4],
  // The original two-door AMG GT (a 2017 ~US$72,200 on CarGurus), an RS 6
  // Avant (a 2021 ~US$94,300) and the G-Class (a 2020 AMG G 63 ~US$122,800).
  [
    (c) =>
      c.make === 'Mercedes-Benz' &&
      /^amg gt\b/i.test(c.model) &&
      (c.bodyStyle === 'coupe' || c.bodyStyle === 'convertible') &&
      !/\b(43|53|55|63)\b/.test(c.model),
    1.25,
  ],
  [(c) => c.make === 'Audi' && /^rs ?6\b/i.test(c.model) && c.year >= 2020, 1.3],
  [(c) => c.make === 'Mercedes-Benz' && /\bg ?\d{2,3}\b|g-class/i.test(c.model), 1.2],
  // Exotic SUVs and flagships that buck the exotic curve: a 2019 Urus lists
  // around US$170,500, 2020 Cullinans US$262,500–$330,000 (CarGurus).
  [(c) => c.make === 'Lamborghini' && /^urus/i.test(c.model), 1.5],
  [(c) => c.make === 'Rolls-Royce' && /^cullinan/i.test(c.model), 1.5],
  [(c) => c.make === 'Rolls-Royce' && /^phantom/i.test(c.model), 1.3],
];

/**
 * Supercars, and the few enthusiast cars that depreciate like them, with how
 * far each sits from that flatter curve; null for everything else. They hold
 * value like collectibles without being rare enough to trade on auction
 * results. Ferrari's front-engine GTs lose more than its mid-engine cars.
 */
function flatCurveRetention(car: CarSpecs): number | null {
  const m = car.model;
  switch (car.make) {
    case 'Ferrari':
      return /^(california|portofino|roma|ff|gtc4|612|456)/i.test(m) ? 0.85 : 1.1;
    case 'Lamborghini':
      return /^urus/i.test(m) ? null : 1.15;
    case 'McLaren Automotive':
      return 0.95;
    case 'Audi':
      return /^r8\b/i.test(m) ? 1.1 : null;
    case 'BMW':
      // M2, M3 and M4: a 2018 M3 lists around US$56,200 and a 2021 M4 around
      // US$66,300 (Cars.com, September 2026). The luxury curve with a bonus
      // fitted one and put the other a third high.
      if (/^m[234]\b/i.test(m)) return 0.85;
      // A 2015 i8 lists around US$48,400 and a 2019 coupe US$68,300 (Cars.com,
      // September 2026): about a third and a half of their stickers.
      return /^i8\b/i.test(m) ? 0.62 : null;
    case 'Acura':
      // KBB puts a 2017 NSX at about US$116,000–$125,000 against $156,000 new.
      return /^nsx/i.test(m) && car.year >= 2016 ? 1.25 : null;
    case 'Maserati':
      return /^(mc20|mcpura|gt2 stradale)/i.test(m) ? 1 : null;
    case 'Nissan':
      // A 2010 GT-R still lists around US$60,000–$65,000.
      return /^gt-r/i.test(m) ? 1.05 : null;
    case 'Ford':
      // A 2017 Focus RS lists around US$29,300, 80% of its sticker (Cars.com).
      return /^focus rs/i.test(m) ? 1.05 : null;
    default:
      return null;
  }
}

/**
 * Flagships, big luxury SUVs and Range Rovers lose value faster than the
 * luxury curve, and the gap opens with age: a 2023 S 580 lists around
 * US$79,000 and a 2024 740i around US$61,700; a 2018 S 560 ~US$37,200, a 2019
 * 750i ~US$26,600 and a 2019 Range Rover ~US$31,400 (Cars.com, KBB, TrueCar;
 * September 2026). Canadian listings of these makes run about 1.2 times the
 * US figure (a 2020 Q5 ~$24,850 CAD against US$20,800, a 2015 X5 ~$16,770
 * against US$13,400), and the factors are fitted at that ratio. Each value is
 * where the factor settles; it starts at 1 for a new car.
 */
const FAST_DEPRECIATION_MODELS: Array<[(c: CarSpecs) => boolean, number]> = [
  [
    (c) =>
      c.make === 'Mercedes-Benz' &&
      /^(s ?\d{2,3}|cl ?\d{2,3}|amg s ?\d{2})\b|maybach/i.test(c.model),
    0.62,
  ],
  [(c) => c.make === 'BMW' && /^(7[1-6]\d|m760|alpina b7)/i.test(c.model), 0.58],
  [(c) => c.make === 'Audi' && /^(a8|s8)\b/i.test(c.model), 0.62],
  [(c) => /^(genesis|hyundai|kia)$/i.test(c.make) && /^(g90|equus|k900)\b/i.test(c.model), 0.65],
  [(c) => c.make === 'Jaguar' && /^xj(?!s)/i.test(c.model), 0.6],
  [(c) => c.make === 'Volkswagen' && /^phaeton/i.test(c.model), 0.6],
  // Three-row luxury SUVs: a 2019 Q7 lists around US$20,400, a 2019 XC90
  // ~US$20,700. So do outgoing generations: a 2019 GLE 400 ~US$19,100 and a
  // 2019 Escalade ~US$33,000, where the next generation holds far better.
  [(c) => c.make === 'Audi' && /^(q7|q8|sq7|sq8)\b/i.test(c.model), 0.75],
  [(c) => c.make === 'Volvo' && /^xc90/i.test(c.model), 0.72],
  [(c) => c.make === 'Mercedes-Benz' && /^(gle|ml|gl) ?\d/i.test(c.model) && c.year < 2020, 0.6],
  [(c) => c.make === 'Cadillac' && /^escalade/i.test(c.model) && c.year < 2021, 0.8],
  // A 2018 LS 500 keeps more (~US$39,000), as Lexus does.
  [(c) => c.make === 'Lexus' && /^ls\b/i.test(c.model), 0.9],
  // The 1,500-car Polestar 1 (about $155,000 new) lists around US$59,300 at six
  // years (Cars.com).
  [(c) => c.make === 'Polestar' && /^1\b/.test(c.model), 0.75],
  // The Defender (2020 on) holds its value; the rest of the range does not.
  [(c) => c.make === 'Land Rover' && !/^defender/i.test(c.model), 0.6],
];

function fastDepreciation(car: CarSpecs, age: number): number {
  const settled = FAST_DEPRECIATION_MODELS.find(([test]) => test(car))?.[1];
  return settled == null ? 1 : settled + (1 - settled) * Math.exp(-0.4 * age);
}

function highRetention(car: CarSpecs): number {
  return HIGH_RETENTION_MODELS.find(([test]) => test(car))?.[1] ?? 1;
}

function roundMoney(n: number): number {
  if (n < 5000) return Math.round(n / 100) * 100;
  if (n < 25000) return Math.round(n / 250) * 250;
  return Math.round(n / 500) * 500;
}

export { roundMoney };

export type MsrpAnchorSource = 'model-rule' | 'curated-price' | 'segment-inferred';

/** How the MSRP anchor was derived — drives valuation confidence (not the dollar value). */
/** Makers with so few cars on sale that a model's sticker says little about its price. */
const THIN_MARKET_MAKES = new Set(['Karma', 'Fisker']);

export function assessMsrpAnchor(car: CarSpecs): {
  source: MsrpAnchorSource;
  confidence: Confidence;
} {
  if (MODEL_MSRP_RULES.some((r) => r.test(car))) {
    return { source: 'model-rule', confidence: THIN_MARKET_MAKES.has(car.make) ? 'low' : 'high' };
  }
  if (car.price?.msrp != null && car.price.isEstimated === false) {
    return { source: 'curated-price', confidence: 'high' };
  }
  const hasBrandCalibration =
    LUXURY_MAKES.has(car.make) || EXOTIC_MAKES.has(car.make) || BRAND_RETENTION[car.make] != null;
  if (!hasBrandCalibration) {
    return { source: 'segment-inferred', confidence: 'low' };
  }
  return { source: 'segment-inferred', confidence: 'medium' };
}

export const LOW_VOLUME_CONFIDENCE_LABEL =
  'Limited comparable data for low-volume vehicles. Estimate is approximate.';

/** True when projected resale is physically implausible relative to current value. */
export function isImplausibleResaleProjection(
  market: MarketValueEstimate,
  projectedResale: { low: number; mid: number; high: number },
): boolean {
  const currentMid = market.mid;
  if (currentMid <= 0) return false;
  const { mid: resaleMid, high: resaleHigh } = projectedResale;
  if (resaleMid / currentMid < 0.05) return true;
  if (currentMid >= 10_000 && resaleHigh < 500) return true;
  return false;
}

/** Widen bands and de-rate confidence when resale projection fails plausibility checks. */
export function applyValuationReliabilityGuard(
  market: MarketValueEstimate,
  resale: {
    currentValue: { low: number; high: number; mid: number };
    projectedResale5Year: { low: number; mid: number; high: number };
    estimatedLoss5Year: { low: number; mid: number; high: number };
    note: string;
  },
): {
  market: MarketValueEstimate;
  resale: typeof resale;
} {
  if (!isImplausibleResaleProjection(market, resale.projectedResale5Year)) {
    return { market, resale };
  }

  const halfSpan = Math.max(market.mid * 0.35, 4_000);
  const adjustedMarket: MarketValueEstimate = {
    ...market,
    confidence: 'low',
    confidenceLabel: LOW_VOLUME_CONFIDENCE_LABEL,
    low: roundMoney(Math.max(0, market.mid - halfSpan)),
    high: roundMoney(market.mid + halfSpan),
    conditionBands: undefined,
  };

  const resaleLow = Math.max(0, Math.round(adjustedMarket.low * 0.12));
  const resaleHigh = Math.round(adjustedMarket.high * 0.72);
  const resaleMid = Math.round((resaleLow + resaleHigh) / 2);

  // The loss must be derived from the same replacement band. It used to keep
  // the pre-guard figure, so the dossier showed value − resale ≠ loss (2021
  // Kandi K27: $11,750 − $6,135 against a displayed $11,257 loss), and the
  // 5-year TCO was built on the implausible projection this guard exists to
  // replace. A larger resale means a smaller loss, so the bounds cross over.
  const valueMid = adjustedMarket.mid;
  const estimatedLoss5Year = {
    low: Math.max(0, valueMid - resaleHigh),
    mid: Math.max(0, valueMid - resaleMid),
    high: Math.max(0, valueMid - resaleLow),
  };

  return {
    market: adjustedMarket,
    resale: {
      ...resale,
      estimatedLoss5Year,
      currentValue: {
        low: adjustedMarket.low,
        high: adjustedMarket.high,
        mid: adjustedMarket.mid,
      },
      projectedResale5Year: { low: resaleLow, mid: resaleMid, high: resaleHigh },
      note: 'Depreciation is realized when you sell, not a per-mile driving expense. Resale projection assumes typical condition. High uncertainty for this vehicle; resale band is illustrative only.',
    },
  };
}

/**
 * How far a worn or healthy pack moves an EV from the average asking price.
 * Listing averages already reflect typical battery wear for the age, so the
 * midpoint is not reduced again; the likelier the pack has aged, the wider the
 * gap between a tired one and one that has been replaced or barely used.
 */
function conditionMultiplier(bhf: number): { poor: number; excellent: number } {
  const wear = 1 - bhf;
  return { poor: 0.8 - 0.3 * wear, excellent: 1.12 + 0.15 * wear };
}

export function estimateMarketValue(
  car: CarSpecs,
  region: RegionalAssumptions = getRegionalAssumptions(),
): MarketValueEstimate {
  const msrpCad = Math.round(usdAnchorToCadValue(estimateNewVehicleMsrp(car), region));
  const age = Math.max(0, REFERENCE_YEAR - car.year);
  const segment = classifyMarketSegment(car);
  const fuelType = effectiveFuelType(car);
  const retained = retentionFraction(car, age, segment, fuelType);
  const batteryHealth = estimateBatteryHealth(car);
  const tier = classifyEvRetentionTier(car);

  let mid = roundMoney(msrpCad * retained);

  let low: number;
  let high: number;
  let conditionBands: ConditionValueBand[] | undefined;

  if (fuelType === 'electric' && batteryHealth) {
    const mult = conditionMultiplier(batteryHealth.factor);
    const poorMid = roundMoney(mid * mult.poor);
    const excMid = roundMoney(mid * mult.excellent);
    // Ordered bands: a worn pack tops out below the average band, and a
    // healthy one above it. The average band used to reach higher (+10%)
    // than the excellent band (+8%).
    conditionBands = [
      { label: 'Low battery condition', low: poorMid, high: roundMoney(mid * (mult.poor + 0.1)) },
      { label: 'Average condition', low: roundMoney(mid * 0.92), high: roundMoney(mid * 1.08) },
      { label: 'Excellent condition', low: roundMoney(mid * 1.04), high: excMid },
    ];
    low = conditionBands[0].low;
    high = conditionBands[2].high;
  } else {
    const spread = segment === 'exotic' || fuelType === 'hydrogen' ? 0.28 : age > 8 ? 0.2 : 0.14;
    low = roundMoney(mid * (1 - spread));
    high = roundMoney(mid * (1 + spread));
  }

  if (low > high) [low, high] = [high, low];
  if (mid < low) mid = roundMoney((low + high) / 2);
  if (mid > high) mid = roundMoney((low + high) / 2);

  let confidence: Confidence = 'medium';
  let confidenceLabel = `${region.label}-baseline model estimate, not a live listing quote`;

  const anchor = assessMsrpAnchor(car);
  if (anchor.confidence === 'low') {
    confidence = 'low';
    confidenceLabel = LOW_VOLUME_CONFIDENCE_LABEL;
  } else if (
    anchor.source === 'model-rule' &&
    (segment === 'exotic' || flatCurveRetention(car) != null)
  ) {
    // Options, mileage and history move these prices more than age does.
    confidenceLabel = 'Model-anchored, but a thin market where options and history matter';
  } else if (anchor.confidence === 'high' && anchor.source === 'model-rule') {
    confidence = 'high';
    confidenceLabel = 'Model-anchored CAD value with age and condition curve';
  } else if (anchor.source === 'curated-price') {
    confidence = 'high';
    confidenceLabel = 'Model-anchored CAD value with age and condition curve';
  } else if (fuelType === 'electric' && age > 10) {
    confidenceLabel = 'Model estimate. Older EV values vary by battery health';
  } else if (fuelType === 'hydrogen') {
    confidence = 'low';
    confidenceLabel = 'Rare FCEV. Thin market, infrastructure risk, high value uncertainty';
  } else if (segment === 'exotic') {
    confidence = 'low';
    confidenceLabel = 'Thin-market vehicle. Estimate uses segment baseline';
  } else if (age > 15) {
    confidenceLabel = 'Aged vehicle. Condition affects value more than age curve';
  }

  return {
    low,
    high,
    mid,
    confidence,
    confidenceLabel,
    conditionBands,
    batteryHealth,
    retentionTier: tier ?? undefined,
    msrpAnchor: msrpCad,
    retainedFraction: Math.round(retained * 1000) / 1000,
  };
}

/** 5-year depreciation from time-based curves (not linear per-mile). */
export function estimateDepreciation5Year(
  car: CarSpecs,
  market: MarketValueEstimate,
): { low: number; mid: number; high: number } {
  const msrp = market.msrpAnchor;
  const age = Math.max(0, REFERENCE_YEAR - car.year);
  const segment = classifyMarketSegment(car);
  const fuelType = effectiveFuelType(car);

  const nowRetain = market.retainedFraction;
  const futureAge = age + 5;
  const futureRetain = retentionFraction(car, futureAge, segment, fuelType);
  const futureMid = msrp * futureRetain;

  const mid = Math.max(0, msrp * nowRetain - futureMid);
  const low = mid * 0.85;
  const high = mid * 1.2;

  return {
    low: Math.round(low),
    mid: Math.round(mid),
    high: Math.round(high),
  };
}
