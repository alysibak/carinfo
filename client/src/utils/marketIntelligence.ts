import type { CarSpecs } from '../types/car.types';

// Energy pricing (default US averages, can be customized)
export interface EnergyPrices {
  gasPrice: number; // $/gallon
  electricityPrice: number; // $/kWh
}

const DEFAULT_ENERGY_PRICES: EnergyPrices = {
  gasPrice: 3.5,
  electricityPrice: 0.14,
};

// Calculate cost per mile for any vehicle type
export interface CostPerMile {
  costPerMile: number; // Dollars per mile
  annualCost: number; // Cost for 15,000 miles/year
  fuelType: string;
  efficiencyMetric: string; // "MPG" or "MPGe" or "Blend"
}

export function calculateCostPerMile(car: CarSpecs, customPrices?: EnergyPrices): CostPerMile {
  const prices = customPrices || DEFAULT_ENERGY_PRICES;
  const mpg = car.fuelEconomy.combined || 0;
  const fuelType = car.engine.fuelType;

  if (fuelType === 'electric') {
    // Electric: kWh/100mi varies, but typical EV: 120 MPGe ≈ 28 kWh/100mi
    // Formula: 33.7 kWh = 1 gallon gasoline equivalent
    // So: kWhPer100Mi = 33.7 * 100 / MPGe
    const mpge = mpg || 100; // If no data, assume 100 MPGe
    const kWhPer100Mi = (33.7 * 100) / mpge;
    const kWhPerMile = kWhPer100Mi / 100;
    const costPerMile = kWhPerMile * prices.electricityPrice;

    return {
      costPerMile: Math.round(costPerMile * 1000) / 1000, // Round to 3 decimals
      annualCost: Math.round(costPerMile * 15000),
      fuelType: 'Electric',
      efficiencyMetric: `${mpge} MPGe`,
    };
  } else if (fuelType === 'hybrid' || fuelType === 'plug-in hybrid') {
    // Hybrid: Use MPG directly but assume 70% gas, 30% electric for plug-in
    const gasFraction = fuelType === 'plug-in hybrid' ? 0.7 : 1.0;
    const electricFraction = fuelType === 'plug-in hybrid' ? 0.3 : 0.0;

    const gasCostPerMile = mpg > 0 ? (prices.gasPrice / mpg) : 0.15;

    // Estimate electric portion (plug-in hybrids typically get ~25 miles electric)
    const kWhPerMile = 0.3; // Typical plug-in hybrid electric efficiency
    const electricCostPerMile = fuelType === 'plug-in hybrid' ? (kWhPerMile * prices.electricityPrice) : 0;

    const costPerMile = (gasFraction * gasCostPerMile) + (electricFraction * electricCostPerMile);

    return {
      costPerMile: Math.round(costPerMile * 1000) / 1000,
      annualCost: Math.round(costPerMile * 15000),
      fuelType: fuelType === 'plug-in hybrid' ? 'Plug-in Hybrid' : 'Hybrid',
      efficiencyMetric: `${mpg} MPG`,
    };
  } else {
    // Gasoline or Diesel
    const costPerMile = mpg > 0 ? (prices.gasPrice / mpg) : 0.15;

    return {
      costPerMile: Math.round(costPerMile * 1000) / 1000,
      annualCost: Math.round(costPerMile * 15000),
      fuelType: fuelType === 'diesel' ? 'Diesel' : 'Gasoline',
      efficiencyMetric: `${mpg} MPG`,
    };
  }
}

// NEW: Efficiency score normalized across all fuel types
export function calculateEfficiencyScore(car: CarSpecs): number {
  const costPerMile = calculateCostPerMile(car).costPerMile;

  // Lower cost per mile = higher score
  // Typical range: $0.03 (Tesla) to $0.20 (truck)
  // Scale to 0-100
  const maxCost = 0.20;
  const minCost = 0.03;

  const normalizedScore = 100 * (1 - (Math.min(costPerMile, maxCost) - minCost) / (maxCost - minCost));

  return Math.max(0, Math.min(100, normalizedScore));
}

// Reliability scoring based on brand reputation and vehicle characteristics
export function calculateReliabilityScore(car: CarSpecs): number {
  const make = car.make.toLowerCase();

  // Brand reliability scores (0-100) based on industry data
  const brandScores: Record<string, number> = {
    // Top Tier (85-95)
    'toyota': 92, 'lexus': 95, 'mazda': 88, 'honda': 90, 'acura': 88, 'subaru': 87, 'porsche': 85,
    // High Tier (75-84)
    'hyundai': 82, 'kia': 80, 'genesis': 78, 'buick': 81, 'mini': 76, 'nissan': 78, 'infiniti': 76,
    // Mid Tier (65-74)
    'chevrolet': 72, 'ford': 70, 'volkswagen': 68, 'audi': 70, 'bmw': 68, 'mercedes-benz': 67,
    'volvo': 73, 'cadillac': 69,
    // Lower Tier (55-64)
    'chrysler': 62, 'dodge': 60, 'jeep': 58, 'ram': 61, 'gmc': 65, 'lincoln': 64, 'alfa romeo': 56,
    'jaguar': 55, 'land rover': 52, 'tesla': 65,
    // Economy (70-80)
    'mitsubishi': 75, 'suzuki': 78,
  };

  let score = brandScores[make] || 70;

  // Age penalty
  const age = 2025 - car.year;
  if (age > 10) score -= (age - 10) * 2;
  else if (age > 5) score -= (age - 5) * 1;
  else if (age <= 2) score += 3;

  // Drivetrain complexity
  if (car.driveType === 'AWD' || car.driveType === '4WD') score -= 3;

  // Fuel type adjustments
  if (car.engine.fuelType === 'electric') score += 8; // Fewer moving parts
  else if (car.engine.fuelType === 'hybrid' || car.engine.fuelType === 'plug-in hybrid') score -= 5;

  // Engine stress
  if (car.engine.displacement > 5.0) score -= 4;
  else if (car.engine.displacement < 2.0 && car.engine.horsepower > 200) score -= 6; // Turbo stress

  return Math.max(40, Math.min(100, score));
}

// Calculate derived performance metrics
export interface DerivedMetrics {
  powerDensity: number; // HP per liter
  powerToWeight: number; // HP per pound
  torqueDensity: number; // lb-ft per liter
  hpPerDollar: number; // HP per $1000
  mpgPerDollar: number; // MPG per $1000
  valueScore: number; // Composite score
  costPerMile: number; // Cost per mile (normalized across fuel types)
  efficiencyScore: number; // 0-100 normalized efficiency
  reliabilityScore: number; // 0-100 brand-based reliability
}

export function calculateDerivedMetrics(car: CarSpecs): DerivedMetrics {
  const hp = car.engine.horsepower;
  const torque = car.engine.torque;
  const displacement = car.engine.displacement;
  const weight = car.dimensions.curbWeight;
  const price = car.price?.msrp || 0;
  const mpg = car.fuelEconomy.combined || 0;

  // For EVs (displacement = 0), displacement-based metrics are N/A
  const isEV = car.engine.fuelType === 'electric' || displacement === 0;
  const powerDensity = !isEV && displacement > 0 ? hp / displacement : NaN;
  const powerToWeight = weight > 0 ? hp / weight : 0;
  const torqueDensity = !isEV && displacement > 0 ? torque / displacement : NaN;
  const hpPerDollar = price > 0 ? (hp / price) * 1000 : 0;
  const mpgPerDollar = price > 0 ? (mpg / price) * 1000 : 0;

  // NEW: Calculate normalized efficiency and cost per mile
  const costPerMileData = calculateCostPerMile(car);
  const efficiencyScore = calculateEfficiencyScore(car);

  // NEW: Updated value score formula
  // Performance score (0-100): Based on power-to-weight
  const performanceScore = Math.min(100, powerToWeight * 500); // 0.2 HP/lb = 100

  // Reliability score (brand + age + characteristics)
  const reliabilityScore = calculateReliabilityScore(car);

  // NEW VALUE FORMULA: (Performance × Efficiency × Reliability) / Price
  // Higher score = better value
  const valueScore = price > 0
    ? (performanceScore * efficiencyScore * reliabilityScore) / (price / 100)
    : 0;

  return {
    powerDensity,
    powerToWeight,
    torqueDensity,
    hpPerDollar,
    mpgPerDollar,
    valueScore,
    costPerMile: costPerMileData.costPerMile,
    efficiencyScore,
    reliabilityScore,
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

  // Value percentile: Use NEW value formula (Performance × Efficiency × Reliability) / Price
  const valueScores = segment.map(c => calculateDerivedMetrics(c).valueScore);
  const carValueScore = calculateDerivedMetrics(car).valueScore;
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

// Predict 0-60 time for vehicles with missing data
export interface ZeroToSixtyPrediction {
  predicted: number;
  confidence: 'high' | 'medium' | 'low';
  method: 'actual' | 'predicted';
}

export function predictZeroToSixty(car: CarSpecs): ZeroToSixtyPrediction {
  // If actual value exists, return it
  if (car.performance.zeroToSixty && car.performance.zeroToSixty > 0) {
    return {
      predicted: car.performance.zeroToSixty,
      confidence: 'high',
      method: 'actual',
    };
  }

  // Calculate power-to-weight ratio (HP per 1000 lbs)
  const hp = car.engine.horsepower;
  const weight = car.dimensions.curbWeight;
  const powerToWeight = (hp / weight) * 1000;

  // Drivetrain factor (AWD launches faster, FWD slower)
  let drivetrainFactor = 1.0;
  if (car.driveType === 'AWD' || car.driveType === '4WD') {
    drivetrainFactor = 0.92; // 8% faster
  } else if (car.driveType === 'FWD') {
    drivetrainFactor = 1.08; // 8% slower
  }

  // Transmission factor
  let transmissionFactor = 1.0;
  if (car.transmission.type === 'dual-clutch') {
    transmissionFactor = 0.95; // 5% faster
  } else if (car.transmission.type === 'cvt') {
    transmissionFactor = 1.05; // 5% slower
  }

  // Electric vehicles are much faster
  let electricBonus = 1.0;
  if (car.engine.fuelType === 'electric') {
    electricBonus = 0.7; // 30% faster
  }

  // Base formula: 0-60 time is inversely proportional to power-to-weight
  // Formula derived from real-world data:
  // - High-performance cars: ~200 HP/ton = ~3.5s 0-60
  // - Average cars: ~100 HP/ton = ~7s 0-60
  // - Economy cars: ~60 HP/ton = ~10s 0-60

  // Base time calculation
  const baseTime = 700 / powerToWeight; // Empirical constant

  // Apply all factors
  const predicted = baseTime * drivetrainFactor * transmissionFactor * electricBonus;

  // Clamp to reasonable range (2-15 seconds)
  const clampedTime = Math.max(2.0, Math.min(15.0, predicted));

  // Determine confidence based on typical patterns
  let confidence: 'high' | 'medium' | 'low' = 'medium';

  if (car.engine.fuelType === 'electric') {
    // Electric predictions are more reliable due to consistent torque delivery
    confidence = 'high';
  } else if (powerToWeight > 150) {
    // High-performance cars (>150 HP/ton) are very predictable
    confidence = 'high';
  } else if (powerToWeight < 70) {
    // Very low power cars have more variability
    confidence = 'low';
  }

  return {
    predicted: Math.round(clampedTime * 10) / 10, // Round to 1 decimal
    confidence,
    method: 'predicted',
  };
}

// Fuel-type-aware filtering helpers
export type FuelTypeFilter = 'all' | 'gasoline' | 'hybrid' | 'electric' | 'gasoline-only';

export function shouldIncludeInFuelEconomySearch(car: CarSpecs, fuelTypeFilter: FuelTypeFilter): boolean {
  const fuelType = car.engine.fuelType;

  // If searching for fuel economy (MPG), exclude EVs by default unless explicitly requested
  if (fuelTypeFilter === 'gasoline-only') {
    return fuelType === 'gasoline' || fuelType === 'diesel';
  }

  if (fuelTypeFilter === 'gasoline') {
    return fuelType === 'gasoline' || fuelType === 'diesel' || fuelType === 'hybrid';
  }

  if (fuelTypeFilter === 'hybrid') {
    return fuelType === 'hybrid' || fuelType === 'plug-in hybrid';
  }

  if (fuelTypeFilter === 'electric') {
    return fuelType === 'electric';
  }

  // 'all' includes everything
  return true;
}

export function getDefaultFuelTypeForPersona(persona: string | null): FuelTypeFilter {
  // Personas focused on fuel economy should default to gasoline-only (excludes EVs)
  if (persona === 'commuter') {
    return 'gasoline'; // Include hybrids but EVs must be explicitly selected
  }

  // Other personas can include all
  return 'all';
}

export function filterCarsByFuelType(cars: CarSpecs[], fuelTypeFilter: FuelTypeFilter): CarSpecs[] {
  if (fuelTypeFilter === 'all') {
    return cars;
  }

  return cars.filter(car => shouldIncludeInFuelEconomySearch(car, fuelTypeFilter));
}

// Price Reality Mode: Estimate market value based on depreciation
export type PriceMode = 'msrp' | 'market' | 'used';

export interface PriceEstimate {
  price: number;
  mode: PriceMode;
  label: string;
  confidence: 'high' | 'medium' | 'low';
}

export function estimatePrice(car: CarSpecs, mode: PriceMode): PriceEstimate {
  const msrp = car.price?.msrp || 0;
  const age = 2025 - car.year;

  if (mode === 'msrp') {
    return {
      price: msrp,
      mode: 'msrp',
      label: 'MSRP',
      confidence: 'high',
    };
  }

  // Depreciation curve (varies by segment)
  const isLuxury = ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Jaguar', 'Land Rover', 'Cadillac'].includes(car.make);
  const isEV = car.engine.fuelType === 'electric';
  const isReliable = ['Toyota', 'Honda', 'Lexus', 'Mazda', 'Subaru'].includes(car.make);

  // Depreciation rates per year (first 5 years, then slower)
  let depreciationRate: number;
  if (isLuxury && !isEV) {
    depreciationRate = age <= 5 ? 0.15 : 0.08; // Luxury depreciates fast
  } else if (isEV) {
    depreciationRate = age <= 3 ? 0.12 : 0.10; // EVs moderate depreciation
  } else if (isReliable) {
    depreciationRate = age <= 5 ? 0.10 : 0.06; // Reliable holds value
  } else {
    depreciationRate = age <= 5 ? 0.12 : 0.07; // Average
  }

  // Calculate depreciated value
  const yearsToApply = age <= 5 ? age : 5 + (age - 5) * 0.6;
  const depreciationFactor = Math.pow(1 - depreciationRate, yearsToApply);
  let estimatedPrice = msrp * depreciationFactor;

  // Market adjustment (current year cars may sell above MSRP)
  if (mode === 'market') {
    if (age === 0) {
      estimatedPrice = msrp * 1.05; // New cars 5% markup
    } else if (age === 1) {
      estimatedPrice = msrp * 0.88; // 1 year old
    }

    return {
      price: Math.round(estimatedPrice),
      mode: 'market',
      label: 'Est. Market',
      confidence: age <= 3 ? 'medium' : 'low',
    };
  }

  // Used market (assume 15k miles/year average wear)
  if (mode === 'used') {
    const mileagePenalty = age * 0.02; // -2% per year for mileage
    estimatedPrice *= (1 - mileagePenalty);

    // Floor price (cars don't depreciate to zero)
    const floorPrice = msrp * 0.15; // Minimum 15% of MSRP
    estimatedPrice = Math.max(estimatedPrice, floorPrice);

    return {
      price: Math.round(estimatedPrice),
      mode: 'used',
      label: 'Est. Used',
      confidence: age <= 5 ? 'medium' : 'low',
    };
  }

  return {
    price: msrp,
    mode: 'msrp',
    label: 'MSRP',
    confidence: 'high',
  };
}

// Generate "Why This Car?" explanations for search results
export interface MatchReason {
  icon: string;
  text: string;
  type: 'positive' | 'neutral' | 'highlight';
}

export function generateMatchReasons(car: CarSpecs, filters?: {
  maxPrice?: number;
  minMpg?: number;
  minHp?: number;
  bodyStyle?: string[];
}): MatchReason[] {
  const reasons: MatchReason[] = [];
  const derivedMetrics = calculateDerivedMetrics(car);
  const mpg = car.fuelEconomy.combined || 0;

  // Check price
  if (filters?.maxPrice && car.price?.msrp && car.price.msrp < filters.maxPrice) {
    reasons.push({
      icon: '💰',
      text: `Under $${(filters.maxPrice / 1000).toFixed(0)}K`,
      type: 'positive',
    });
  }

  // Check MPG
  if (mpg > 35) {
    reasons.push({
      icon: '⛽',
      text: `${mpg} MPG (Excellent)`,
      type: 'highlight',
    });
  } else if (filters?.minMpg && mpg >= filters.minMpg) {
    reasons.push({
      icon: '⛽',
      text: `${mpg} MPG`,
      type: 'positive',
    });
  }

  // Check power
  if (car.engine.horsepower > 300) {
    reasons.push({
      icon: '⚡',
      text: `${car.engine.horsepower} HP`,
      type: 'highlight',
    });
  }

  // Check value score
  if (derivedMetrics.valueScore > 1000) {
    reasons.push({
      icon: '🏆',
      text: 'Top Value Score',
      type: 'highlight',
    });
  }

  // Check reliability
  if (derivedMetrics.reliabilityScore >= 85) {
    reasons.push({
      icon: '✓',
      text: `${derivedMetrics.reliabilityScore}/100 Reliability`,
      type: 'positive',
    });
  }

  // Check efficiency
  if (derivedMetrics.efficiencyScore >= 85) {
    reasons.push({
      icon: '🌱',
      text: 'Low Cost Per Mile',
      type: 'positive',
    });
  }

  // Check age
  const age = 2025 - car.year;
  if (age <= 2) {
    reasons.push({
      icon: '🆕',
      text: 'Nearly New',
      type: 'neutral',
    });
  }

  return reasons.slice(0, 3); // Limit to 3 reasons
}
