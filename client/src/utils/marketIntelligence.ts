import type { CarSpecs } from '../types/car.types';

// Calculate derived performance metrics
export interface DerivedMetrics {
  powerDensity: number; // HP per liter
  powerToWeight: number; // HP per pound
  torqueDensity: number; // lb-ft per liter
  hpPerDollar: number; // HP per $1000
  mpgPerDollar: number; // MPG per $1000
  valueScore: number; // Composite score
}

export function calculateDerivedMetrics(car: CarSpecs): DerivedMetrics {
  const hp = car.engine.horsepower;
  const torque = car.engine.torque;
  const displacement = car.engine.displacement;
  const weight = car.dimensions.curbWeight;
  const price = car.price?.msrp || 0;
  const mpg = car.fuelEconomy.combined || 0;

  const powerDensity = displacement > 0 ? hp / displacement : 0;
  const powerToWeight = weight > 0 ? hp / weight : 0;
  const torqueDensity = displacement > 0 ? torque / displacement : 0;
  const hpPerDollar = price > 0 ? (hp / price) * 1000 : 0;
  const mpgPerDollar = price > 0 ? (mpg / price) * 1000 : 0;

  // Composite value score (normalized)
  const valueScore = (hpPerDollar * 50) + (mpgPerDollar * 100);

  return {
    powerDensity,
    powerToWeight,
    torqueDensity,
    hpPerDollar,
    mpgPerDollar,
    valueScore,
  };
}

// Calculate market position relative to segment
export interface MarketPosition {
  pricePercentile: number; // 0-100, higher = more expensive
  hpPercentile: number; // 0-100, higher = more powerful
  mpgPercentile: number; // 0-100, higher = better economy
  valuePercentile: number; // 0-100, higher = better value
  priceVsAvg: number; // Percentage difference from average
  hpVsAvg: number;
  mpgVsAvg: number;
  overallRating: 'excellent' | 'good' | 'average' | 'below-average';
}

export function calculateMarketPosition(
  car: CarSpecs,
  segment: CarSpecs[]
): MarketPosition {
  if (segment.length === 0) {
    return {
      pricePercentile: 50,
      hpPercentile: 50,
      mpgPercentile: 50,
      valuePercentile: 50,
      priceVsAvg: 0,
      hpVsAvg: 0,
      mpgVsAvg: 0,
      overallRating: 'average',
    };
  }

  const prices = segment.map(c => c.price?.msrp || 0).filter(p => p > 0);
  const hps = segment.map(c => c.engine.horsepower).filter(hp => hp > 0);
  const mpgs = segment.map(c => c.fuelEconomy.combined || 0).filter(mpg => mpg > 0);

  const avgPrice = mean(prices);
  const avgHp = mean(hps);
  const avgMpg = mean(mpgs);

  const carPrice = car.price?.msrp || 0;
  const carHp = car.engine.horsepower;
  const carMpg = car.fuelEconomy.combined || 0;

  const pricePercentile = calculatePercentile(carPrice, prices);
  const hpPercentile = calculatePercentile(carHp, hps);
  const mpgPercentile = calculatePercentile(carMpg, mpgs);

  // Value percentile: high HP + high MPG + low price = good value
  const valueScores = segment.map(c => {
    const p = c.price?.msrp || 1;
    const h = c.engine.horsepower;
    const m = c.fuelEconomy.combined || 0;
    return (h * m) / p;
  });
  const carValueScore = (carHp * carMpg) / (carPrice || 1);
  const valuePercentile = calculatePercentile(carValueScore, valueScores);

  const priceVsAvg = avgPrice > 0 ? ((carPrice - avgPrice) / avgPrice) * 100 : 0;
  const hpVsAvg = avgHp > 0 ? ((carHp - avgHp) / avgHp) * 100 : 0;
  const mpgVsAvg = avgMpg > 0 ? ((carMpg - avgMpg) / avgMpg) * 100 : 0;

  // Overall rating based on value percentile
  let overallRating: 'excellent' | 'good' | 'average' | 'below-average' = 'average';
  if (valuePercentile >= 75) overallRating = 'excellent';
  else if (valuePercentile >= 60) overallRating = 'good';
  else if (valuePercentile < 40) overallRating = 'below-average';

  return {
    pricePercentile,
    hpPercentile,
    mpgPercentile,
    valuePercentile,
    priceVsAvg,
    hpVsAvg,
    mpgVsAvg,
    overallRating,
  };
}

// Determine deal rating
export type DealRating = 'great-deal' | 'good-deal' | 'fair' | 'overpriced';

export function getDealRating(car: CarSpecs, segment: CarSpecs[]): DealRating {
  if (segment.length < 5) return 'fair';

  const metrics = calculateDerivedMetrics(car);
  const segmentValueScores = segment.map(c => calculateDerivedMetrics(c).valueScore);
  const avgValue = mean(segmentValueScores);

  const percentDiff = avgValue > 0 ? ((metrics.valueScore - avgValue) / avgValue) * 100 : 0;

  if (percentDiff > 25) return 'great-deal';
  if (percentDiff > 10) return 'good-deal';
  if (percentDiff < -15) return 'overpriced';
  return 'fair';
}

export function getDealRatingColor(rating: DealRating): string {
  switch (rating) {
    case 'great-deal':
      return '#10b981'; // green
    case 'good-deal':
      return '#3b82f6'; // blue
    case 'fair':
      return '#6b7280'; // gray
    case 'overpriced':
      return '#ef4444'; // red
  }
}

export function getDealRatingLabel(rating: DealRating): string {
  switch (rating) {
    case 'great-deal':
      return '🔥 GREAT DEAL';
    case 'good-deal':
      return '✓ GOOD DEAL';
    case 'fair':
      return 'FAIR PRICE';
    case 'overpriced':
      return '⚠️ OVERPRICED';
  }
}

// Get segment (similar cars for comparison)
export function getSegment(car: CarSpecs, allCars: CarSpecs[]): CarSpecs[] {
  return allCars.filter(c => {
    // Same body style
    const sameBodyStyle = c.bodyStyle === car.bodyStyle;

    // Within 3 years
    const yearDiff = Math.abs(c.year - car.year);
    const similarYear = yearDiff <= 3;

    // Similar price range (within 30%)
    const carPrice = car.price?.msrp || 0;
    const cPrice = c.price?.msrp || 0;
    const priceDiff = carPrice > 0 ? Math.abs(cPrice - carPrice) / carPrice : 0;
    const similarPrice = priceDiff <= 0.3;

    return sameBodyStyle && similarYear && similarPrice && c.id !== car.id;
  });
}

// Utility functions
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculatePercentile(value: number, dataset: number[]): number {
  if (dataset.length === 0) return 50;

  const sorted = [...dataset].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);

  if (index === -1) return 100;
  if (index === 0) return 0;

  return (index / sorted.length) * 100;
}

// Format percentage with sign and color
export function formatPercentage(value: number, higherIsBetter: boolean = true): {
  text: string;
  color: string;
  icon: string;
} {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  const text = `${sign}${abs.toFixed(1)}%`;

  const isGood = higherIsBetter ? value > 0 : value < 0;
  const isBad = higherIsBetter ? value < 0 : value > 0;

  let color = '#6b7280'; // gray (neutral)
  let icon = '•';

  if (isGood && abs > 10) {
    color = '#10b981'; // green
    icon = '✓';
  } else if (isBad && abs > 10) {
    color = '#ef4444'; // red
    icon = '⚠';
  }

  return { text, color, icon };
}

// Calculate weight class
export function getWeightClass(weight: number): string {
  if (weight < 2500) return 'Ultra-Light';
  if (weight < 3000) return 'Lightweight';
  if (weight < 3500) return 'Mid-Weight';
  if (weight < 4000) return 'Heavy';
  return 'Super-Heavy';
}

// Calculate power class
export function getPowerClass(hp: number): string {
  if (hp < 150) return 'Economy';
  if (hp < 250) return 'Moderate';
  if (hp < 350) return 'High';
  if (hp < 500) return 'Very High';
  return 'Extreme';
}

// Aggregate statistics for a set of cars
export interface AggregateStats {
  count: number;
  avgPrice: number;
  avgHorsepower: number;
  avgMpg: number;
  avgTorque: number;
  bestValue: CarSpecs | null;
  highestPower: CarSpecs | null;
  bestEconomy: CarSpecs | null;
  bodyStyleBreakdown: Record<string, number>;
}

export function calculateAggregateStats(cars: CarSpecs[]): AggregateStats {
  if (cars.length === 0) {
    return {
      count: 0,
      avgPrice: 0,
      avgHorsepower: 0,
      avgMpg: 0,
      avgTorque: 0,
      bestValue: null,
      highestPower: null,
      bestEconomy: null,
      bodyStyleBreakdown: {},
    };
  }

  const prices = cars.map(c => c.price?.msrp || 0).filter(p => p > 0);
  const avgPrice = mean(prices);
  const avgHorsepower = mean(cars.map(c => c.engine.horsepower));
  const avgMpg = mean(cars.map(c => c.fuelEconomy.combined || 0).filter(m => m > 0));
  const avgTorque = mean(cars.map(c => c.engine.torque));

  // Best value: highest value score
  const bestValue = cars.reduce((best, car) => {
    const currentScore = calculateDerivedMetrics(car).valueScore;
    const bestScore = best ? calculateDerivedMetrics(best).valueScore : 0;
    return currentScore > bestScore ? car : best;
  }, cars[0]);

  // Highest power
  const highestPower = cars.reduce((max, car) =>
    car.engine.horsepower > max.engine.horsepower ? car : max
  , cars[0]);

  // Best economy
  const bestEconomy = cars.reduce((max, car) => {
    const currentMpg = car.fuelEconomy.combined || 0;
    const maxMpg = max.fuelEconomy.combined || 0;
    return currentMpg > maxMpg ? car : max;
  }, cars[0]);

  // Body style breakdown
  const bodyStyleBreakdown: Record<string, number> = {};
  cars.forEach(car => {
    bodyStyleBreakdown[car.bodyStyle] = (bodyStyleBreakdown[car.bodyStyle] || 0) + 1;
  });

  return {
    count: cars.length,
    avgPrice,
    avgHorsepower: Math.round(avgHorsepower),
    avgMpg: Math.round(avgMpg),
    avgTorque: Math.round(avgTorque),
    bestValue,
    highestPower,
    bestEconomy,
    bodyStyleBreakdown,
  };
}
