import type { CarFilter, SearchQuery } from '../types/car.types';

export interface BrowsePreset {
  id: string;
  label: string;
  description: string;
  filters: CarFilter;
  sort?: SearchQuery['sort'];
}

export interface BucketOption {
  id: string;
  label: string;
  description?: string;
  filters: CarFilter;
  sort?: SearchQuery['sort'];
}

/** How people actually shop — maps to EPA-backed filter fields. */
export const LIFESTYLE_PRESETS: BrowsePreset[] = [
  {
    id: 'daily-driver',
    label: 'Daily driver',
    description: 'Efficient sedans & SUVs under $35k',
    filters: {
      bodyStyle: ['sedan', 'suv'],
      price: { max: 35000 },
      fuelEconomy: { min: 26 },
    },
    sort: { field: 'fuelEconomy', order: 'desc' },
  },
  {
    id: 'first-car',
    label: 'First car',
    description: 'Affordable, easy on gas',
    filters: {
      price: { max: 18000 },
      fuelEconomy: { min: 28 },
      year: { min: 2010 },
    },
    sort: { field: 'price', order: 'asc' },
  },
  {
    id: 'family',
    label: 'Family hauler',
    description: 'SUVs & minivans with space',
    filters: { bodyStyle: ['suv', 'minivan', 'wagon'] },
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'commuter',
    label: 'Long commute',
    description: '40+ MPG combined',
    filters: { fuelEconomy: { min: 40 }, price: { max: 45000 } },
    sort: { field: 'fuelEconomy', order: 'desc' },
  },
  {
    id: 'work-truck',
    label: 'Work & tow',
    description: '4WD/AWD trucks',
    filters: { bodyStyle: ['truck'], driveType: ['AWD', '4WD'] },
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'weekend',
    label: 'Weekend fun',
    description: 'Coupe & larger engines',
    filters: { bodyStyle: ['coupe'], displacement: { min: 3.0 } },
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'eco',
    label: 'Go electric',
    description: 'EV, hybrid & plug-in',
    filters: { fuelType: ['electric', 'hybrid', 'plug-in hybrid'], year: { min: 2018 } },
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'luxury-value',
    label: 'Luxury for less',
    description: 'Premium brands under $50k',
    filters: {
      make: ['Mercedes-Benz', 'BMW', 'Audi', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Lincoln'],
      price: { max: 50000 },
      year: { min: 2015 },
    },
    sort: { field: 'year', order: 'desc' },
  },
];

export const PRICE_BUCKETS: BucketOption[] = [
  { id: 'under-15', label: 'Under $15k', description: 'Budget picks', filters: { price: { max: 15000 } } },
  { id: '15-25', label: '$15k–$25k', filters: { price: { min: 15000, max: 25000 } } },
  { id: '25-40', label: '$25k–$40k', filters: { price: { min: 25000, max: 40000 } } },
  { id: '40-60', label: '$40k–$60k', filters: { price: { min: 40000, max: 60000 } } },
  { id: '60-plus', label: '$60k+', filters: { price: { min: 60000 } } },
];

export const YEAR_BUCKETS: BucketOption[] = [
  { id: '2024', label: '2024', filters: { year: { min: 2024, max: 2024 } } },
  { id: '2020s', label: '2020+', description: 'Current gen', filters: { year: { min: 2020 } } },
  { id: '2015s', label: '2015+', filters: { year: { min: 2015 } } },
  { id: '2010s', label: '2010–2019', filters: { year: { min: 2010, max: 2019 } } },
  { id: '2000s', label: '2000–2009', filters: { year: { min: 2000, max: 2009 } } },
  { id: 'classic', label: '1995–1999', description: 'Classic era', filters: { year: { min: 1995, max: 1999 } } },
];

export const MPG_BUCKETS: BucketOption[] = [
  { id: 'mpg-25', label: '25+ MPG', filters: { fuelEconomy: { min: 25 } } },
  { id: 'mpg-35', label: '35+ MPG', filters: { fuelEconomy: { min: 35 } } },
  { id: 'mpg-45', label: '45+ MPG', filters: { fuelEconomy: { min: 45 } } },
  { id: 'mpg-100', label: '100+ MPGe', description: 'EVs & plug-in hybrids', filters: { fuelEconomy: { min: 100 } } },
];

export const BODY_TYPES: { id: string; label: string; description: string }[] = [
  { id: 'sedan', label: 'Sedan', description: 'Daily comfort' },
  { id: 'hatchback', label: 'Hatchback', description: 'Compact & practical' },
  { id: 'suv', label: 'SUV', description: 'Space & height' },
  { id: 'truck', label: 'Truck', description: 'Haul & tow' },
  { id: 'coupe', label: 'Coupe', description: 'Style & sport' },
  { id: 'wagon', label: 'Wagon', description: 'Cargo & drive' },
  { id: 'minivan', label: 'Minivan', description: 'Max seats' },
  { id: 'van', label: 'Van', description: 'Work & cargo' },
];

export const FUEL_TYPES: { id: string; label: string; description: string }[] = [
  { id: 'gasoline', label: 'Gasoline', description: 'Most common' },
  { id: 'hybrid', label: 'Hybrid', description: 'Gas + electric' },
  { id: 'plug-in hybrid', label: 'Plug-in hybrid', description: 'Charge at home' },
  { id: 'electric', label: 'Electric', description: 'Zero tailpipe' },
  { id: 'hydrogen', label: 'Hydrogen Fuel Cell', description: 'FCEV · H₂ powertrain' },
  { id: 'diesel', label: 'Diesel', description: 'Torque & range' },
];

export const DRIVE_TYPES = ['FWD', 'RWD', 'AWD', '4WD'] as const;

export const TOP_MAKES = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz',
  'Audi', 'Tesla', 'Nissan', 'Hyundai', 'Kia', 'Subaru', 'Mazda', 'Lexus', 'Jeep', 'Ram',
];

export const POPULAR_SEARCHES = [
  { label: '2024 Camry', query: '2024 camry' },
  { label: 'Honda Civic', query: 'honda civic' },
  { label: 'Ford F-150', query: 'ford f-150' },
  { label: 'Toyota RAV4', query: 'toyota rav4' },
];

export function presetToSearchQuery(preset: BrowsePreset | BucketOption): SearchQuery {
  return {
    filters: preset.filters,
    sort: 'sort' in preset && preset.sort ? preset.sort : { field: 'year', order: 'desc' },
    limit: 36,
    offset: 0,
  };
}

export function filtersToSearchQuery(filters: CarFilter, sort?: SearchQuery['sort']): SearchQuery {
  return {
    filters,
    sort: sort ?? { field: 'year', order: 'desc' },
    limit: 36,
    offset: 0,
  };
}

export function bodyTypeFilter(id: string): CarFilter {
  return { bodyStyle: [id] };
}

export function fuelTypeFilter(id: string): CarFilter {
  return { fuelType: [id] };
}

export function makeFilter(make: string): CarFilter {
  return { make: [make] };
}

/** Detect if current filters match a lifestyle preset (for UI highlight). */
export function matchingLifestylePreset(filters: CarFilter = {}): string | null {
  for (const preset of LIFESTYLE_PRESETS) {
    if (filtersMatchPreset(filters, preset.filters)) return preset.id;
  }
  return null;
}

function filtersMatchPreset(active: CarFilter, preset: CarFilter): boolean {
  const keys = new Set([...Object.keys(active), ...Object.keys(preset)]) as Set<keyof CarFilter>;
  for (const key of keys) {
    const a = active[key];
    const p = preset[key];
    if (p == null) continue;
    if (a == null) return false;
    if (Array.isArray(p) && Array.isArray(a)) {
      if (p.length !== a.length || !p.every((v) => a.includes(v))) return false;
    } else if (typeof p === 'object' && typeof a === 'object' && !Array.isArray(p)) {
      const pr = p as { min?: number; max?: number };
      const ar = a as { min?: number; max?: number };
      if (pr.min != null && ar.min !== pr.min) return false;
      if (pr.max != null && ar.max !== pr.max) return false;
    }
  }
  return true;
}
