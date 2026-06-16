import type { CarSpecs } from '../types/car.types.js';
import { classifyEvRetentionTier } from './vehicle-valuation.js';
import { inferEffectiveFuelType } from './fuel-type-inference.js';

/** Weighted EV ranking: efficiency, range, value, retention tier. Higher = better default sort. */
export function computeEvScore(car: CarSpecs, valueMidCad?: number): number {
  if (inferEffectiveFuelType(car) !== 'electric') return 0;

  const mpg = car.fuelEconomy.combined ?? 0;
  const range = car.epa?.rangeMiles ?? 0;
  const price = valueMidCad ?? car.price?.msrp ?? 0;

  const efficiency = Math.min(1, mpg / 140);
  const rangeScore = Math.min(1, range / 450);
  const valueScore = price > 0 ? Math.min(1, Math.max(0, 1 - (price - 15000) / 85000)) : 0.35;

  const tier = classifyEvRetentionTier(car);
  const reliability = tier === 'A' ? 1 : tier === 'B' ? 0.72 : 0.45;

  return efficiency * 0.4 + rangeScore * 0.3 + valueScore * 0.2 + reliability * 0.1;
}
