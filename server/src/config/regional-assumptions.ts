/**
 * Regional ownership-cost and value assumptions.
 * Default region: Ontario. Review price/rate constants periodically (last reviewed: 2025-Q2).
 */

export type RegionId = 'ontario' | 'british-columbia';

export interface InsuranceAssumptions {
  sedan: number;
  suv: number;
  truck: number;
  coupe: number;
  luxuryMultiplier: number;
  heavyEvTruck: number;
  luxuryPerformance: number;
  highValueMultiplier: number;
  highValueThresholdCad: number;
  beaterMaxCad: number;
  lowValueMaxCad: number;
  lowValueThresholdCad: number;
}

export interface MaintenanceAssumptions {
  base: number;
  heavyEvTruck: number;
  luxuryPerformance: number;
  luxury: number;
  electric: number;
  hydrogen: number;
  hybrid: number;
  ageIncrementPerYear: number;
  ageIncrementCapYears: number;
}

export interface TireAssumptions {
  default: number;
  heavyEvTruck: number;
  truck: number;
  luxuryPerformance: number;
  suv: number;
  electric: number;
}

export interface PhevAssumptions {
  gasMileFraction: number;
  electricMileFraction: number;
}

export interface RegionalAssumptions {
  id: RegionId;
  label: string;
  displayCurrency: 'CAD';
  /** Approximate CAD per USD — review periodically (mid-2025 planning rate). */
  cadUsdExchangeRate: number;
  /** Canadian used-vehicle values often sit above a straight USD→CAD conversion. */
  canadianUsedMarketFactor: number;
  /** Ontario retail gasoline — multi-month average ~$1.45–1.65/L (review periodically). */
  gasPriceCadPerL: number;
  /** Blended Ontario residential rate for home charging (~TOU mid-tier average). */
  electricityRateCadPerKwh: number;
  annualKm: number;
  registrationCadPerYear: number;
  beaterValueThresholdCad: number;
  insurance: InsuranceAssumptions;
  maintenance: MaintenanceAssumptions;
  tires: TireAssumptions;
  phev: PhevAssumptions;
}

export const REGIONAL_ASSUMPTIONS: Record<RegionId, RegionalAssumptions> = {
  ontario: {
    id: 'ontario',
    label: 'Ontario',
    displayCurrency: 'CAD',
    cadUsdExchangeRate: 1.38,
    canadianUsedMarketFactor: 1.08,
    gasPriceCadPerL: 1.55,
    electricityRateCadPerKwh: 0.155,
    annualKm: 15000,
    registrationCadPerYear: 150,
    beaterValueThresholdCad: 8300,
    insurance: {
      sedan: 2900,
      suv: 3400,
      truck: 3600,
      coupe: 3100,
      luxuryMultiplier: 1.45,
      heavyEvTruck: 5200,
      luxuryPerformance: 4800,
      highValueMultiplier: 1.2,
      highValueThresholdCad: 110000,
      beaterMaxCad: 1500,
      lowValueMaxCad: 2100,
      lowValueThresholdCad: 11000,
    },
    maintenance: {
      base: 1150,
      heavyEvTruck: 1900,
      luxuryPerformance: 2400,
      luxury: 1900,
      electric: 950,
      hydrogen: 1600,
      hybrid: 1050,
      ageIncrementPerYear: 55,
      ageIncrementCapYears: 10,
    },
    tires: {
      default: 650,
      heavyEvTruck: 1900,
      truck: 1200,
      luxuryPerformance: 1500,
      suv: 950,
      electric: 800,
    },
    phev: {
      gasMileFraction: 0.65,
      electricMileFraction: 0.35,
    },
  },
  'british-columbia': {
    id: 'british-columbia',
    label: 'British Columbia',
    displayCurrency: 'CAD',
    cadUsdExchangeRate: 1.38,
    canadianUsedMarketFactor: 1.1,
    gasPriceCadPerL: 1.72,
    electricityRateCadPerKwh: 0.12,
    annualKm: 14000,
    registrationCadPerYear: 180,
    beaterValueThresholdCad: 8500,
    insurance: {
      sedan: 3100,
      suv: 3600,
      truck: 3800,
      coupe: 3300,
      luxuryMultiplier: 1.5,
      heavyEvTruck: 5400,
      luxuryPerformance: 5000,
      highValueMultiplier: 1.22,
      highValueThresholdCad: 110000,
      beaterMaxCad: 1600,
      lowValueMaxCad: 2200,
      lowValueThresholdCad: 11000,
    },
    maintenance: {
      base: 1200,
      heavyEvTruck: 1950,
      luxuryPerformance: 2500,
      luxury: 1950,
      electric: 980,
      hydrogen: 1650,
      hybrid: 1100,
      ageIncrementPerYear: 55,
      ageIncrementCapYears: 10,
    },
    tires: {
      default: 700,
      heavyEvTruck: 1950,
      truck: 1250,
      luxuryPerformance: 1550,
      suv: 1000,
      electric: 850,
    },
    phev: {
      gasMileFraction: 0.6,
      electricMileFraction: 0.4,
    },
  },
};

export const DEFAULT_REGION: RegionId = 'ontario';

export function getRegionalAssumptions(region: RegionId = DEFAULT_REGION): RegionalAssumptions {
  return REGIONAL_ASSUMPTIONS[region];
}

export const KM_PER_MILE = 1.609344;
export const EPA_ANNUAL_MILES = 15000;

export function annualKmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

/** US EPA MPG → L/100 km (same formula used for MPGe equivalent consumption). */
export function mpgToLPer100Km(mpg: number): number {
  if (mpg <= 0) return 0;
  return 235.215 / mpg;
}

/** US EPA MPGe → kWh/100 km. */
export function mpgeToKwhPer100Km(mpge: number): number {
  if (mpge <= 0) return 0;
  return 3370 / (mpge * KM_PER_MILE);
}

export function kwhPer100MiToKwhPer100Km(kwhPer100Mi: number): number {
  return kwhPer100Mi / KM_PER_MILE;
}

/** Convert model MSRP anchors (US-dollar basis) to CAD market-value space. */
export function usdAnchorToCadValue(
  usdAmount: number,
  region: RegionalAssumptions = getRegionalAssumptions(),
): number {
  return usdAmount * region.cadUsdExchangeRate * region.canadianUsedMarketFactor;
}

export function formatOntarioEnergyAssumptionNote(region: RegionalAssumptions = getRegionalAssumptions()): string {
  return `${region.label} ~$${region.gasPriceCadPerL.toFixed(2)}/L gas, ~$${region.electricityRateCadPerKwh.toFixed(3)}/kWh home electricity @ ~${region.annualKm.toLocaleString()} km/yr`;
}

export function formatOntarioRegionNote(region: RegionalAssumptions = getRegionalAssumptions()): string {
  return `${region.label}-baseline estimates in ${region.displayCurrency}. Condition, mileage, and local demand still cause real variation`;
}

export function parseRegionId(raw: unknown): RegionId {
  if (raw === 'british-columbia' || raw === 'bc') return 'british-columbia';
  return DEFAULT_REGION;
}
