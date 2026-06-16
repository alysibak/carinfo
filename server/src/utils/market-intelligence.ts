import type { CarSpecs } from '../types/car.types.js';
import {
  annualKmToMiles,
  EPA_ANNUAL_MILES,
  getRegionalAssumptions,
  mpgToLPer100Km,
  mpgeToKwhPer100Km,
} from '../config/regional-assumptions.js';
import { computeOwnershipEconomics, estimatePriceMsrp } from './ownership-economics.js';

const REGION = getRegionalAssumptions();

export function calculateCostPerMile(
  car: CarSpecs,
  prices = {
    gasPriceCadPerL: REGION.gasPriceCadPerL,
    electricityPriceCadPerKwh: REGION.electricityRateCadPerKwh,
  },
): number | null {
  const mpg = car.fuelEconomy.combined || 0;
  const fuelType = car.engine.fuelType;
  const annualMiles = annualKmToMiles(REGION.annualKm);

  if (fuelType === 'hydrogen') {
    const annualUsd = car.epa?.annualFuelCost;
    if (annualUsd != null && annualUsd > 0) {
      const annualCad = annualUsd * REGION.cadUsdExchangeRate * (REGION.annualKm / (EPA_ANNUAL_MILES * 1.609344));
      return annualCad / annualMiles;
    }
    return null;
  }

  if (fuelType === 'electric') {
    const kwhPer100Km =
      mpg > 0
        ? mpgeToKwhPer100Km(mpg)
        : car.epa?.kWhPer100Mi != null && car.epa.kWhPer100Mi >= 15
          ? car.epa.kWhPer100Mi / 1.609344
          : null;
    if (kwhPer100Km != null && kwhPer100Km > 0) {
      const annualCad = (REGION.annualKm / 100) * kwhPer100Km * prices.electricityPriceCadPerKwh;
      return annualCad / annualMiles;
    }
    return null;
  }

  if (fuelType === 'plug-in hybrid') {
    if (mpg <= 0) return null;
    const gasAnnual =
      (REGION.annualKm / 100) * mpgToLPer100Km(mpg) * prices.gasPriceCadPerL * REGION.phev.gasMileFraction;
    const elecAnnual =
      (REGION.annualKm / 100) * mpgeToKwhPer100Km(mpg) * prices.electricityPriceCadPerKwh * REGION.phev.electricMileFraction;
    return (gasAnnual + elecAnnual) / annualMiles;
  }

  if (fuelType === 'hybrid' || fuelType === 'gasoline' || fuelType === 'diesel') {
    if (mpg <= 0) return null;
    const annualCad = (REGION.annualKm / 100) * mpgToLPer100Km(mpg) * prices.gasPriceCadPerL;
    return annualCad / annualMiles;
  }

  return null;
}

export { estimatePriceMsrp };

export function getSegment<T extends CarSpecs>(car: CarSpecs, allCars: T[]): T[] {
  const price = car.price?.msrp || 0;
  const segment = car.shoppingSegment;
  return allCars.filter((c) => {
    if (segment && c.shoppingSegment) {
      if (c.shoppingSegment !== segment && c.bodyStyle !== car.bodyStyle) return false;
    } else if (c.bodyStyle !== car.bodyStyle) {
      return false;
    }
    if (Math.abs(c.year - car.year) > 3) return false;
    const cPrice = c.price?.msrp || 0;
    if (price > 0 && cPrice > 0) {
      const ratio = cPrice / price;
      if (ratio < 0.65 || ratio > 1.35) return false;
    }
    return true;
  });
}

export function calculateMarketPosition(car: CarSpecs, segment: CarSpecs[]) {
  const price = car.price?.msrp;
  const hp = car.engine.horsepower;
  const mpg = car.fuelEconomy.combined;
  const valueScore = calculateValueScore(car);

  const percentile = (value: number | undefined, values: number[], higherIsBetter = true) => {
    const filtered = values.filter((v) => v > 0);
    if (!value || filtered.length === 0) return undefined;
    const sorted = [...filtered].sort((a, b) => a - b);
    const rank = sorted.filter((v) => (higherIsBetter ? v <= value : v >= value)).length;
    return Math.round((rank / sorted.length) * 100);
  };

  const prices = segment.map((c) => c.price?.msrp).filter((v): v is number => v != null && v > 0);
  const hps = segment.map((c) => c.engine.horsepower).filter((v): v is number => v != null && v > 0);
  const mpgs = segment.map((c) => c.fuelEconomy.combined).filter((v): v is number => v != null && v > 0);
  const values = segment.map((c) => calculateValueScore(c)).filter((v) => v > 0);

  return {
    pricePercentile: percentile(price, prices, false),
    hpPercentile: percentile(hp, hps, true),
    mpgPercentile: percentile(mpg, mpgs, true),
    valuePercentile: percentile(valueScore, values, true),
  };
}

export function calculateValueScore(car: CarSpecs): number {
  const price = car.price?.msrp || 0;
  const mpg = car.fuelEconomy.combined || 0;
  if (price <= 0 || mpg <= 0) return 0;
  return (mpg * 100) / (price / 10000);
}

export type DealRating = 'great-deal' | 'good-deal' | 'fair' | 'overpriced';

export function getDealRating(_car: CarSpecs, _segment: CarSpecs[]): DealRating | null {
  return null;
}

export function predictZeroToSixty(car: CarSpecs): {
  predicted: number;
  confidence: 'high' | 'medium' | 'low';
  method: 'actual' | 'predicted';
} | null {
  if (car.performance?.zeroToSixty && car.performance.zeroToSixty > 0) {
    return {
      predicted: car.performance.zeroToSixty,
      confidence: 'high',
      method: 'actual',
    };
  }

  const hp = car.engine.horsepower;
  const weight = car.dimensions?.curbWeight;
  if (!hp || !weight) return null;

  const powerToWeight = (hp / weight) * 1000;
  let drivetrainFactor = 1.0;
  if (car.driveType === 'AWD' || car.driveType === '4WD') drivetrainFactor = 0.92;
  else if (car.driveType === 'FWD') drivetrainFactor = 1.08;

  let transmissionFactor = 1.0;
  if (car.transmission.type === 'dual-clutch') transmissionFactor = 0.95;
  else if (car.transmission.type === 'cvt') transmissionFactor = 1.05;

  const electricBonus = car.engine.fuelType === 'electric' ? 0.7 : 1.0;
  const predicted = Math.max(2, Math.min(15, (700 / powerToWeight) * drivetrainFactor * transmissionFactor * electricBonus));

  return {
    predicted: Math.round(predicted * 10) / 10,
    confidence: car.engine.fuelType === 'electric' ? 'high' : 'medium',
    method: 'predicted',
  };
}

export function estimateTco5Year(car: CarSpecs): number | null {
  const econ = computeOwnershipEconomics(car, [car]);
  if (!econ.tco5Year) return null;
  return Math.round((econ.tco5Year.low + econ.tco5Year.high) / 2);
}
