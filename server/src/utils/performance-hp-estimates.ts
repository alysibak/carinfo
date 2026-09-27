import type { CarSpecs } from '../types/car.types.js';
import { canonicalizeDisplayModel } from './vehicle-taxonomy.js';

interface HpRule {
  test: (car: CarSpecs, model: string) => boolean;
  hp: number | ((car: CarSpecs) => number);
}

const HP_RULES: HpRule[] = [
  {
    test: (_, m) => m === 'Golf GTI',
    hp: (c) => {
      const litres = c.engine.displacement ?? 0;
      if (c.year >= 2022) return 241;
      if (c.year >= 2018) return 228;
      if (c.year >= 2015) return 210;
      // Before the 2.0T (200 hp): the 1.8T (150 hp, 180 from 2002, into
      // 2006), the VR6 (172 hp, 200 as a 24-valve from 2002) and the
      // eight-valve 2.0 (115 hp).
      if (litres < 1.95) return c.year >= 2002 ? 180 : 150;
      if (c.year >= 2006) return 200;
      if (c.engine.cylinders === 6) return c.year >= 2002 ? 200 : 172;
      return 115;
    },
  },
  {
    test: (_, m) => m === 'Golf R',
    hp: (c) => (c.year >= 2022 ? 315 : c.year >= 2016 ? 292 : 256),
  },
  {
    test: (_, m) => m === 'Golf',
    hp: (c) => {
      const litres = c.engine.displacement ?? 0;
      // TDIs: 90 hp (1.9, to 2003), 100 (1.9 PD), 140 (2.0, 2009-14), 150 (2015).
      if (c.engine.fuelType === 'diesel') {
        return c.year >= 2015 ? 150 : c.year >= 2009 ? 140 : c.year >= 2004 ? 100 : 90;
      }
      if (c.engine.cylinders === 5) return 170; // The 2.5-litre five, 2010-14.
      if (litres <= 1.45) return 147; // The 1.4T, 2019-21.
      if (litres < 1.95) return c.year >= 2015 ? 170 : 150; // The 1.8T.
      return 115; // The eight-valve 2.0.
    },
  },
  {
    test: (_, m) => m === 'Civic Type R',
    hp: (c) => (c.year >= 2023 ? 315 : c.year >= 2017 ? 306 : 305),
  },
  {
    test: (_, m) => m === 'Civic Si',
    hp: (c) => (c.year >= 2022 ? 200 : c.year >= 2017 ? 205 : 201),
  },
  { test: (c) => c.make === 'Ford' && /focus st/i.test(c.model), hp: 252 },
  { test: (c) => c.make === 'Ford' && /fiesta st/i.test(c.model), hp: 197 },
  {
    test: (c) => c.make === 'Subaru' && /wrx/i.test(c.model),
    hp: (c) => (c.year >= 2022 ? 271 : c.year >= 2015 ? 268 : 265),
  },
  { test: (c) => c.make === 'Hyundai' && /elantra n/i.test(c.model), hp: 276 },
  { test: (c) => c.make === 'Hyundai' && /veloster n/i.test(c.model), hp: 275 },
  { test: (c) => c.make === 'Mazda' && /mazdaspeed3/i.test(c.model), hp: 263 },
  { test: (_, m) => m === 'Cooper S', hp: (c) => (c.year >= 2020 ? 189 : 189) },
];

/** Manufacturer-rated output when EPA/horsepower enrichment is missing or mismatched. */
export function estimatePerformanceHorsepower(car: CarSpecs): number | null {
  const model = canonicalizeDisplayModel(car);

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
  // The 2.0T GTIs; the earlier ones were rated from 115 hp.
  if (model === 'Golf GTI' && car.year >= 2006 && (currentHp == null || currentHp < 195)) {
    return true;
  }
  if (model === 'Golf R' && (currentHp == null || currentHp < 250)) return true;
  if (model === 'Golf' && disp < 1.95 && currentHp != null && currentHp > 200) return true;
  return currentHp == null || currentHp <= 0;
}
