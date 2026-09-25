import type { CarSpecs } from '../types/car.types.js';

/**
 * Cars whose used price is set by collectors, not by depreciation.
 *
 * The valuation model depreciates from a sticker price. For these that is the
 * wrong way round: they trade on auction results, condition and provenance,
 * and many are worth more than when new. The model put a 2005 Ford GT at
 * $10,500, a first-generation NSX at $12,000 and a Supra Turbo at $2,300,
 * several at "medium" or "high" confidence. Rather than print numbers that
 * are wrong by an order of magnitude, the site says it does not value them.
 *
 * The list is deliberately short: cars with a well-established collector
 * market. Add to it with the reason, not by lowering the bar.
 */

const REFERENCE_YEAR = new Date().getFullYear();

interface CollectorRule {
  test: (car: CarSpecs, age: number) => boolean;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const RULES: CollectorRule[] = [
  // Japanese performance icons of the 1990s–2000s.
  { test: (c) => same(c.make, 'Acura') && /^nsx/i.test(c.model) && c.year <= 2005 },
  { test: (c) => same(c.make, 'Toyota') && /^supra$/i.test(c.model) && c.year <= 1998 },
  { test: (c) => same(c.make, 'Mazda') && /^rx-7/i.test(c.model) && c.year <= 1995 },
  {
    test: (c) =>
      same(c.make, 'Nissan') && /^300zx/i.test(c.model) && c.engine.aspiration === 'turbocharged',
  },
  { test: (c) => same(c.make, 'Honda') && /^s2000/i.test(c.model) },
  {
    test: (c) =>
      /^(mitsubishi|dodge)$/i.test(c.make) &&
      /^(3000 ?gt|stealth)/i.test(c.model) &&
      c.engine.aspiration === 'turbocharged',
  },
  // Air-cooled and track-special Porsches.
  { test: (c) => same(c.make, 'Porsche') && /^911/i.test(c.model) && c.year <= 1998 },
  {
    test: (c, age) => same(c.make, 'Porsche') && /^911.*\b(gt2|gt3)\b/i.test(c.model) && age >= 15,
  },
  { test: (c) => same(c.make, 'Porsche') && /carrera gt|^918/i.test(c.model) },
  // American collector cars.
  { test: (c) => same(c.make, 'Dodge') && /^viper/i.test(c.model) },
  { test: (c) => same(c.make, 'Ford') && /^gt(\s|$)/i.test(c.model) },
  { test: (c) => same(c.make, 'Ford') && /^bronco/i.test(c.model) && c.year <= 1996 },
  { test: (c) => same(c.make, 'Plymouth') && /^prowler/i.test(c.model) },
  // European exotics once they are twenty, and limited-run hypercars at any age.
  { test: (c, age) => /^(ferrari|lamborghini)$/i.test(c.make) && age >= 20 },
  {
    test: (c) =>
      same(c.make, 'Ferrari') && /\b(f40|f50|enzo|laferrari|monza|daytona sp3)\b/i.test(c.model),
  },
  {
    test: (c) => /mclaren/i.test(c.make) && /\b(p1|senna|speedtail|elva)\b/i.test(c.model),
  },
  { test: (c) => same(c.make, 'Mercedes-Benz') && /\bslr\b/i.test(c.model) },
  { test: (c) => same(c.make, 'Lexus') && /\blfa\b/i.test(c.model) },
  { test: (c) => same(c.make, 'BMW') && /^z8/i.test(c.model) },
  { test: (c) => /^(bugatti|bugatti rimac|pagani|koenigsegg)$/i.test(c.make) },
];

export const COLLECTOR_NOTE =
  'Collector car. Its price follows auction results, condition and provenance, and often rises with age, so a depreciation model cannot estimate it. We do not value it, and running costs depend on how it is stored, insured and driven.';

export function isCollectorCar(car: CarSpecs): boolean {
  const age = Math.max(0, REFERENCE_YEAR - car.year);
  return RULES.some((rule) => rule.test(car, age));
}
