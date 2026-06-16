import type { CarSpecs } from '../types/car.types.js';
import { inferEffectiveFuelType } from './fuel-type-inference.js';

interface EvPowerRule {
  test: (car: CarSpecs) => boolean;
  hp: number | ((car: CarSpecs) => number);
}

/** Manufacturer-rated motor output when EPA omits horsepower (common on EVs). */
const EV_POWER_RULES: EvPowerRule[] = [
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model 3') && /performance|perf/i.test(c.model), hp: 450 },
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model 3') && /long range|long-range/i.test(c.model), hp: 346 },
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model 3'), hp: 283 },
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model y') && /performance|perf/i.test(c.model), hp: 456 },
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model y'), hp: 384 },
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model s'), hp: 670 },
  { test: (c) => c.make === 'Tesla' && c.model.toLowerCase().includes('model x'), hp: 670 },
  { test: (c) => c.make === 'Lucid' && /grand touring|g touring|dream/i.test(c.model), hp: 819 },
  { test: (c) => c.make === 'Lucid' && /touring/i.test(c.model), hp: 620 },
  { test: (c) => c.make === 'Lucid', hp: 480 },
  { test: (c) => c.make === 'Rivian' && /r1t|r1s/i.test(c.model) && /quad|max/i.test(c.model), hp: 835 },
  { test: (c) => c.make === 'Rivian', hp: 533 },
  { test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq 6') && /long range|long-range/i.test(c.model), hp: 225 },
  { test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq 6'), hp: 149 },
  { test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq 5'), hp: 320 },
  { test: (c) => c.make === 'Hyundai' && c.model.toLowerCase().includes('ioniq electric'), hp: 118 },
  { test: (c) => c.make === 'Kia' && c.model.toLowerCase().includes('ev6'), hp: 320 },
  { test: (c) => c.make === 'Kia' && c.model.toLowerCase().includes('niro ev'), hp: 201 },
  { test: (c) => c.make === 'Chevrolet' && c.model.toLowerCase().includes('bolt'), hp: 200 },
  { test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('mustang mach-e'), hp: 266 },
  { test: (c) => c.make === 'Ford' && c.model.toLowerCase().includes('f-150 lightning'), hp: 580 },
  { test: (c) => c.make === 'Porsche' && c.model.toLowerCase().includes('taycan'), hp: 402 },
  { test: (c) => c.make === 'Mercedes-Benz' && /eqs|eqe|eqb|eqc/i.test(c.model), hp: 329 },
  { test: (c) => c.make === 'BMW' && /^i[4-7x]/i.test(c.model.replace(/\s/g, '')), hp: 335 },
  { test: (c) => c.make === 'Audi' && /^e-tron|q4|q8.*e/i.test(c.model), hp: 402 },
  { test: (c) => c.make === 'Volkswagen' && c.model.toLowerCase().includes('id.4'), hp: 201 },
  { test: (c) => c.make === 'Nissan' && c.model.toLowerCase().includes('leaf'), hp: 147 },
  { test: (c) => c.make === 'Polestar' && c.model.toLowerCase().includes('2'), hp: 476 },
  { test: (c) => c.make === 'Polestar', hp: 299 },
];

export function estimateEvHorsepower(car: CarSpecs): number | null {
  if (inferEffectiveFuelType(car) !== 'electric') return null;
  if (car.engine.horsepower != null && car.engine.horsepower > 0) return null;

  for (const rule of EV_POWER_RULES) {
    if (!rule.test(car)) continue;
    return typeof rule.hp === 'function' ? rule.hp(car) : rule.hp;
  }
  return null;
}
