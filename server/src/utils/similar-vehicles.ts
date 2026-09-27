import { usdAnchorToCadValue } from '../config/regional-assumptions.js';
import type { Car } from '../types/car.types.js';
import { isCollectorCar } from './collector-cars.js';
import { sharesCompetitiveSet } from './competitive-sets.js';
import { modelFamilyName } from './fuzzy-search.js';
import { estimateMarketValue, estimateNewVehicleMsrp } from './ownership-economics.js';
import { isThreeRow } from './three-row.js';
import { segmentAffinity, type ShoppingSegment } from './vehicle-taxonomy.js';

/**
 * Exotics, cross-shopped against other cars only at a like price. Maserati
 * and Lotus are not on it: a Ghibli is shopped against a 5 Series, an Emira
 * against a Cayman.
 */
const EXOTIC_MAKES = new Set([
  'Ferrari',
  'Lamborghini',
  'Aston Martin',
  'McLaren',
  // EPA's name for the make.
  'McLaren Automotive',
  'Bentley',
  'Rolls-Royce',
  'Bugatti',
  'Koenigsegg',
  'Pagani',
  'Maybach',
]);

/** Makes whose shoppers compare against each other, not against Toyota or Honda. */
const LUXURY_BRANDS = new Set([
  'Acura',
  'Alfa Romeo',
  'Audi',
  'BMW',
  'Cadillac',
  'Genesis',
  'Infiniti',
  'Jaguar',
  'Land Rover',
  'Lexus',
  'Lincoln',
  'Lotus',
  'Maserati',
  'Mercedes-Benz',
  'Polestar',
  'Porsche',
  'Tesla',
  'Volvo',
  'Lucid',
  'Rivian',
]);

/**
 * Priced between the tiers and shopped against both: a Model 3 against an i4
 * and a Polestar 2, and an Ioniq 6 and an EV6. As luxury cars only, a Model
 * Y's rivals were a Q4, an EQB and an iX, with no Ioniq 5 or Mach-E.
 */
function bridgesBrandTiers(car: Car): boolean {
  return car.make === 'Tesla' && /^model [3y]\b/i.test(car.model);
}

/** Exotic makes and every supercar: an R8 is cross-shopped against a Huracán. */
function isExoticPeer(car: Car): boolean {
  return EXOTIC_MAKES.has(car.make) || car.shoppingSegment === 'supercar';
}

/** Tuners' versions of other makers' cars: a Roush F-150 is an F-150. */
const TUNER_MAKES = /^(roush|saleen|tecstar|hennessey|lingenfelter|callaway)/i;

/**
 * EPA's names for one line: a "New Wrangler Unlimited" is a Wrangler, a
 * "718 Cayman GT4" a Cayman, a "V12 Vantage S" a Vantage, a "Jetta GLI" a GLI.
 */
function lineFamily(model: string): string {
  return modelFamilyName(model)
    .replace(/^new /, '')
    .replace(/^718 /, '')
    .replace(/^v(8|10|12) /, '')
    .replace(/^jetta gli\b/, 'gli')
    .replace(/^golf gti\b/, 'gti');
}

/**
 * Another version of the anchor's own model, which is not an alternative to
 * it: a Huracán Sterrato for a Huracán, a Civic Type R for a Civic, any 911
 * for a 911 Carrera, an X5 M for an X5, a Model 3 Performance for a Model 3.
 */
export function sameModelLine(a: Car, b: Car): boolean {
  if (a.make !== b.make) return false;
  const fa = lineFamily(a.model);
  const fb = lineFamily(b.model);
  if (fa === fb || fb.startsWith(`${fa} `) || fa.startsWith(`${fb} `)) return true;
  if (lineKey(a) === lineKey(b)) return true;
  // Numbered lines share their first word: "911 Carrera", "911 Turbo S".
  const first = fa.split(' ')[0];
  return first.length >= 2 && /\d/.test(first) && fb.split(' ')[0] === first;
}

/** Words that name a line only with the word after them: "Model 3", "Grand Cherokee". */
const LINE_PREFIXES = new Set(['model', 'grand', 'range', 'santa', 'amg', 'new', 'land', 'town']);

/**
 * One suggestion per model line: the Camry "AWD LE/SE" and "AWD XLE/XSE", a
 * Taycan 4 and 4S, an Urus and an Urus S each took two of six places.
 */
function lineKey(car: Car): string {
  const words = lineFamily(car.model).split(' ');
  const n = LINE_PREFIXES.has(words[0]) && words.length > 1 ? 2 : 1;
  return `${car.make}|${words.slice(0, n).join(' ')}`;
}

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
  // Collector cars carry no estimate, and the depreciation model's figure is
  // wrong by design (a 2015 Lancer Evolution at $10,000, so its rivals were a
  // Buick Verano and an Impala). They trade near their sticker or above it.
  const mid = isCollectorCar(car)
    ? Math.round(usdAnchorToCadValue(estimateNewVehicleMsrp(car)))
    : estimateMarketValue(car).mid;
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
export function scoreCrossShopCandidate(
  anchor: Car,
  candidate: Car,
  candidatePrice: number,
): number {
  const anchorPrice = priceMid(anchor);
  const anchorSeg = (anchor.shoppingSegment ?? 'mainstream') as ShoppingSegment;
  const candSeg = (candidate.shoppingSegment ?? 'mainstream') as ShoppingSegment;

  let score = 0;

  // The class shoppers compare within outweighs everything else: a Camry's
  // rivals are an Accord and a Sonata, not a Civic at the same price; a
  // Wrangler's a Bronco and a 4Runner, not a Santa Fe Hybrid.
  const sameClass = sharesCompetitiveSet(anchor, candidate);
  if (sameClass) score += 10;

  score += segmentAffinity(anchorSeg, candSeg) * 8;
  if (anchorSeg === candSeg) score += 4;

  if (candidate.bodyStyle === anchor.bodyStyle) score += 3;
  // A RAV4 shopper compares a CR-V and a Rogue before a Q3 or a GLA. Sports
  // cars cross the line: a Corvette is a 911's rival.
  const sporting = anchorSeg === 'sports-car' || anchorSeg === 'supercar' || anchorSeg === 'muscle';
  if (
    !sporting &&
    (LUXURY_BRANDS.has(candidate.make) === LUXURY_BRANDS.has(anchor.make) ||
      bridgesBrandTiers(anchor) ||
      bridgesBrandTiers(candidate))
  ) {
    score += 3;
  }
  // A Telluride shopper wants a third row; a RAV4 shopper does not.
  if (anchor.bodyStyle === 'suv' && isThreeRow(anchor) === isThreeRow(candidate)) score += 2;
  // EPA's size class measures interior volume (a Civic and a Camry are both
  // "Midsize"), so it counts only when no class is known.
  if (!sameClass && anchor.epa?.vClass && candidate.epa?.vClass === anchor.epa.vClass) score += 2;
  else if (
    anchor.bodyStyle === 'hatchback' &&
    candidate.bodyStyle === 'sedan' &&
    candSeg === 'sport-sedan'
  ) {
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

  // Of a rival's configurations, the one set up like this car: an automatic
  // Accord for an automatic Camry, an AWD CR-V for an AWD RAV4.
  if (candidate.transmission?.type === anchor.transmission?.type) score += 0.75;
  if (candidate.driveType && candidate.driveType === anchor.driveType) score += 0.75;

  const yearDiff = Math.abs(candidate.year - anchor.year);
  score += Math.max(0, 4 - yearDiff) * 0.35;

  // Same make is a weak signal for enthusiasts — often wrong (VW Jetta vs GTI).
  if (candidate.make === anchor.make) score -= 1.5;

  // Direct platform siblings get a small boost (Golf R for GTI).
  const anchorModel = anchor.model.toLowerCase();
  const candModel = candidate.model.toLowerCase();
  if (anchor.make === candidate.make && anchorModel.includes('gti') && candModel.includes('golf r'))
    score += 3;

  return score;
}

export function findSimilarCars(anchor: Car, all: Car[], limit = 6): Car[] {
  const anchorPrice = priceMid(anchor);
  const anchorExotic = isExoticPeer(anchor);
  // A Senna is not an alternative to a Huracán: collector cars trade on
  // auctions, and carry no estimate to compare prices with.
  const anchorCollector = isCollectorCar(anchor);
  const anchorTuner = TUNER_MAKES.test(anchor.make);

  const collect = (yearWindow: number, minPriceRatio: number): Car[] => {
    const best = new Map<string, { car: Car; score: number }>();

    for (const c of all) {
      if (c.id === anchor.id) continue;
      if (Math.abs(c.year - anchor.year) > yearWindow) continue;
      if (sameModelLine(anchor, c)) continue;
      if (!anchorCollector && isCollectorCar(c)) continue;
      if (!anchorTuner && TUNER_MAKES.test(c.make)) continue;

      const key = lineKey(c);

      const price = priceMid(c);
      const ratio =
        anchorPrice > 0 && price > 0
          ? Math.min(anchorPrice, price) / Math.max(anchorPrice, price)
          : 0;
      if (minPriceRatio > 0 && ratio > 0 && ratio < minPriceRatio) continue;
      // An exotic meets other cars only at a like price: a Huracán and a 911
      // Turbo S, not a Huracán and a Corvette.
      if (isExoticPeer(c) !== anchorExotic && ratio < 0.6) continue;

      const score = scoreCrossShopCandidate(anchor, c, price);
      const current = best.get(key);
      if (!current || score > current.score) best.set(key, { car: c, score });
    }

    return Array.from(best.values())
      .sort((a, b) => b.score - a.score || b.car.year - a.car.year)
      .map((x) => x.car);
  };

  // At most two per make: a Huracán's six suggestions were five Ferraris, an
  // M3's four Panameras.
  const diverse = (cars: Car[]): Car[] => {
    const perMake = new Map<string, number>();
    return cars.filter((car) => {
      const n = perMake.get(car.make) ?? 0;
      perMake.set(car.make, n + 1);
      return n < 2;
    });
  };
  let result = diverse(collect(8, 0.35));
  if (result.length < limit) result = diverse(collect(12, 0.28));
  if (result.length < limit) result = diverse(collect(20, 0));
  return result.slice(0, limit);
}
