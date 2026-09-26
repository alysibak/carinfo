import type { CarSpecs, FuelType } from '../types/car.types.js';
import {
  getRegionalAssumptions,
  usdAnchorToCadValue,
  type RegionalAssumptions,
} from '../config/regional-assumptions.js';
import { inferEffectiveFuelType } from './fuel-type-inference.js';

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
  'Maserati',
  'Ferrari',
  'Lamborghini',
  'Bentley',
  'Rolls-Royce',
  'Alfa Romeo',
  'GMC',
  'Lucid',
  'Rivian',
  'Polestar',
  'Fisker',
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
  // Lexus keeps more than the luxury curve (a 2018 RX lists ~57% of its sticker
  // at eight years); German makes, especially their SUVs, keep less (a 2015 X5
  // ~22% at eleven). CarGurus Canada averages, September 2026.
  Lexus: 1.18,
  BMW: 0.92,
  Audi: 0.92,
  Honda: 1.06,
  Mazda: 1.04,
  Subaru: 1.03,
  Porsche: 1.12,
  // Was 1.14. Tesla's 2023–25 price cuts took residuals down with them: a 2022
  // Model 3 lists around $32,600 CAD in 2026, about 55% of its original price.
  Tesla: 1.0,
  Ford: 1.0,
  Chevrolet: 0.98,
  Nissan: 0.96,
  Fiat: 0.88,
  Mitsubishi: 0.9,
  // Bankrupt makers: no dealers, software updates or assured parts. A 2023
  // Fisker Ocean Extreme ($69,000 new) sells for about $16,000 in 2026.
  Fisker: 0.4,
  Lordstown: 0.4,
};

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
  { test: (c) => c.make === 'Mercedes-Benz' && /amg gt\b/i.test(c.model), msrp: 130000 },
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
  // Trucks and SUVs with a performance engine
  {
    test: (c) => c.make === 'Ford' && /f150 raptor r/i.test(c.model),
    msrp: 110000,
  },
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

const MODEL_MSRP_RULES: ModelMsrpRule[] = [
  ...EV_LINE_RULES,
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
    test: (c) => c.make === 'Chevrolet' && c.model.toLowerCase().includes('volt'),
    msrp: (c) => (c.year >= 2016 ? 36000 : 34000),
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
    test: (c) => c.make === 'Honda' && /civic si/i.test(c.model),
    msrp: (c) => (c.year >= 2022 ? 29000 : 24000),
  },
  {
    test: (c) => c.make === 'Honda' && (/type r/i.test(c.model) || isCivicTypeR(c)),
    msrp: (c) => (c.year >= 2023 ? 44000 : 36000),
  },
  ...PERFORMANCE_VARIANT_RULES,
  { test: (c) => c.make === 'Subaru' && /wrx sti|\bsti\b/i.test(c.model), msrp: 38000 },
  {
    test: (c) => c.make === 'Subaru' && /wrx/i.test(c.model),
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
    test: (c) => c.make === 'Porsche' && /^911\b/.test(c.model),
    msrp: (c) => (/turbo|gt2|gt3|dakar|s\/t/i.test(c.model) ? 220000 : 135000),
  },
  { test: (c) => c.make === 'Porsche' && /^718\b/.test(c.model), msrp: 80000 },
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
  if (car.bodyStyle === 'coupe' || car.bodyStyle === 'convertible') return 'performance';
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

function classAnchorUsd(car: CarSpecs): number | null {
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
  const luxuryTwoDoor = sporty && LUXURY_MAKES.has(car.make);
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
  }
  if (isHeavyEvTruck(car)) price = Math.max(price, 95000);

  const ft = car.engine.fuelType;
  if (ft === 'electric') price *= 1.12 * evTrimFactor(car);
  else if (ft === 'plug-in hybrid') price *= 1.06;
  else if (ft === 'hydrogen') price *= 1.15;
  // The cylinder table already prices a luxury V8.
  if (!luxuryTwoDoor && car.engine.displacement && car.engine.displacement >= 4.5) price *= 1.22;

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
  const brand = BRAND_RETENTION[car.make] ?? 1.0;

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

  if (fuelType === 'plug-in hybrid') {
    const k = 0.14;
    const base = 0.08 + 0.92 * Math.exp(-k * age);
    return Math.min(0.95, base * brand);
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
    utility: 0.086,
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

  let modifier = brand * enthusiastRetention(car);
  if (fuelType === 'hybrid') modifier *= 1.03;
  if (age > 12) modifier *= 0.92;

  return Math.min(0.97, ageCurve * modifier);
}

/**
 * Halo cars that hold value far better than their segment: 2026 listings put
 * a 2020 Civic Type R and a 2021 Corvette above their original sticker
 * (CarGurus.ca averages ~$49,900 and ~$91,200 CAD). The 0.97 cap above still
 * holds, so these read as "close to sticker", never as appreciating.
 */
const ENTHUSIAST_MODELS: Array<(c: CarSpecs) => boolean> = [
  (c) => c.make === 'Chevrolet' && /^corvette/i.test(c.model) && c.year >= 2014,
  (c) =>
    c.make === 'Chevrolet' &&
    /^camaro/i.test(c.model) &&
    (litres(c) >= 7 || c.engine.aspiration === 'supercharged'),
  (c) => c.make === 'Honda' && (/type r/i.test(c.model) || isCivicTypeR(c)),
  (c) => c.make === 'Ford' && /shelby|gt350|gt500|dark horse/i.test(c.model),
  (c) => c.make === 'Ford' && /raptor/i.test(c.model),
  (c) =>
    c.make === 'Dodge' &&
    /^(challenger|charger)/i.test(c.model) &&
    c.engine.aspiration === 'supercharged',
  (c) => c.make === 'Ram' && /trx/i.test(c.model),
  (c) => c.make === 'Nissan' && /gt-r/i.test(c.model),
  (c) => c.make === 'Toyota' && /gr supra/i.test(c.model),
];

function enthusiastRetention(car: CarSpecs): number {
  return ENTHUSIAST_MODELS.some((test) => test(car)) ? 1.5 : 1;
}

function roundMoney(n: number): number {
  if (n < 5000) return Math.round(n / 100) * 100;
  if (n < 25000) return Math.round(n / 250) * 250;
  return Math.round(n / 500) * 500;
}

export { roundMoney };

export type MsrpAnchorSource = 'model-rule' | 'curated-price' | 'segment-inferred';

/** How the MSRP anchor was derived — drives valuation confidence (not the dollar value). */
export function assessMsrpAnchor(car: CarSpecs): {
  source: MsrpAnchorSource;
  confidence: Confidence;
} {
  if (MODEL_MSRP_RULES.some((r) => r.test(car))) {
    return { source: 'model-rule', confidence: 'high' };
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
  return { poor: 0.85 - 0.3 * wear, excellent: 1.08 + 0.15 * wear };
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
    conditionBands = [
      { label: 'Low battery condition', low: poorMid, high: roundMoney(poorMid * 1.15) },
      { label: 'Average condition', low: roundMoney(mid * 0.9), high: roundMoney(mid * 1.1) },
      { label: 'Excellent condition', low: roundMoney(excMid * 0.92), high: excMid },
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
