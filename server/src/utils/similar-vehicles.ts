import type { Car } from '../types/car.types.js';
import { estimateMarketValue } from './ownership-economics.js';
import { segmentAffinity, type ShoppingSegment } from './vehicle-taxonomy.js';

/** True exotics — never cross-shopped against mainstream cars. */
const EXOTIC_MAKES = new Set([
  'Ferrari', 'Lamborghini', 'Aston Martin', 'McLaren', 'Bentley', 'Rolls-Royce',
  'Maserati', 'Lotus', 'Bugatti', 'Koenigsegg', 'Pagani', 'Maybach',
]);

/** Collapse trim noise so one entry per make+model. */
function baseModelKey(make: string, model: string): string {
  const base = model
    .toLowerCase()
    .split('(')[0]
    .split('/')[0]
    .split(' - ')[0]
    .replace(/\b\d+\s?kwh\b/g, ' ')
    .replace(
      /\b(awd|4wd|2wd|fwd|rwd|soft top|long range|standard range|mid range|performance|coupe|volante|cabriolet|convertible|spider|spyder|roadster|sedan|hatchback|wagon)\b/g,
      ' ',
    )
    .replace(/[-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${make.toLowerCase()}|${base}`;
}

const priceMidCache = new Map<string, number>();
function priceMid(car: Car): number {
  if (car.price?.msrp && car.price.msrp > 0) return car.price.msrp;
  const cached = priceMidCache.get(car.id);
  if (cached != null) return cached;
  const mid = estimateMarketValue(car).mid;
  priceMidCache.set(car.id, mid);
  return mid;
}

function baseModelKeyLocal(make: string, model: string): string {
  return baseModelKey(make, model);
}

export { baseModelKeyLocal as baseModelKey };

/** segment + performance + price tier.
 * Deliberately de-prioritizes same-make family cars (Jetta, Passat) in favor of
 * segment peers (Civic Si, Golf R, WRX, etc.).
 */
export function scoreCrossShopCandidate(anchor: Car, candidate: Car, candidatePrice: number): number {
  const anchorPrice = priceMid(anchor);
  const anchorSeg = (anchor.shoppingSegment ?? 'mainstream') as ShoppingSegment;
  const candSeg = (candidate.shoppingSegment ?? 'mainstream') as ShoppingSegment;

  let score = 0;

  score += segmentAffinity(anchorSeg, candSeg) * 8;
  if (anchorSeg === candSeg) score += 4;

  if (candidate.bodyStyle === anchor.bodyStyle) score += 3;
  else if (anchor.bodyStyle === 'hatchback' && candidate.bodyStyle === 'sedan' && candSeg === 'sport-sedan') {
    score += 1.5;
  }

  const priceRatio =
    anchorPrice > 0 && candidatePrice > 0
      ? Math.min(anchorPrice, candidatePrice) / Math.max(anchorPrice, candidatePrice)
      : 0;
  score += priceRatio * 5;

  const anchorHp = anchor.engine.horsepower ?? 0;
  const candHp = candidate.engine.horsepower ?? 0;
  if (anchorHp > 0 && candHp > 0) {
    score += (Math.min(anchorHp, candHp) / Math.max(anchorHp, candHp)) * 3;
  }

  const anchorFcev = anchor.engine.fuelType === 'hydrogen';
  const candFcev = candidate.engine.fuelType === 'hydrogen';
  if (anchorFcev && candFcev) score += 15;
  else if (anchorFcev && !candFcev) score -= 4;
  else if (candidate.engine.fuelType === anchor.engine.fuelType) score += 1.5;

  const yearDiff = Math.abs(candidate.year - anchor.year);
  score += Math.max(0, 4 - yearDiff) * 0.35;

  // Same make is a weak signal for enthusiasts — often wrong (VW Jetta vs GTI).
  if (candidate.make === anchor.make) score -= 1.5;

  // Direct platform siblings get a small boost (Golf R for GTI).
  const anchorModel = anchor.model.toLowerCase();
  const candModel = candidate.model.toLowerCase();
  if (anchor.make === candidate.make && anchorModel.includes('gti') && candModel.includes('golf r')) score += 3;

  return score;
}

export function findSimilarCars(anchor: Car, all: Car[], limit = 6): Car[] {
  const anchorPrice = priceMid(anchor);
  const anchorExotic = EXOTIC_MAKES.has(anchor.make);
  const anchorBase = baseModelKeyLocal(anchor.make, anchor.model);

  const collect = (yearWindow: number, minPriceRatio: number): Car[] => {
    const best = new Map<string, { car: Car; score: number }>();

    for (const c of all) {
      if (c.id === anchor.id) continue;
      if (EXOTIC_MAKES.has(c.make) !== anchorExotic) continue;
      if (Math.abs(c.year - anchor.year) > yearWindow) continue;

      const key = baseModelKeyLocal(c.make, c.model);
      if (key === anchorBase) continue;

      const price = priceMid(c);
      const ratio =
        anchorPrice > 0 && price > 0 ? Math.min(anchorPrice, price) / Math.max(anchorPrice, price) : 0;
      if (minPriceRatio > 0 && ratio > 0 && ratio < minPriceRatio) continue;

      const score = scoreCrossShopCandidate(anchor, c, price);
      const current = best.get(key);
      if (!current || score > current.score) best.set(key, { car: c, score });
    }

    return Array.from(best.values())
      .sort((a, b) => b.score - a.score || b.car.year - a.car.year)
      .map((x) => x.car);
  };

  let result = collect(8, 0.35);
  if (result.length < limit) result = collect(12, 0.28);
  if (result.length < limit) result = collect(20, 0);
  return result.slice(0, limit);
}
