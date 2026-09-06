import type { CarSpecs } from '../types/car.types.js';
import {
  annualKmToMiles,
  EPA_ANNUAL_MILES,
  formatOntarioEnergyAssumptionNote,
  formatOntarioRegionNote,
  getRegionalAssumptions,
  mpgToLPer100Km,
  mpgeToKwhPer100Km,
  type RegionalAssumptions,
} from '../config/regional-assumptions.js';
import {
  applyValuationReliabilityGuard,
  classifyMarketSegment,
  estimateDepreciation5Year,
  estimateMarketValue,
  estimateNewVehicleMsrp,
  effectiveFuelType,
  type MarketValueEstimate,
} from './vehicle-valuation.js';

const REGION = getRegionalAssumptions();
const ANNUAL_KM = REGION.annualKm;
const ANNUAL_MILES = annualKmToMiles(ANNUAL_KM);
const REFERENCE_YEAR = new Date().getFullYear();

export { estimateMarketValue, estimateNewVehicleMsrp } from './vehicle-valuation.js';

export function roundEfficiency(n: number | undefined): number | undefined {
  if (n == null || !Number.isFinite(n)) return undefined;
  return Math.round(n);
}

export function kWhPer100MiFromMpge(mpge: number): number {
  if (mpge <= 0) return 0;
  return Math.round((3370 / mpge) * 10) / 10;
}

export function correctedKWhPer100Mi(car: CarSpecs): number | undefined {
  if (effectiveFuelType(car) !== 'electric') return car.epa?.kWhPer100Mi;
  const mpge = car.fuelEconomy.combined;
  if (!mpge || mpge <= 0) return car.epa?.kWhPer100Mi;
  const fromMpge = kWhPer100MiFromMpge(mpge);
  const stored = car.epa?.kWhPer100Mi;
  if (stored == null || stored < 15) return fromMpge;
  return stored;
}

/** Layer 1 — time-based annual running costs (primary truth). */
export interface AnnualCostBreakdown {
  energy: number | null;
  insurance: number;
  maintenance: number;
  tires: number;
  registration: number;
  total: number | null;
  totalLow: number | null;
  totalHigh: number | null;
}

/** Layer 2 — resale / depreciation as a lifecycle event, not per-mile. */
export interface ResaleImpact {
  currentValue: { low: number; high: number; mid: number };
  projectedResale5Year: { low: number; high: number; mid: number };
  estimatedLoss5Year: { low: number; high: number; mid: number };
  note: string;
}

/** Layer 3 — optional derived $/mi for comparison only. */
export interface DerivedComparisonMetric {
  fuelCostPerMile: number | null;
  effectiveCostPerMile: number | null;
  disclaimer: string;
}

export interface TcoEstimate {
  low: number;
  high: number;
  depreciation: number;
  energy: number;
  insurance: number;
  maintenance: number;
  tires: number;
  registration: number;
  mode: 'full' | 'operating';
  disclaimer?: string;
}

export interface OwnershipAssumptions {
  annualKm: string;
  annualMiles: number;
  energyPriceNote: string;
  insuranceTier: string;
  depreciationNote: string;
  regionNote: string;
}

export interface OwnershipEconomics {
  marketValue: MarketValueEstimate;
  annualCost: AnnualCostBreakdown;
  resaleImpact: ResaleImpact;
  derivedComparison: DerivedComparisonMetric | null;
  tco5Year: TcoEstimate | null;
  assumptions: OwnershipAssumptions;
  warnings: string[];
  practicalityNote: string;
}

const LUXURY_MAKES = new Set([
  'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Lexus', 'Jaguar', 'Land Rover',
  'Infiniti', 'Acura', 'Cadillac', 'Lincoln', 'Genesis', 'Maserati', 'Ferrari',
  'Lamborghini', 'Bentley', 'Rolls-Royce', 'Alfa Romeo', 'GMC',
]);

function isHeavyEvTruck(car: CarSpecs): boolean {
  return (
    car.bodyStyle === 'truck' &&
    effectiveFuelType(car) === 'electric' &&
    (car.model.toLowerCase().includes('hummer') || car.model.toLowerCase().includes('rivian'))
  );
}

function isLuxuryPerformance(car: CarSpecs): boolean {
  const m = car.model.toLowerCase();
  return (car.bodyStyle === 'coupe' && LUXURY_MAKES.has(car.make)) || m.includes('lc ') || m.startsWith('lc');
}

function vehicleAge(car: CarSpecs): number {
  return Math.max(0, REFERENCE_YEAR - car.year);
}

function isBeaterTier(car: CarSpecs, marketMid: number): boolean {
  return vehicleAge(car) >= 20 || marketMid < REGION.beaterValueThresholdCad;
}

function insuranceAnnual(car: CarSpecs, marketMid: number, ins = REGION.insurance): number {
  let base = ins.sedan;
  if (car.bodyStyle === 'suv') base = ins.suv;
  if (car.bodyStyle === 'truck') base = ins.truck;
  if (car.bodyStyle === 'coupe') base = ins.coupe;
  if (LUXURY_MAKES.has(car.make)) base *= ins.luxuryMultiplier;
  if (isHeavyEvTruck(car)) base = ins.heavyEvTruck;
  if (isLuxuryPerformance(car)) base = ins.luxuryPerformance;
  if (marketMid > ins.highValueThresholdCad) base *= ins.highValueMultiplier;

  const age = vehicleAge(car);
  if (age >= 25) base *= 0.5;
  else if (age >= 20) base *= 0.62;
  else if (age >= 15) base *= 0.72;
  else if (age > 10) base *= 0.88;

  if (marketMid < ins.lowValueThresholdCad / 2) base = Math.min(base, ins.beaterMaxCad);
  else if (marketMid < ins.lowValueThresholdCad) base = Math.min(base, ins.lowValueMaxCad);

  return Math.round(base);
}

function maintenanceAnnual(car: CarSpecs, marketMid: number, maint = REGION.maintenance): number {
  const age = vehicleAge(car);
  let base = maint.base;
  if (isHeavyEvTruck(car)) base = maint.heavyEvTruck;
  else if (isLuxuryPerformance(car)) base = maint.luxuryPerformance;
  else if (LUXURY_MAKES.has(car.make)) base = maint.luxury;
  else if (car.engine.fuelType === 'electric') base = maint.electric;
  else if (car.engine.fuelType === 'hydrogen') base = maint.hydrogen;
  else if (car.engine.fuelType === 'hybrid' || car.engine.fuelType === 'plug-in hybrid') base = maint.hybrid;

  if (age > 8 && car.engine.fuelType !== 'electric') {
    base += Math.min(age - 8, maint.ageIncrementCapYears) * maint.ageIncrementPerYear;
  }

  if (isBeaterTier(car, marketMid)) {
    base = Math.min(base, Math.max(450, Math.round(marketMid * 0.12)));
  }

  return Math.round(base);
}

function tiresAnnual(car: CarSpecs, tires = REGION.tires): number {
  if (isHeavyEvTruck(car)) return tires.heavyEvTruck;
  if (car.bodyStyle === 'truck') return tires.truck;
  if (isLuxuryPerformance(car)) return tires.luxuryPerformance;
  if (car.bodyStyle === 'suv') return tires.suv;
  if (car.engine.fuelType === 'electric') return tires.electric;
  return tires.default;
}

function gasolineAnnualCostCad(mpg: number, region: RegionalAssumptions = REGION): number {
  const litresPer100Km = mpgToLPer100Km(mpg);
  return Math.round((region.annualKm / 100) * litresPer100Km * region.gasPriceCadPerL);
}

function electricAnnualCostCad(mpge: number, region: RegionalAssumptions = REGION): number {
  const kwhPer100Km = mpgeToKwhPer100Km(mpge);
  return Math.round((region.annualKm / 100) * kwhPer100Km * region.electricityRateCadPerKwh);
}

function energyAnnualCost(car: CarSpecs, region: RegionalAssumptions = REGION): number | null {
  const mpg = roundEfficiency(car.fuelEconomy.combined) ?? 0;
  const ft = effectiveFuelType(car);
  const annualKm = region.annualKm;

  if (ft === 'hydrogen') {
    const epaAnnualUsd = car.epa?.annualFuelCost;
    if (epaAnnualUsd != null && epaAnnualUsd > 0) {
      const epaCad = epaAnnualUsd * region.cadUsdExchangeRate;
      return Math.round(epaCad * (annualKm / (EPA_ANNUAL_MILES * 1.609344)));
    }
    return null;
  }

  if (ft === 'electric' && mpg > 0) {
    return electricAnnualCostCad(mpg, region);
  }

  if (ft === 'plug-in hybrid' && mpg > 0) {
    const gasMpg = car.epa?.phev?.gasMpg ?? mpg;
    const electricMpge = car.epa?.phev?.electricMpge ?? mpg;
    const gas = gasolineAnnualCostCad(gasMpg, region) * region.phev.gasMileFraction;
    const electric = electricAnnualCostCad(electricMpge, region) * region.phev.electricMileFraction;
    return Math.round(gas + electric);
  }

  if (mpg > 0) {
    return gasolineAnnualCostCad(mpg, region);
  }

  const epaAnnualUsd = car.epa?.annualFuelCost;
  if (epaAnnualUsd != null && epaAnnualUsd > 0) {
    const epaCad = epaAnnualUsd * region.cadUsdExchangeRate;
    return Math.round(epaCad * (annualKm / (EPA_ANNUAL_MILES * 1.609344)));
  }

  return null;
}

/** Usage-based fuel/energy $/mi — the only directly mileage-linked cost. */
export function fuelCostPerMile(car: CarSpecs): number | null {
  const annual = energyAnnualCost(car);
  if (annual == null) return null;
  return Math.round((annual / ANNUAL_MILES) * 100) / 100;
}

export function calculateAnnualCosts(
  car: CarSpecs,
  market: MarketValueEstimate,
  region: RegionalAssumptions = REGION,
): AnnualCostBreakdown {
  const energy = energyAnnualCost(car, region);
  const insurance = insuranceAnnual(car, market.mid, region.insurance);
  const maintenance = maintenanceAnnual(car, market.mid, region.maintenance);
  const tires = tiresAnnual(car, region.tires);
  const registration = region.registrationCadPerYear;

  if (energy == null && car.engine.fuelType === 'hydrogen') {
    const partial = insurance + maintenance + tires + registration;
    return {
      energy: null,
      insurance,
      maintenance,
      tires,
      registration,
      total: partial,
      totalLow: Math.round(partial * 0.9),
      totalHigh: Math.round(partial * 1.12),
    };
  }

  const total = (energy ?? 0) + insurance + maintenance + tires + registration;
  return {
    energy,
    insurance,
    maintenance,
    tires,
    registration,
    total,
    totalLow: Math.round(total * 0.9),
    totalHigh: Math.round(total * 1.12),
  };
}

export function calculateResaleImpact(car: CarSpecs, market: MarketValueEstimate): ResaleImpact {
  const dep = estimateDepreciation5Year(car, market);
  const projectedMid = Math.max(0, market.mid - dep.mid);
  const age = Math.max(0, new Date().getFullYear() - car.year);
  const ft = effectiveFuelType(car);
  const spread = ft === 'hydrogen' || classifyMarketSegment(car) === 'exotic' ? 0.2 : age > 12 ? 0.18 : 0.14;

  let low = Math.round(projectedMid * (1 - spread));
  let high = Math.round(projectedMid * (1 + spread));

  // Avoid zero-width ranges when values are small — keep a minimum spread for honesty.
  if (projectedMid > 0 && high - low < Math.max(400, projectedMid * 0.14)) {
    const halfSpread = Math.max(400, Math.round(projectedMid * 0.15));
    low = Math.max(0, projectedMid - halfSpread);
    high = projectedMid + halfSpread;
  }

  return {
    currentValue: { low: market.low, high: market.high, mid: market.mid },
    projectedResale5Year: {
      low,
      high,
      mid: projectedMid,
    },
    estimatedLoss5Year: dep,
    note: 'Depreciation is realized when you sell, not a per-mile driving expense. Projected resale assumes typical condition.',
  };
}

function buildDerivedComparison(
  annual: AnnualCostBreakdown,
  dep5Mid: number,
  car: CarSpecs,
): DerivedComparisonMetric | null {
  if (annual.total == null && car.engine.fuelType === 'hydrogen') return null;

  const fuelCpm = fuelCostPerMile(car);
  const annualAllIn = (annual.total ?? 0) + dep5Mid / 5;
  const effectiveCpm = Math.round((annualAllIn / ANNUAL_MILES) * 100) / 100;

  return {
    fuelCostPerMile: fuelCpm,
    effectiveCostPerMile: effectiveCpm,
    disclaimer:
      'Derived comparison metric only. Fuel/energy is usage-based; insurance, maintenance, and depreciation are annual lifecycle costs divided by mileage for ranking, not how you pay for them.',
  };
}

export function estimateTco5Year(car: CarSpecs, market: MarketValueEstimate, annual: AnnualCostBreakdown): TcoEstimate | null {
  if (annual.total == null && car.engine.fuelType === 'hydrogen') return null;

  const dep = estimateDepreciation5Year(car, market);
  const operating5 = (annual.total ?? 0) * 5;
  const beater = isBeaterTier(car, market.mid);

  if (beater) {
    return {
      low: annual.totalLow ?? annual.total ?? 0,
      high: annual.totalHigh ?? annual.total ?? 0,
      depreciation: dep.mid,
      energy: annual.energy ?? 0,
      insurance: annual.insurance,
      maintenance: annual.maintenance,
      tires: annual.tires,
      registration: annual.registration,
      mode: 'operating',
      disclaimer: 'Annual running cost for an aged/low-value vehicle. Repair spikes may exceed this baseline.',
    };
  }

  const mid = dep.mid + operating5;
  return {
    low: Math.round(mid * 0.88),
    high: Math.round(mid * 1.18),
    depreciation: dep.mid,
    energy: (annual.energy ?? 0) * 5,
    insurance: annual.insurance * 5,
    maintenance: annual.maintenance * 5,
    tires: annual.tires * 5,
    registration: annual.registration * 5,
    mode: 'full',
    disclaimer: '5-year lifecycle: annual running costs × 5 plus projected resale value loss.',
  };
}

function practicalityNote(car: CarSpecs, marketMid: number): string {
  if (isBeaterTier(car, marketMid)) {
    return 'Very aged or low-value vehicle. Repair costs can spike unpredictably. Annual baseline understates tail-risk.';
  }
  if (car.engine.fuelType === 'hydrogen') {
    return 'Hydrogen fueling is sparse outside a few regions. High fuel and resale uncertainty for Ontario.';
  }
  if (isHeavyEvTruck(car)) {
    return 'Large EV truck. Plan for home charging, tire wear, and higher insurance.';
  }
  if (effectiveFuelType(car) === 'electric' && (car.epa?.rangeMiles ?? 0) < 120) {
    return 'Short-range EV. Battery health strongly affects usable range and resale.';
  }
  if (effectiveFuelType(car) === 'electric') {
    return 'Battery condition and charging access materially affect real-world ownership cost.';
  }
  return 'Annual costs are time-based estimates. Resale value is separate from day-to-day running costs.';
}

export function computeOwnershipEconomics(
  car: CarSpecs,
  _segment: CarSpecs[],
  regionId?: import('../config/regional-assumptions.js').RegionId,
): OwnershipEconomics {
  const region = getRegionalAssumptions(regionId);
  const annualMiles = annualKmToMiles(region.annualKm);
  let market = estimateMarketValue(car);
  const annualCost = calculateAnnualCosts(car, market, region);
  let resaleImpact = calculateResaleImpact(car, market);
  ({ market, resale: resaleImpact } = applyValuationReliabilityGuard(market, resaleImpact));
  const derivedComparison = buildDerivedComparison(annualCost, resaleImpact.estimatedLoss5Year.mid, car);
  const tco5Year = estimateTco5Year(car, market, annualCost);

  const warnings: string[] = [];
  if (isBeaterTier(car, market.mid)) {
    warnings.push('Beater-tier vehicle: maintenance baseline may not capture sudden repair bills.');
  }
  if (car.engine.fuelType === 'hydrogen') {
    warnings.push('Hydrogen fuel costs and infrastructure vary sharply. Energy costs may be incomplete.');
  }
  if (effectiveFuelType(car) === 'electric' && market.batteryHealth) {
    warnings.push(`Battery health estimate: ${market.batteryHealth.label}. ${market.batteryHealth.chemistryNote}`);
  }
  if (isHeavyEvTruck(car)) {
    warnings.push('Heavy EV trucks carry high insurance, tire, and depreciation costs beyond efficiency alone.');
  }

  const depNote =
    effectiveFuelType(car) === 'electric'
      ? `EV tier ${market.retentionTier ?? 'B'} curve + battery health factor`
      : car.engine.fuelType === 'hydrogen'
        ? 'FCEV curve with infrastructure risk penalty'
        : 'Segment age curve (economy / luxury / utility)';

  return {
    marketValue: market,
    annualCost,
    resaleImpact,
    derivedComparison,
    tco5Year,
    assumptions: {
      annualKm: `~${region.annualKm.toLocaleString()} km / year`,
      annualMiles,
      energyPriceNote: formatOntarioEnergyAssumptionNote(region),
      insuranceTier: isBeaterTier(car, market.mid)
        ? `Aged vehicle / liability-focused ${region.label} estimate`
        : isHeavyEvTruck(car)
          ? `Heavy EV / truck (${region.label} baseline)`
          : isLuxuryPerformance(car)
            ? `Luxury coupe (${region.label} baseline)`
            : `${car.bodyStyle} baseline (${region.label})`,
      depreciationNote: `${depNote}; USD MSRP anchors × ${region.cadUsdExchangeRate} FX × ${region.canadianUsedMarketFactor} Canadian market factor`,
      regionNote: formatOntarioRegionNote(region),
    },
    warnings,
    practicalityNote: practicalityNote(car, market.mid),
  };
}

export function estimatePriceMsrp(car: CarSpecs): number {
  return estimateMarketValue(car).mid;
}

// Legacy compat for market-intelligence energy helpers
export function energyCostPerMile(car: CarSpecs): number | null {
  return fuelCostPerMile(car);
}
