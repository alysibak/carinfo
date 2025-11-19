export interface CarSpecs {
  id: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  countryOfOrigin: string;

  engine: {
    displacement: number;
    horsepower: number;
    torque: number;
    fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'plug-in hybrid';
    cylinders?: number;
    configuration?: string;
  };

  performance: {
    zeroToSixty?: number;
    topSpeed?: number;
    quarterMile?: number;
  };

  dimensions: {
    length: number;
    width: number;
    height: number;
    wheelbase: number;
    curbWeight: number;
  };

  fuelEconomy: {
    city?: number;
    highway?: number;
    combined?: number;
  };

  transmission: {
    type: 'manual' | 'automatic' | 'cvt' | 'dual-clutch';
    speeds?: number;
  };

  driveType: 'FWD' | 'RWD' | 'AWD' | '4WD';
  bodyStyle: 'sedan' | 'suv' | 'coupe' | 'convertible' | 'hatchback' | 'wagon' | 'truck' | 'van' | 'minivan';

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

export interface SearchResults {
  results: CarSpecs[];
  total: number;
  hasMore: boolean;
}
