import type { CarSpecs } from '../types/car.types.js';

/**
 * Segment peers and 0–60 prediction for the vehicle dossier.
 *
 * This module used to also carry calculateCostPerMile, calculateMarketPosition,
 * calculateValueScore, getDealRating (stubbed to always return null) and an
 * estimateTco5Year that shadowed the live one in ownership-economics. None had
 * a caller. Fuel/energy cost now lives in shared/energy-cost.ts, the single
 * engine both server and client use.
 */

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
  const predicted = Math.max(
    2,
    Math.min(15, (700 / powerToWeight) * drivetrainFactor * transmissionFactor * electricBonus),
  );

  return {
    predicted: Math.round(predicted * 10) / 10,
    confidence: car.engine.fuelType === 'electric' ? 'high' : 'medium',
    method: 'predicted',
  };
}
