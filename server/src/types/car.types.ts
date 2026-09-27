export type ProvenanceSource = 'epa' | 'nhtsa' | 'estimated' | 'curated';
export type Provenance = Record<string, ProvenanceSource>;

/** Forced induction. Naturally aspirated engines carry no value. */
export type Aspiration = 'turbocharged' | 'supercharged' | 'turbocharged and supercharged';

export type FuelType =
  | 'gasoline'
  | 'diesel'
  | 'electric'
  | 'hybrid'
  | 'plug-in hybrid'
  | 'hydrogen'
  /** Dedicated compressed natural gas (EPA atvType "CNG"); economy is per gasoline-gallon equivalent. */
  | 'natural gas';
export type DriveType = 'FWD' | 'RWD' | 'AWD' | '4WD';
export type BodyStyle =
  'sedan' | 'suv' | 'coupe' | 'convertible' | 'hatchback' | 'wagon' | 'truck' | 'van' | 'minivan';

export type VehicleCategory = 'car' | 'suv' | 'truck' | 'van';

export type ShoppingSegment =
  | 'hot-hatch'
  | 'sport-compact'
  | 'sport-sedan'
  | 'muscle'
  | 'sports-car'
  | 'supercar'
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
  make: string;
  model: string;
  year: number;
  trim?: string;
  /**
   * A trim EPA leaves out of the model name, named from the engine ("GT" for
   * a V8 Mustang, "Type R", "STI"). See utils/performance-trims.ts.
   */
  variant?: string;
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
    /**
     * Forced induction, from EPA's turbo/supercharger flags. Absent means
     * naturally aspirated (or electric), or a record from before the field.
     */
    aspiration?: Aspiration;
    /**
     * Where a horsepower figure that is not EPA's test-car rating came from:
     * the manufacturer's published rating, or the same engine in the same
     * model (a sibling or an adjacent year).
     */
    horsepowerBasis?: 'manufacturer' | 'sibling';
    /**
     * A 12-48 V mild hybrid (EPA's "Mild Hybrid"): the motor assists the
     * engine but never drives the car, so the fuel type is the engine's.
     */
    mildHybrid?: boolean;
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

  /** EPA-only supplemental fields (verified when present). */
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

  /**
   * Estimated yearly running cost, CAD, Ontario baseline (energy, insurance,
   * maintenance, tires, registration), set when the database is built so
   * searches can sort by it. The car page computes its own by region.
   */
  runningCostCad?: number;

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

export type Car = CarSpecs & { id: string };

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
    /** The EPA city or highway rating the bounds apply to; combined when absent. */
    basis?: 'city' | 'highway';
  };
  cylinders?: number[];
  /** "turbocharged", "supercharged" (a car with both matches either). */
  aspiration?: string[];
  /** Minivans, passenger vans and three-row SUVs, by model: EPA records no seating. */
  threeRow?: boolean;
  /** EPA range in miles (EVs and plug-in hybrids' electric range). */
  rangeMiles?: { min?: number; max?: number };
  /** Competitive sets ("compact-suv", "midsize-car"), any of which a car must be in. */
  classes?: string[];
  /** Shopping segments ("sports-car", "muscle"), any of which a car must be in. */
  segments?: string[];
  /** Luxury makes only. */
  luxury?: boolean;
  /** 12-48 V mild hybrids only ("mild hybrid" in a search). */
  mildHybrid?: boolean;
  /** EPA's automated manuals (dual-clutch gearboxes, mostly) only. */
  automatedManual?: boolean;
  /** Engine layouts ("Flat-4", "I6", "W12"), any of which a car must have. */
  layout?: string[];
  /** An engine family by name ("hemi", "ecoboost": utils/engine-families.ts). */
  engineFamily?: string;
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
  /** Keep highest-ranking trim per make+model before pagination. */
  collapseByModel?: boolean;
  /**
   * Set by the query parser, not the client: equivalent spellings of a trim
   * the query ended in ("type r", "r t"/"rt"). Results must carry one as
   * words of their model name or derived variant.
   */
  trimForms?: readonly string[];
  /** Set by the query parser: what it read into filters or sorting. */
  interpretation?: SearchInterpretation;
  /**
   * Set by the search itself on a retry: read "sport sedan" or "luxury" as
   * words ("Saab 9-3 Sport Sedan" is a model), not as a kind of vehicle.
   */
  keepClassWords?: boolean;
  /** Set by the search itself on a retry: leave the years in the words out. */
  ignoreYearWords?: boolean;
}

/** How the server read a free-text query, for the results page to state. */
export interface SearchInterpretation {
  /**
   * Words dropped because nothing matched with them, usually trim levels EPA
   * does not record ("TRD Pro", "EX-L", "Platinum").
   */
  ignored?: string[];
  /** A price limit read from the query ("under 30k"), estimated CAD value. */
  price?: { min?: number; max?: number };
  /** An order read from the query: "cheapest", "most fuel efficient", "fastest", "safest". */
  sortedBy?: 'price' | 'fuelEconomy' | 'horsepower' | 'range' | 'safety' | 'runningCost';
  /** "300 mile range", "400 km range": the least EPA range kept, in miles. */
  minRangeMiles?: number;
  /** With no year given, "cheapest" keeps to model years from this one. */
  recentFrom?: number;
  /** "new camry": model years from this one. */
  newestFrom?: number;
  /** "third row suv", "7 seater": matched by model name. */
  threeRow?: boolean;
  /** "accord vs camry": the searches shown together. */
  compared?: string[];
  /** The base configuration each side names, for the compare page. */
  compareWith?: Array<{ id: string; label: string }>;
  /** "compact suv", "sports car", "luxury sedan": the kind of vehicle read. */
  vehicleClass?: string;
  /** "best", "reliable": words no data on file can measure, set aside. */
  unmeasured?: string[];
  /** "good gas mileage": EVs left out of an MPG order. */
  gasMileage?: boolean;
  /** A cheapest-first order left out hydrogen and natural gas. */
  rareFuelsLeftOut?: boolean;
  /**
   * "2005 honda ridgeline": nothing that year, so every year is shown; these
   * are the years asked for and the years on file for what was found.
   */
  otherYears?: {
    asked: { min?: number; max?: number };
    /** Runs of consecutive model years: the Ranger is 1995-2011 and 2019-2026. */
    onFile: Array<{ min: number; max: number }>;
  };
  /** "cars like a camry": the car whose rivals are listed. */
  similarTo?: { id: string; label: string };
  /** "car for snow": kept to all- and four-wheel drive. */
  snow?: boolean;
  /** "mild hybrid": kept to 12-48 V mild hybrids, which are listed by their fuel. */
  mildHybrid?: boolean;
  /** "dual clutch", "dct": kept to EPA's automated manuals. */
  automatedManual?: boolean;
  /** "first car", "teenager": the First car preset's price, MPG and year limits. */
  firstCar?: { maxPrice: number; minMpg: number; minYear: number };
  /**
   * "over 30 mpg", "under 7 l/100km", "40 mpg highway": the EPA rating asked
   * for, in the unit asked. Electric cars are left out of an MPG or L/100 km
   * bound (see gasMileage).
   */
  fuelEconomy?: {
    min?: number;
    max?: number;
    unit: 'MPG' | 'MPGe' | 'L/100 km';
    basis?: 'city' | 'highway';
  };
  /** "over 300 hp": cars with no rating on file are left out. */
  horsepower?: { min?: number; max?: number };
  /** "boxer", "straight six": the engine layouts kept. */
  layouts?: string[];
  /** "hemi", "ecoboost": what the engine name was read as. */
  engineFamily?: string;
}

/** Response body of the search endpoints. */
export interface SearchResults {
  results: Car[];
  total: number;
  hasMore: boolean;
  /**
   * Set only on an empty result whose requested years (typed, like "1985
   * corvette", or filtered) fall wholly outside the model years on file, so
   * the UI can say so instead of suggesting a spelling problem.
   */
  yearCoverage?: { min: number; max: number };
  interpretation?: SearchInterpretation;
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
  /**
   * Set for cars the site does not value (utils/unvalued.ts): collector cars
   * and cars never sold to the public. The figures above are computed but
   * must not be shown as the car's value or cost.
   */
  unvalued?: UnvaluedReason;
}

/** Why a car carries no market value or running cost. */
export interface UnvaluedReason {
  kind: 'collector' | 'not-retailed';
  /** "Collector car", "Lease or fleet only". */
  label: string;
  note: string;
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
  car: Car;
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
  /** The class it is shopped in ("Compact SUV"), from utils/competitive-sets.ts. */
  competitiveClass?: string;
}
