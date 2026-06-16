import type { CarSpecs } from '../types/car.types.js';
import { canonicalizeDisplayModel } from './vehicle-taxonomy.js';

interface HpRule {
  test: (car: CarSpecs, model: string) => boolean;
  hp: number | ((car: CarSpecs) => number);
}

const HP_RULES: HpRule[] = [
  { test: (_, m) => m === 'Golf GTI', hp: (c) => (c.year >= 2022 ? 241 : c.year >= 2018 ? 228 : c.year >= 2015 ? 210 : 200) },
  { test: (_, m) => m === 'Golf R', hp: (c) => (c.year >= 2022 ? 315 : c.year >= 2016 ? 292 : 256) },
  { test: (_, m) => m === 'Golf', hp: (c) => ((c.engine.displacement ?? 0) >= 2 ? 150 : 170) },
  { test: (_, m) => m === 'Civic Type R', hp: (c) => (c.year >= 2023 ? 315 : c.year >= 2017 ? 306 : 305) },
  { test: (_, m) => m === 'Civic Si', hp: (c) => (c.year >= 2022 ? 200 : c.year >= 2017 ? 205 : 201) },
  { test: (c) => c.make === 'Ford' && /focus st/i.test(c.model), hp: 252 },
  { test: (c) => c.make === 'Ford' && /fiesta st/i.test(c.model), hp: 197 },
  { test: (c) => c.make === 'Subaru' && /wrx/i.test(c.model), hp: (c) => (c.year >= 2022 ? 271 : c.year >= 2015 ? 268 : 265) },
  { test: (c) => c.make === 'Hyundai' && /elantra n/i.test(c.model), hp: 276 },
  { test: (c) => c.make === 'Hyundai' && /veloster n/i.test(c.model), hp: 275 },
  { test: (c) => c.make === 'Mazda' && /mazdaspeed3/i.test(c.model), hp: 263 },
  { test: (_, m) => m === 'Cooper S', hp: (c) => (c.year >= 2020 ? 189 : 189) },
];

/** Manufacturer-rated output when EPA/horsepower enrichment is missing or mismatched. */
export function estimatePerformanceHorsepower(car: CarSpecs): number | null {
  const model = canonicalizeDisplayModel(car);
  const disp = car.engine.displacement ?? 0;

  // Mis-tagged EPA rows: 1.8L under golf-gti trim is a base Golf, not GTI.
  if (model === 'Golf' && disp < 1.95 && (car.trim ?? '').includes('gti')) {
    return 170;
  }

  for (const rule of HP_RULES) {
    if (!rule.test(car, model)) continue;
    return typeof rule.hp === 'function' ? rule.hp(car) : rule.hp;
  }

  return null;
}

/** Replace EPA HP when canonical model clearly conflicts (e.g. GTI with 170 hp). */
export function shouldOverrideHorsepower(car: CarSpecs, currentHp: number | undefined): boolean {
  const model = canonicalizeDisplayModel(car);
  const disp = car.engine.displacement ?? 0;
  if (model === 'Golf GTI' && disp >= 1.95 && (currentHp == null || currentHp < 195)) return true;
  if (model === 'Golf R' && (currentHp == null || currentHp < 250)) return true;
  if (model === 'Golf' && disp < 1.95 && currentHp != null && currentHp > 200) return true;
  return currentHp == null || currentHp <= 0;
}
