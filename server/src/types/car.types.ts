export type ProvenanceSource = 'epa' | 'nrcan' | 'nhtsa' | 'estimated' | 'curated';
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
    /** EPA interior passenger volume, cubic feet (cars only; none for SUVs, pickups, vans). */
    passengerVolumeCuFt?: number;
    /** EPA luggage volume, cubic feet: the trunk, or a hatchback's or wagon's cargo space. */
    luggageVolumeCuFt?: number;
    /** EPA rates it on premium gasoline: its fuel is costed at premium's price. */
    premiumFuel?: boolean;
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

  /**
   * NHTSA's 5-star ratings (2011 on) from the tests that describe this car's
   * body and drivetrain that model year (utils/nhtsa-ratings.ts). Where
   * several do (a pickup's cabs), each score is the lowest of them.
   */
  safetyRating?: {
    overall?: number;
    frontal?: number;
    side?: number;
    rollover?: number;
    /** NHTSA's chance of a rollover in a single-vehicle crash: 0.14. The highest where several. */
    rolloverRisk?: number;
    /** NHTSA's ids for the tested vehicles. */
    nhtsaIds?: number[];
  };

  /** The recommended safety technology NHTSA lists for the tested configurations. */
  safetyTech?: {
    /** Electronic stability control. */
    esc?: SafetyAvailability;
    /** Forward collision warning. */
    fcw?: SafetyAvailability;
    /** Lane departure warning. */
    ldw?: SafetyAvailability;
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

  /**
   * A photo of a car of this model year, make, model and body from Wikimedia
   * Commons (utils/car-photos.ts), with the credit its licence asks for.
   */
  photo?: CarPhoto;
  productionYears?: {
    start: number;
    end?: number;
  };
}

export type Car = CarSpecs & { id: string };

export interface CarPhoto {
  /** About 500 px wide, on Wikimedia's servers. */
  src: string;
  /** The file's page on Commons: its author, licence and full size. */
  page: string;
  /** Author and licence: "Jane Doe, CC BY-SA 4.0". */
  credit: string;
  licenseUrl?: string;
  /** The file's name, which says what it shows: "2021 BMW M3 Competition Automatic 3.0 Front". */
  caption: string;
  /** The car's generation, from Wikipedia: "BMW M3 (G80)". */
  generation?: string;
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
    /** The EPA city or highway rating the bounds apply to; combined when absent. */
    basis?: 'city' | 'highway';
  };
  cylinders?: number[];
  /** "turbocharged", "supercharged" (a car with both matches either). */
  aspiration?: string[];
  /**
   * Minivans, passenger vans and three-row SUVs, by model: EPA records no
   * seating. False keeps to models sold without a third row ("5 seater").
   */
  threeRow?: boolean;
  /** EPA's two-seater class. */
  twoSeater?: boolean;
  /** Where the engine sits, by model (utils/engine-position.ts): EPA records none. */
  enginePosition?: 'front' | 'mid' | 'rear';
  /** Doors, from the model name or the body style. */
  doors?: number;
  /** EPA range in miles (EVs and plug-in hybrids' electric range). */
  rangeMiles?: { min?: number; max?: number };
  /** NHTSA overall crash-test stars; a car NHTSA has not rated never matches. */
  safety?: { min?: number; max?: number };
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
  /** Safety technology NHTSA lists for the car, standard on every version tested if asked. */
  safetyTech?: { features: Array<'esc' | 'fcw' | 'ldw'>; standard?: boolean };
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
  /**
   * Keep highest-ranking trim per make+model before pagination (true), or per
   * make+model+year (false). "auto" decides from the query: one per model for
   * a kind of car or a make ("cheap truck", "toyota"), one per year for a
   * model ("honda civic"). Omitted, every configuration is kept.
   */
  collapseByModel?: boolean | 'auto';
  /**
   * Set by the query parser, not the client: equivalent spellings of a trim
   * the query ended in ("type r", "r t"/"rt"). Results must carry one as
   * words of their model name or derived variant.
   */
  trimForms?: readonly string[];
  /**
   * Set by the query parser: the body, fuel, drive and induction words it read
   * into filters. Every result has them, so ranking leaves them out.
   */
  filterWords?: readonly string[];
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
  sortedBy?:
    'price' | 'fuelEconomy' | 'horsepower' | 'range' | 'safety' | 'runningCost' | 'luggage';
  /** "300 mile range", "400 km range": the least EPA range kept, in miles. */
  minRangeMiles?: number;
  /** With no year given, "cheapest" keeps to model years from this one. */
  recentFrom?: number;
  /** "new camry": model years from this one. */
  newestFrom?: number;
  /** "third row suv", "7 seater": matched by model name. */
  threeRow?: boolean;
  /** "5 seater": models sold with a third row left out. */
  twoRow?: boolean;
  /** "2 seater": EPA's two-seater class. */
  twoSeater?: boolean;
  /** "mid engine": where the engine sits, read by model. */
  enginePosition?: 'front' | 'mid' | 'rear';
  /** "e46 m3", "2nd gen tacoma": the generation read, "E46 BMW 3 Series, 1999–2006". */
  generation?: string;
  /** "2 door": doors asked for, read from names and body styles. */
  doors?: number;
  /** "accord vs camry": the searches shown together. */
  compared?: string[];
  /** The base configuration each side names, for the compare page. */
  compareWith?: Array<{ id: string; label: string }>;
  /** "compact suv", "sports car", "luxury sedan": the kind of vehicle read. */
  vehicleClass?: string;
  /** "telsa model s": the words as typed and as searched, respelt as the site knows them. */
  corrected?: { from: string; to: string };
  /** "honda civic": the results are all one model, which has a page of every year. */
  modelPage?: { label: string; path: string };
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
  /**
   * "2017 cr-v problems": recalls and owner complaints were asked for. The
   * car whose page lists them, where the results are one model year.
   */
  records?: { carId?: string; label?: string };
  /** "suv with collision warning": kept to cars NHTSA lists with it (standard, if asked). */
  safetyTech?: { features: Array<'esc' | 'fcw' | 'ldw'>; standard: boolean };
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
  /** "f150 5.0": the engine size kept, in litres. */
  engineSize?: number;
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
  /** Whether the rows are one per model (true) or per model year (false), when collapsed. */
  onePerModel?: boolean;
}

/** Standard, optional, or standard on some versions and optional on others. */
export type SafetyAvailability = 'standard' | 'optional' | 'some';

/** One vehicle NHTSA crash-tested, as its 5-Star Safety Ratings list it. */
export interface NhtsaRating {
  /** NHTSA's id for the tested vehicle. */
  id: number;
  /** The configuration NHTSA tested, as it names it: "2020 Toyota Camry 4 DR FWD". */
  tested: string;
  overall?: number;
  frontal?: number;
  side?: number;
  rollover?: number;
  /** NHTSA's chance of a rollover in a single-vehicle crash: 0.14. */
  rolloverRisk?: number;
  esc?: SafetyAvailability;
  fcw?: SafetyAvailability;
  ldw?: SafetyAvailability;
}

/** A recall Transport Canada lists for a model year, in its own words. */
export interface CanadianRecall {
  /** Transport Canada's recall number, which its database and the maker know it by: "2021702". */
  number: string;
  date: string;
  /** "Brakes", "Airbag": the system, as Transport Canada files it. */
  system: string;
  kind: 'safety' | 'compliance';
  /** Vehicles affected in Canada. */
  units?: number;
  /** "Issue: ... Safety risk: ... Corrective action: ..." */
  summary: string;
}

/** Owner complaints to NHTSA (U.S.) about a model year. Not adjusted for how many were sold. */
export interface ComplaintSummary {
  complaints: number;
  crashes: number;
  fires: number;
  injuries: number;
  deaths: number;
  /** The parts complained of most, by NHTSA's names, with their counts. */
  parts: Array<[string, number]>;
}

/** One model year of a model, across its configurations: a row of the model's page. */
export interface ModelYearSummary {
  year: number;
  /** The year's base configuration: the cheapest, two-wheel drive before AWD. */
  carId: string;
  configurations: number;
  /** Estimated value, CAD, cheapest and dearest configuration. */
  price?: { min: number; max: number };
  /** EPA combined MPG, the thriftiest configuration that burns fuel. */
  combinedMpg?: number;
  /** EPA range, the longest-range electric configuration. */
  rangeMiles?: number;
  horsepower?: { min: number; max: number };
  /** NHTSA overall stars, the best rated configuration. */
  safetyStars?: number;
  fuelTypes: FuelType[];
  bodyStyles: BodyStyle[];
  /** "XV70 · 8th generation (2018–2024)", where the generation is known. */
  generation?: string;
  /** Transport Canada recalls, where its records for the model are matched to the site's. */
  recalls?: number;
  /** Owner complaints to NHTSA, where its records for the model are matched. */
  complaints?: number;
  /** The part complained of most, by NHTSA's name: "ENGINE", "AIR BAGS". */
  complaintPart?: string;
  /**
   * Safety technology NHTSA lists as standard on every configuration of the
   * year it tested; absent where NHTSA tested none.
   */
  standardTech?: Array<'fcw' | 'ldw'>;
  /**
   * What changed from the model year before it on file, from the EPA and NHTSA
   * records: "New generation: XV70 · 8th generation", "Hybrid added", "Up to 301
   * hp (was 268)", "Forward collision warning made standard".
   */
  changes?: string[];
}

/** A model across every year on file: the model's page ("/models/toyota/camry"). */
export interface ModelOverview {
  make: string;
  /** "Camry", "F-150", "3 Series". */
  name: string;
  path: string;
  first: number;
  last: number;
  onSale: boolean;
  /** The newest year's base configuration, for the picture and photo. */
  lead: Car;
  /** Newest first. */
  years: ModelYearSummary[];
  /** Runs of years in one generation, newest first, where generations are known. */
  generations: Array<{ label: string; from: number; to: number }>;
  /** Models shoppers compare it with, each with its own page. */
  rivals: Array<{ make: string; name: string; path: string }>;
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

/**
 * How a car sits against its class: rivals in the same competitive set within
 * a model year of it, one figure per model line so a model sold in forty
 * configurations counts once. Medians, not means, so one supercar in a class
 * does not move the middle.
 */
export interface ClassComparison {
  /** "Sport compact": the class the rivals are drawn from. */
  className: string;
  /** Rival model lines behind the medians. */
  models: number;
  /** Model years the rivals are drawn from. */
  years: { min: number; max: number };
  /** Combined fuel use; kWh/100 km among electric rivals only. Lower is better. */
  fuel?: { unit: 'L/100 km' | 'kWh/100 km'; car: number; median: number; models: number };
  /** Yearly running cost, CAD, on the default region's basis for car and class alike. */
  annualCost?: { car: number; median: number; models: number };
  /** Estimated value, CAD. */
  value?: { car: number; median: number; models: number };
  horsepower?: { car: number; median: number; models: number };
  /** EPA luggage volume, cubic feet: the trunk, or cargo space with every seat up. */
  luggage?: { car: number; median: number; models: number };
}

export interface CarDashboard {
  car: Car;
  /** The car against its class (utils/class-comparison.ts); absent when it has no class. */
  classComparison?: ClassComparison;
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
  /** Its generation, from utils/generations.ts: "E46 · 4th generation (1999–2006)". */
  generation?: string;
  /** Where the engine sits, when not in front (utils/engine-position.ts). */
  enginePosition?: 'mid' | 'rear';
  /** The page of every year of its model: "Honda Civic", "/models/honda/civic". */
  modelPage?: { label: string; path: string };
  /**
   * Transport Canada's recalls for the model year, newest first. Absent where
   * its records for the model are not matched to the site's: an empty list
   * says none are listed, which only a matched model can say.
   */
  recalls?: CanadianRecall[];
  /** Owner complaints to NHTSA (U.S.) about the model year, where matched. */
  complaints?: ComplaintSummary;
  /** Where the year stands among its model's years on file by complaints: 1st of 30. */
  complaintRank?: { position: number; of: number };
  /** Each vehicle NHTSA tested that describes this car, where its ratings are matched. */
  nhtsaTests?: NhtsaRating[];
  /** The day each set of government records was fetched: "2026-10-20". */
  recordDates?: { recalls?: string; complaints?: string; ratings?: string };
}
