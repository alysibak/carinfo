export interface CarSpecs {
  make: string;
  model: string;
  year: number;
  trim?: string;
  countryOfOrigin: string;

  // Engine specifications
  engine: {
    displacement: number; // in liters
    horsepower: number;
    torque: number; // in lb-ft
    fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'plug-in hybrid';
    cylinders?: number;
    configuration?: string; // e.g., "V6", "Inline-4", "Electric Motor"
  };

  // Performance
  performance: {
    zeroToSixty?: number; // in seconds
    topSpeed?: number; // in mph
    quarterMile?: number; // in seconds
  };

  // Dimensions
  dimensions: {
    length: number; // in inches
    width: number; // in inches
    height: number; // in inches
    wheelbase: number; // in inches
    curbWeight: number; // in lbs
  };

  // Fuel economy
  fuelEconomy: {
    city?: number; // MPG
    highway?: number; // MPG
    combined?: number; // MPG
  };

  // Additional info
  transmission: {
    type: 'manual' | 'automatic' | 'cvt' | 'dual-clutch';
    speeds?: number;
  };

  driveType: 'FWD' | 'RWD' | 'AWD' | '4WD';
  bodyStyle: 'sedan' | 'suv' | 'coupe' | 'convertible' | 'hatchback' | 'wagon' | 'truck' | 'van' | 'minivan';

  safetyRating?: {
    overall?: number; // out of 5
    frontal?: number;
    side?: number;
    rollover?: number;
  };

  price?: {
    msrp?: number;
    min?: number;
    max?: number;
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
