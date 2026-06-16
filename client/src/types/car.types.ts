export type ProvenanceSource = 'epa' | 'nhtsa' | 'estimated' | 'curated';
export type Provenance = Record<string, ProvenanceSource>;

export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'plug-in hybrid' | 'hydrogen';
export type DriveType = 'FWD' | 'RWD' | 'AWD' | '4WD';
export type BodyStyle =
  | 'sedan'
  | 'suv'
  | 'coupe'
  | 'convertible'
  | 'hatchback'
  | 'wagon'
  | 'truck'
  | 'van'
  | 'minivan';

export type VehicleCategory = 'car' | 'suv' | 'truck' | 'van';

export type ShoppingSegment =
  | 'hot-hatch'
  | 'sport-compact'
  | 'sport-sedan'
  | 'muscle'
  | 'sports-car'
  | 'luxury'
  | 'mainstream'
  | 'utility'
  | 'ev'
  | 'truck';

export interface OwnershipProfile {
  label: string;
  tags: string[];
  bestFor: string[];
}

export interface CarSpecs {
  id: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  countryOfOrigin?: string;
  epaId?: number;
  provenance: Provenance;
  vehicleCategory?: VehicleCategory;
  shoppingSegment?: ShoppingSegment;
  ownershipProfile?: OwnershipProfile;

  engine: {
    displacement?: number;
    horsepower?: number;
    torque?: number;
    fuelType: FuelType;
    cylinders?: number;
    configuration?: string;
  };

  performance?: {
    zeroToSixty?: number;
    topSpeed?: number;
    quarterMile?: number;
  };

  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    wheelbase?: number;
    curbWeight?: number;
  };

  fuelEconomy: {
    city?: number;
    highway?: number;
    combined?: number;
  };

  epa?: {
    co2?: number;
    annualFuelCost?: number;
    rangeMiles?: number;
    kWhPer100Mi?: number;
    charge120Hours?: number;
    charge240Hours?: number;
    vClass?: string;
    /** Greenhouse-gas score 1–10 (higher = cleaner). EPA, ~2013+ records only. */
    ghgScore?: number;
    /** EPA 5-yr fuel save/spend vs. the average new vehicle, USD (signed: + = saves). */
    fuelSavings5yrUsd?: number;
    /** Petroleum consumption, barrels of oil per year. */
    barrelsPerYear?: number;
    /** Plug-in hybrid dual-mode economy (EPA: gas vs. electric operating modes). */
    phev?: {
      gasMpg?: number;
      electricMpge?: number;
      electricRangeMi?: number;
      chargeL2Hours?: number;
      blendedMpge?: number;
    };
  };

  transmission: {
    type: 'manual' | 'automatic' | 'cvt' | 'dual-clutch';
    speeds?: number;
    description?: string;
  };

  driveType: DriveType;
  bodyStyle: BodyStyle;

  safetyRating?: {
    overall?: number;
    frontal?: number;
    side?: number;
    rollover?: number;
  };

  price?: {
    msrp?: number;
    min?: number;
    max?: number;
    isEstimated?: boolean;
    confidence?: 'low' | 'medium' | 'high';
    confidenceLabel?: string;
  };

  images?: string[];
  productionYears?: {
    start: number;
    end?: number;
  };
}

export interface CarFilter {
  make?: string[];
  model?: string[];
  year?: {
    min?: number;
    max?: number;
  };
  countryOfOrigin?: string[];
  bodyStyle?: string[];
  fuelType?: string[];
  transmission?: string[];
  driveType?: string[];
  price?: {
    min?: number;
    max?: number;
  };
  horsepower?: {
    min?: number;
    max?: number;
  };
  displacement?: {
    min?: number;
    max?: number;
  };
  fuelEconomy?: {
    min?: number;
    max?: number;
  };
}

export interface SearchQuery {
  query?: string;
  filters?: CarFilter;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

export interface SearchResults {
  results: CarSpecs[];
  total: number;
  hasMore: boolean;
}

export interface OwnershipAssumptions {
  annualKm: string;
  annualMiles: number;
  energyPriceNote: string;
  insuranceTier: string;
  depreciationNote: string;
  regionNote: string;
}

export interface BatteryHealthEstimate {
  factor: number;
  label: string;
  chemistryNote: string;
}

export interface ConditionValueBand {
  label: string;
  low: number;
  high: number;
}

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

export interface ResaleImpact {
  currentValue: { low: number; high: number; mid: number };
  projectedResale5Year: { low: number; high: number; mid: number };
  estimatedLoss5Year: { low: number; high: number; mid: number };
  note: string;
}

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
  mode?: 'full' | 'operating';
  disclaimer?: string;
}

export interface MarketValueEstimate {
  low: number;
  high: number;
  mid: number;
  confidence: 'low' | 'medium' | 'high';
  confidenceLabel: string;
  conditionBands?: ConditionValueBand[];
  batteryHealth?: BatteryHealthEstimate;
  retentionTier?: 'A' | 'B' | 'C';
  msrpAnchor?: number;
  retainedFraction?: number;
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

export interface AnnualCostRange {
  low: number;
  high: number;
  mid: number;
}

export interface TcoRange {
  low: number;
  high: number;
  mid: number;
}

export interface CarDashboard {
  car: CarSpecs;
  segmentCount: number;
  ownership: OwnershipEconomics;
  dealRating: string | null;
  annualRunningCost: AnnualCostRange | null;
  tco5Year: TcoRange | null;
  evCharge?: {
    charge120Hours?: number;
    charge240Hours?: number;
    kWhPer100Mi?: number;
    rangeMiles?: number;
  };
  fieldProvenance: Provenance;
  zeroToSixty?: {
    value: number;
    method: 'actual' | 'predicted';
    confidence: string;
  };
}
