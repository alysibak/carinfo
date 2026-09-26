import type { CarSpecs } from '../types/car.types.js';

/**
 * Trims EPA leaves out of the model name, named from the engine.
 *
 * EPA files a Mustang GT as "Mustang" with a V8, a 2019 Civic Type R as
 * "Civic 5Dr" with a 2.0-litre turbo and a manual, and a 2015 WRX STI as
 * "WRX" with a 2.5-litre turbo. Nothing called them by name, so a search for
 * "mustang gt", "civic type r" or "wrx sti" found none of them, and their
 * cards read like the base car. These rules are deliberately narrow: each
 * engine signature belongs to one trim in the years given, and a model whose
 * name already carries the trim gets nothing.
 */

interface TrimRule {
  make: string;
  model: RegExp;
  /** Skip when the EPA name already says it. */
  named?: RegExp;
  name: (car: CarSpecs) => string | undefined;
}

const litres = (car: CarSpecs) => car.engine.displacement ?? 0;
const cylinders = (car: CarSpecs) => car.engine.cylinders ?? 0;
const turbo = (car: CarSpecs) => car.engine.aspiration?.includes('turbo') ?? false;
const supercharged = (car: CarSpecs) => car.engine.aspiration?.includes('supercharged') ?? false;
const manual = (car: CarSpecs) => car.transmission.type === 'manual';

const RULES: TrimRule[] = [
  {
    make: 'Ford',
    model: /^mustang\b(?!.*mach)/i,
    named: /\b(gt\w*|shelby|bullitt|mach 1|dark horse|cobra)\b/i,
    name: (c) => {
      if (cylinders(c) === 8) {
        if (supercharged(c)) return c.year <= 2004 ? 'SVT Cobra' : 'Shelby GT500';
        return 'GT';
      }
      if (cylinders(c) === 4 && turbo(c) && c.year >= 2015) return 'EcoBoost';
      return undefined;
    },
  },
  {
    make: 'Chevrolet',
    model: /^camaro\b/i,
    named: /\b(ss|zl1|z\/?28|iroc)\b/i,
    name: (c) => {
      if (cylinders(c) !== 8) return undefined;
      // Before 2003 the V8 car was the Z28, with SS as a package on it.
      if (c.year <= 2002) return 'Z28';
      if (supercharged(c)) return 'ZL1';
      if (litres(c) >= 7) return 'Z/28';
      return 'SS';
    },
  },
  {
    make: 'Honda',
    model: /^civic\b/i,
    named: /\b(type r|si)\b/i,
    name: (c) => {
      if (c.year >= 2017 && litres(c) === 2 && turbo(c) && manual(c)) return 'Type R';
      // The Si is the only sedan or coupe with the 1.5 turbo and a manual; the
      // hatchback Sport has the same pairing, so the 5-door is left out.
      if (c.year >= 2017 && litres(c) === 1.5 && turbo(c) && manual(c) && !/5dr/i.test(c.model)) {
        return 'Si';
      }
      // 2002–15: the only Civic with a 2.0 or 2.4 and a manual.
      if (c.year >= 2002 && c.year <= 2015 && litres(c) >= 2 && !turbo(c) && manual(c)) {
        return 'Si';
      }
      return undefined;
    },
  },
  {
    make: 'Subaru',
    model: /^impreza\b/i,
    named: /\b(wrx|sti)\b/i,
    name: (c) => {
      if (!turbo(c) || c.year > 2014) return undefined;
      return manual(c) && c.transmission.speeds === 6 ? 'WRX STI' : 'WRX';
    },
  },
  {
    // From 2015 the WRX is its own model; the STI kept the 2.5-litre turbo.
    make: 'Subaru',
    model: /^wrx\b/i,
    named: /\bsti\b/i,
    name: (c) => (c.year <= 2021 && litres(c) === 2.5 && turbo(c) ? 'STI' : undefined),
  },
  {
    make: 'Dodge',
    model: /^(challenger|charger)\b/i,
    // "SRT" alone is not the trim: EPA files both the 392 and the Hellcat as
    // "Challenger SRT" (or "SRT8"), and only the supercharger tells them apart.
    named: /\b(hellcat|demon|scat|r\/t|daytona)\b/i,
    name: (c) => {
      if (cylinders(c) !== 8) return undefined;
      if (supercharged(c)) return 'Hellcat';
      if (/\bsrt8?\b/i.test(c.model)) return undefined;
      if (litres(c) >= 6.3) return c.year <= 2014 ? 'SRT8' : 'Scat Pack';
      if (litres(c) >= 6) return 'SRT8';
      return 'R/T';
    },
  },
  {
    make: 'Jeep',
    model: /^grand cherokee\b/i,
    named: /\b(srt|trackhawk)\b/i,
    name: (c) => {
      if (supercharged(c) && litres(c) >= 6) return 'Trackhawk';
      if (litres(c) >= 6) return c.year <= 2010 ? 'SRT8' : 'SRT';
      return undefined;
    },
  },
];

export function deriveVariant(car: CarSpecs): string | undefined {
  if (car.engine.fuelType === 'electric') return undefined;
  for (const rule of RULES) {
    if (car.make.toLowerCase() !== rule.make.toLowerCase() || !rule.model.test(car.model)) continue;
    if (rule.named?.test(car.model)) return undefined;
    return rule.name(car);
  }
  return undefined;
}

/**
 * How people type each trim, in search's normalized form ("r/t" arrives as
 * "r t"). Each entry lists equivalent spellings; longer phrases come first, so
 * "wrx sti" wins over "sti".
 */
export const TRIM_QUERY_FORMS: ReadonlyArray<readonly string[]> = [
  ['shelby gt500', 'gt500'],
  ['svt cobra', 'cobra'],
  ['srt hellcat', 'hellcat'],
  ['scat pack'],
  ['wrx sti'],
  ['type r'],
  ['z 28', 'z28'],
  ['r t', 'rt'],
  ['trackhawk'],
  ['ecoboost'],
  ['srt8'],
  ['srt'],
  ['zl1'],
  ['sti'],
  ['wrx'],
  ['ss'],
  ['si'],
  ['gt'],
];
