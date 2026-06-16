import type { CarSpecs, FuelType } from '../types/car.types.js';
import { usdAnchorToCadValue } from '../config/regional-assumptions.js';
import { inferEffectiveFuelType } from './fuel-type-inference.js';

const REFERENCE_YEAR = new Date().getFullYear();

export type EvRetentionTier = 'A' | 'B' | 'C';
export type MarketSegment = 'economy' | 'mainstream' | 'luxury' | 'performance' | 'utility' | 'exotic';
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
  'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Lexus', 'Jaguar', 'Land Rover',
  'Infiniti', 'Acura', 'Cadillac', 'Lincoln', 'Genesis', 'Maserati', 'Ferrari',
  'Lamborghini', 'Bentley', 'Rolls-Royce', 'Alfa Romeo', 'GMC',
  'Lucid', 'Rivian', 'Polestar', 'Fisker',
]);

const EXOTIC_MAKES = new Set(['Ferrari', 'Lamborghini', 'Bentley', 'Rolls-Royce', 'Maserati']);

const BRAND_RETENTION: Record<string, number> = {
  Toyota: 1.08,
  Lexus: 1.1,
  Honda: 1.06,
  Mazda: 1.04,
  Subaru: 1.03,
  Porsche: 1.12,
  Tesla: 1.14,
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

const MODEL_MSRP_RULES: ModelMsrpRule[] = [
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model s'), msrp: (c) => (c.year >= 2021 ? 95000 : c.year >= 2016 ? 85000 : 75000) },
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model 3'), msrp: (c) => (c.year >= 2021 ? 48000 : 42000) },
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model x'), msrp: (c) => (c.year >= 2021 ? 105000 : 90000) },
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model y'), msrp: (c) => (c.year >= 2021 ? 55000 : 50000) },
  { test: (c) => c.make === 'Nissan' && c.model.toLowerCase().includes('leaf'), msrp: (c) => (c.year >= 2018 ? 35000 : c.year >= 2013 ? 32000 : 28000) },
  { test: (c) => c.make === 'Chevrolet' && c.model.toLowerCase().includes('volt'), msrp: (c) => (c.year >= 2016 ? 36000 : 34000) },
  { test: (c) => c.make === 'Fiat' && c.model.toLowerCase().includes('500e'), msrp: 33000 },
  { test: (c) => c.make === 'BMW' && c.model.toLowerCase().includes('i3'), msrp: (c) => (c.year >= 2018 ? 45000 : 43000) },
  { test: (c) => c.make === 'Chevrolet' && c.model.toLowerCase().includes('bolt'), msrp: (c) => (c.year >= 2022 ? 32000 : 28000) },
  { test: (c) => `${c.make} ${c.model}`.toLowerCase().includes('hummer ev'), msrp: 105000 },
  { test: (c) => c.model.toLowerCase().includes('lc 500') || c.model.toLowerCase().startsWith('lc'), msrp: 105000 },
  { test: (c) => c.model.toLowerCase().includes('mirai'), msrp: 52000 },
  { test: (c) => c.make === 'Rivian', msrp: (c) => (c.model.toLowerCase().includes('r1t') ? 79000 : 78000) },
  { test: (c) => c.make === 'Volkswagen' && /gti/i.test(c.model), msrp: (c) => (c.year >= 2022 ? 32000 : c.year >= 2018 ? 29000 : c.year >= 2015 ? 26500 : 25000) },
  { test: (c) => c.make === 'Volkswagen' && /golf r/i.test(c.model), msrp: (c) => (c.year >= 2022 ? 45000 : c.year >= 2016 ? 40000 : 36000) },
  { test: (c) => c.make === 'Honda' && /civic si/i.test(c.model), msrp: (c) => (c.year >= 2022 ? 29000 : 24000) },
  { test: (c) => c.make === 'Honda' && /type r/i.test(c.model), msrp: (c) => (c.year >= 2023 ? 44000 : 36000) },
  { test: (c) => c.make === 'Subaru' && /wrx/i.test(c.model), msrp: (c) => (c.year >= 2022 ? 32000 : c.year >= 2015 ? 28000 : 26000) },
  { test: (c) => c.make === 'Ford' && /focus st|fiesta st/i.test(c.model), msrp: 26000 },
  { test: (c) => c.make === 'Hyundai' && /elantra n|veloster n/i.test(c.model), msrp: (c) => (c.year >= 2022 ? 34000 : 28000) },
  { test: (c) => c.make === 'Lucid' && /grand touring|g touring|dream/i.test(c.model), msrp: (c) => (c.year >= 2023 ? 139000 : 125000) },
  { test: (c) => c.make === 'Lucid' && /touring/i.test(c.model), msrp: (c) => (c.year >= 2024 ? 95000 : 87500) },
  { test: (c) => c.make === 'Lucid', msrp: (c) => (c.year >= 2024 ? 82000 : c.year >= 2022 ? 77400 : 70000) },
  { test: (c) => c.make === 'Porsche' && c.model.toLowerCase().includes('taycan'), msrp: (c) => (c.year >= 2022 ? 96000 : 86000) },
  { test: (c) => c.make === 'Mercedes-Benz' && /eqs/i.test(c.model), msrp: (c) => (c.year >= 2022 ? 105000 : 95000) },
  { test: (c) => c.make === 'Mercedes-Benz' && /eqe/i.test(c.model), msrp: (c) => (c.year >= 2023 ? 78000 : 72000) },
  { test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq 6'), msrp: (c) => (c.year >= 2024 ? 52000 : 48000) },
  { test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq 5'), msrp: (c) => (c.year >= 2024 ? 50000 : 45000) },
  { test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('f-150 lightning'), msrp: (c) => (c.year >= 2022 ? 68000 : 62000) },
  { test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('mustang mach-e'), msrp: (c) => (c.year >= 2022 ? 52000 : 48000) },
  { test: (c) => c.model.toLowerCase().includes('escalade'), msrp: 85000 },
  { test: (c) => c.make === 'Mitsubishi' && c.model.toLowerCase().includes('i-miev'), msrp: 30000 },
  { test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('focus electric'), msrp: 32000 },
  { test: (c) => c.make === 'Chevrolet' && c.model.toLowerCase().includes('spark'), msrp: 26000 },
  { test: (c) => c.make === 'Toyota' && c.model.toLowerCase().includes('prius prime'), msrp: 34000 },
  { test: (c) => c.make === 'Honda' && c.model.toLowerCase().includes('clarity'), msrp: 36000 },
  { test: (c) => c.make === 'Porsche' && c.model.toLowerCase().includes('cayenne'), msrp: (c) => (c.year >= 2020 ? 98000 : c.year >= 2016 ? 88000 : 78000) },
  { test: (c) => c.make === 'Porsche' && c.model === 'Macan', msrp: (c) => (c.year >= 2022 ? 72000 : 65000) },
  { test: (c) => c.make === 'Porsche' && c.model.toLowerCase().includes('panamera'), msrp: (c) => (c.year >= 2020 ? 105000 : 95000) },
  { test: (c) => c.make === 'BMW' && c.model.toLowerCase().startsWith('x5'), msrp: (c) => (c.year >= 2020 ? 72000 : 65000) },
  { test: (c) => c.make === 'BMW' && c.model.toLowerCase().startsWith('x3'), msrp: (c) => (c.year >= 2020 ? 52000 : 46000) },
  { test: (c) => c.make === 'Mercedes-Benz' && c.model.toLowerCase().includes('gle'), msrp: (c) => (c.year >= 2020 ? 78000 : 70000) },
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
  return (car.bodyStyle === 'coupe' && LUXURY_MAKES.has(car.make)) || m.includes('lc ') || m.startsWith('lc');
}

export function classifyMarketSegment(car: CarSpecs): MarketSegment {
  if (EXOTIC_MAKES.has(car.make)) return 'exotic';
  if (isLuxuryPerformance(car) || LUXURY_MAKES.has(car.make)) return 'luxury';
  if (car.bodyStyle === 'truck' || car.bodyStyle === 'van') return 'utility';
  if (car.bodyStyle === 'coupe' || car.bodyStyle === 'convertible') return 'performance';
  const msrp = estimateNewVehicleMsrp(car);
  if (msrp < 28000) return 'economy';
  return 'mainstream';
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

  let price = baseByStyle[car.bodyStyle] || 34000;
  if (EXOTIC_MAKES.has(car.make)) price *= 4;
  else if (LUXURY_MAKES.has(car.make)) price *= 1.55;
  if (isHeavyEvTruck(car)) price = Math.max(price, 95000);
  if (isLuxuryPerformance(car)) price = Math.max(price, 92000);

  const ft = car.engine.fuelType;
  if (ft === 'electric') price *= 1.12;
  else if (ft === 'plug-in hybrid') price *= 1.06;
  else if (ft === 'hydrogen') price *= 1.15;
  if (car.engine.displacement && car.engine.displacement >= 4.5) price *= 1.22;

  return Math.round(price);
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
    chemistryNote = 'Early Leaf — air-cooled pack, higher degradation risk';
    factor = age <= 3 ? 0.82 : age <= 6 ? 0.68 : age <= 10 ? 0.55 : 0.42;
  } else if (key.includes('leaf')) {
    chemistryNote = 'Leaf — moderate battery aging expected with age';
    factor = age <= 3 ? 0.9 : age <= 6 ? 0.78 : age <= 10 ? 0.65 : 0.5;
  } else if (key.includes('500e') || key.includes('i-miev') || key.includes('focus electric')) {
    chemistryNote = 'Compliance-era EV — limited range and aging chemistry';
    factor = age <= 4 ? 0.75 : age <= 8 ? 0.58 : 0.4;
  } else if (car.make === 'Tesla') {
    chemistryNote = 'Tesla pack — relatively strong retention vs early EVs';
    factor = age <= 3 ? 0.96 : age <= 6 ? 0.88 : age <= 10 ? 0.78 : 0.68;
  } else if (range > 0 && range < 100) {
    chemistryNote = 'Short-range pack — degradation weighs heavily on value';
    factor = age <= 4 ? 0.72 : age <= 8 ? 0.58 : 0.45;
  } else {
    factor = age <= 3 ? 0.95 : age <= 6 ? 0.85 : age <= 10 ? 0.72 : 0.58;
  }

  const tier = classifyEvRetentionTier(car);
  if (tier === 'A') factor = Math.min(1, factor + 0.05);
  if (tier === 'C') factor *= 0.92;

  factor = Math.max(0.35, Math.min(1, factor));

  let label = '90–100% (excellent)';
  if (factor < 0.6) label = 'Below 60% (poor)';
  else if (factor < 0.75) label = '60–74% (fair)';
  else if (factor < 0.9) label = '75–89% (good)';

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

  const segmentK: Record<MarketSegment, number> = {
    economy: 0.16,
    mainstream: 0.13,
    luxury: 0.17,
    performance: 0.15,
    utility: 0.12,
    exotic: 0.2,
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

  let modifier = brand;
  if (fuelType === 'hybrid') modifier *= 1.03;
  if (age > 12) modifier *= 0.92;

  return Math.min(0.97, ageCurve * modifier);
}

function roundMoney(n: number): number {
  if (n < 5000) return Math.round(n / 100) * 100;
  if (n < 25000) return Math.round(n / 250) * 250;
  return Math.round(n / 500) * 500;
}

function conditionMultiplier(bhf: number): { poor: number; average: number; excellent: number } {
  return {
    poor: Math.max(0.55, bhf - 0.18),
    average: bhf,
    excellent: Math.min(1.05, bhf + 0.1),
  };
}

export function estimateMarketValue(car: CarSpecs): MarketValueEstimate {
  const msrpCad = Math.round(usdAnchorToCadValue(estimateNewVehicleMsrp(car)));
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
  let confidenceLabel = 'Ontario-baseline model estimate — not a live listing quote';

  if (MODEL_MSRP_RULES.some((r) => r.test(car))) {
    confidence = 'high';
    confidenceLabel = 'Model-anchored CAD value with age and condition curve';
  } else if (fuelType === 'electric' && age > 10) {
    confidenceLabel = 'Model estimate — older EV values vary by battery health';
  } else if (fuelType === 'hydrogen') {
    confidence = 'low';
    confidenceLabel = 'Rare FCEV — thin market, infrastructure risk, high value uncertainty';
  } else if (segment === 'exotic') {
    confidenceLabel = 'Thin-market vehicle — estimate uses segment baseline';
  } else if (age > 15) {
    confidenceLabel = 'Aged vehicle — condition affects value more than age curve';
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
export function estimateDepreciation5Year(car: CarSpecs, market: MarketValueEstimate): { low: number; mid: number; high: number } {
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
