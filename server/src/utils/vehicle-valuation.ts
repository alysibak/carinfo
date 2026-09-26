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
};

interface ModelMsrpRule {
  test: (car: CarSpecs) => boolean;
  msrp: number | ((car: CarSpecs) => number);
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

const MODEL_MSRP_RULES: ModelMsrpRule[] = [
  {
    test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model s'),
    msrp: (c) => (c.year >= 2021 ? 95000 : c.year >= 2016 ? 85000 : 75000),
  },
  {
    test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model 3'),
    msrp: (c) => (c.year >= 2021 ? 48000 : 42000),
  },
  {
    test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model x'),
    msrp: (c) => (c.year >= 2021 ? 105000 : 90000),
  },
  {
    test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model y'),
    msrp: (c) => (c.year >= 2021 ? 55000 : 50000),
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
    test: (c) => c.make === 'Chevrolet' && c.model.toLowerCase().includes('bolt'),
    msrp: (c) => (c.year >= 2022 ? 32000 : 28000),
  },
  { test: (c) => `${c.make} ${c.model}`.toLowerCase().includes('hummer ev'), msrp: 105000 },
  {
    test: (c) => c.model.toLowerCase().includes('lc 500') || c.model.toLowerCase().startsWith('lc'),
    msrp: 105000,
  },
  { test: (c) => c.model.toLowerCase().includes('mirai'), msrp: 52000 },
  {
    test: (c) => c.make === 'Rivian',
    msrp: (c) => (c.model.toLowerCase().includes('r1t') ? 79000 : 78000),
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
  {
    test: (c) => c.make === 'Lucid' && /grand touring|g touring|dream/i.test(c.model),
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
    test: (c) => c.make === 'Porsche' && c.model.toLowerCase().includes('taycan'),
    msrp: (c) => (c.year >= 2022 ? 96000 : 86000),
  },
  {
    test: (c) => c.make === 'Mercedes-Benz' && /eqs/i.test(c.model),
    msrp: (c) => (c.year >= 2022 ? 105000 : 95000),
  },
  {
    test: (c) => c.make === 'Mercedes-Benz' && /eqe/i.test(c.model),
    msrp: (c) => (c.year >= 2023 ? 78000 : 72000),
  },
  {
    test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq 6'),
    msrp: (c) => (c.year >= 2024 ? 52000 : 48000),
  },
  {
    test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq 5'),
    msrp: (c) => (c.year >= 2024 ? 50000 : 45000),
  },
  {
    test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('f-150 lightning'),
    msrp: (c) => (c.year >= 2022 ? 68000 : 62000),
  },
  {
    test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('mustang mach-e'),
    msrp: (c) => (c.year >= 2022 ? 52000 : 48000),
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
      return Math.round(v);
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
  if (ft === 'electric') price *= 1.12;
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

/** Time-based retention fraction (0–1), no dollar floor. */
function retentionFraction(
  car: CarSpecs,
  age: number,
  segment: MarketSegment,
  fuelType: FuelType,
): number {
  const brand = BRAND_RETENTION[car.make] ?? 1.0;
  const tier = classifyEvRetentionTier(car);

  if (fuelType === 'electric' && tier) {
    const k = tier === 'A' ? 0.11 : tier === 'B' ? 0.15 : 0.22;
    const floorFrac = tier === 'A' ? 0.18 : tier === 'B' ? 0.1 : 0.05;
    const base = floorFrac + (1 - floorFrac) * Math.exp(-k * age);
    return Math.min(0.98, base * brand);
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

function conditionMultiplier(bhf: number): { poor: number; average: number; excellent: number } {
  return {
    poor: Math.max(0.55, bhf - 0.18),
    average: bhf,
    excellent: Math.min(1.05, bhf + 0.1),
  };
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

  const ageValue = msrpCad * retained;
  const bhf = batteryHealth?.factor ?? (fuelType === 'electric' ? 0.85 : 1);
  let mid = roundMoney(ageValue * (fuelType === 'electric' ? bhf : 1));

  let low: number;
  let high: number;
  let conditionBands: ConditionValueBand[] | undefined;

  if (fuelType === 'electric' && batteryHealth) {
    const mult = conditionMultiplier(batteryHealth.factor);
    const poorMid = roundMoney(ageValue * mult.poor);
    const avgMid = mid;
    const excMid = roundMoney(ageValue * mult.excellent);
    low = Math.min(poorMid, avgMid);
    high = Math.max(excMid, avgMid);
    conditionBands = [
      { label: 'Low battery condition', low: poorMid, high: roundMoney(poorMid * 1.15) },
      { label: 'Average condition', low: roundMoney(avgMid * 0.9), high: roundMoney(avgMid * 1.1) },
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
