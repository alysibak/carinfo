import { LATEST_FULL_MODEL_YEAR } from '@carinfo/config/model-years';
import { FIRST_CAR } from '@carinfo/config/first-car';
import type { CarFilter, SearchQuery } from '../types/car.types';
import { filtersMatchExactly } from '../utils/filterState';

export interface BrowsePreset {
  id: string;
  label: string;
  description: string;
  filters: CarFilter;
  sort?: SearchQuery['sort'];
  /**
   * Search words the server reads into a class, segment or seating filter
   * ("third row", "sports car", "luxury"), which plain filters cannot express.
   */
  query?: string;
}

export interface BucketOption {
  id: string;
  label: string;
  description?: string;
  filters: CarFilter;
  sort?: SearchQuery['sort'];
}

/**
 * How people shop, on the records: each says its rule in its description.
 * None is bounded by the site's estimated value, which is a guess at a price.
 */
export const LIFESTYLE_PRESETS: BrowsePreset[] = [
  {
    id: 'daily-driver',
    label: 'Daily driver',
    description: 'Sedans, hatchbacks and SUVs from 2020 on, 7.8 L/100 km or less',
    filters: {
      bodyStyle: ['sedan', 'hatchback', 'suv'],
      fuelEconomy: { min: 30 },
      year: { min: 2020 },
    },
    sort: { field: 'fuelEconomy', order: 'desc' },
  },
  {
    id: 'first-car',
    label: 'First car',
    description: `${FIRST_CAR.minYear} on, ${FIRST_CAR.minStars}+ crash-test stars, not small or too powerful`,
    // Shared with the search, which reads "first car" and "teenager" the same way.
    filters: {
      safety: { min: FIRST_CAR.minStars },
      curbWeightKg: { min: FIRST_CAR.minWeightKg },
      horsepower: { max: FIRST_CAR.maxHp },
      fuelEconomy: { min: FIRST_CAR.minMpg },
      year: { min: FIRST_CAR.minYear },
      fuelType: [...FIRST_CAR.fuelTypes],
    },
    sort: { field: 'safety', order: 'desc' },
  },
  {
    id: 'family',
    label: 'Family hauler',
    description: 'Minivans and three-row SUVs',
    // Every SUV and wagon used to qualify, down to a two-door Wrangler.
    query: 'third row',
    filters: {},
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'commuter',
    label: 'Long commute',
    description: '5.9 L/100 km or less',
    filters: { fuelEconomy: { min: 40 } },
    sort: { field: 'fuelEconomy', order: 'desc' },
  },
  {
    id: 'work-truck',
    label: 'Work and tow',
    description: 'Full-size four-wheel-drive pickups',
    query: 'full size truck',
    filters: { bodyStyle: ['truck'], driveType: ['AWD', '4WD'] },
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'weekend',
    label: 'Weekend fun',
    description: 'Sports cars, roadsters and muscle cars',
    // Any coupe over 3 litres took in a CL600 and left out every Miata.
    query: 'sports car',
    filters: {},
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'eco',
    label: 'Go electric',
    description: 'Electric, hybrid and plug-in, 2018 on',
    filters: { fuelType: ['electric', 'hybrid', 'plug-in hybrid'], year: { min: 2018 } },
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'luxury-value',
    label: 'Luxury, a few years old',
    description: 'Premium brands, 2018 to 2023',
    // Eight makes by name missed Genesis, Volvo, Porsche, Jaguar and Land Rover.
    query: 'luxury',
    filters: { year: { min: 2018, max: 2023 } },
    sort: { field: 'year', order: 'desc' },
  },
];

/**
 * The classes shoppers compare within, as search words the server reads
 * (competitive sets and segments): each opens that class, all years.
 */
export const CLASS_LINKS: Array<{ label: string; query: string }> = [
  { label: 'Compact cars', query: 'compact car' },
  { label: 'Midsize sedans', query: 'midsize sedan' },
  { label: 'Compact SUVs', query: 'compact suv' },
  { label: 'Midsize SUVs', query: 'midsize suv' },
  { label: 'Three-row SUVs', query: 'third row suv' },
  { label: 'Full-size SUVs', query: 'full size suv' },
  { label: 'Midsize pickups', query: 'midsize truck' },
  { label: 'Full-size pickups', query: 'full size truck' },
  { label: 'Off-roaders', query: 'off road suv' },
  { label: 'Luxury sedans', query: 'luxury sedan' },
  { label: 'Luxury SUVs', query: 'luxury suv' },
  { label: 'Hot hatches', query: 'hot hatch' },
  { label: 'Sport sedans', query: 'sport sedan' },
  { label: 'Sports cars', query: 'sports car' },
  { label: 'Muscle cars', query: 'muscle car' },
  { label: 'Supercars', query: 'supercar' },
];

export const PRICE_BUCKETS: BucketOption[] = [
  {
    id: 'under-15',
    label: 'Under $15k',
    description: 'Budget picks',
    filters: { price: { max: 15000 } },
  },
  { id: '15-25', label: '$15k-$25k', filters: { price: { min: 15000, max: 25000 } } },
  { id: '25-40', label: '$25k-$40k', filters: { price: { min: 25000, max: 40000 } } },
  { id: '40-60', label: '$40k-$60k', filters: { price: { min: 40000, max: 60000 } } },
  { id: '60-plus', label: '$60k+', filters: { price: { min: 60000 } } },
];

export const YEAR_BUCKETS: BucketOption[] = [
  {
    id: 'latest',
    label: `${LATEST_FULL_MODEL_YEAR}+`,
    description: 'Newest models',
    filters: { year: { min: LATEST_FULL_MODEL_YEAR } },
  },
  { id: '2020s', label: '2020+', description: 'Current gen', filters: { year: { min: 2020 } } },
  { id: '2015s', label: '2015+', filters: { year: { min: 2015 } } },
  { id: '2010s', label: '2010–2019', filters: { year: { min: 2010, max: 2019 } } },
  { id: '2000s', label: '2000–2009', filters: { year: { min: 2000, max: 2009 } } },
  {
    id: 'classic',
    label: '1995–1999',
    description: 'Classic era',
    filters: { year: { min: 1995, max: 1999 } },
  },
];

export const MPG_BUCKETS: BucketOption[] = [
  // Labelled in L/100 km, Canada's unit; the filter keeps EPA's MPG (25 MPG = 9.4 L/100 km).
  { id: 'mpg-25', label: '9.4 L/100 km or less', filters: { fuelEconomy: { min: 25 } } },
  { id: 'mpg-35', label: '6.7 L/100 km or less', filters: { fuelEconomy: { min: 35 } } },
  { id: 'mpg-45', label: '5.2 L/100 km or less', filters: { fuelEconomy: { min: 45 } } },
  {
    id: 'mpg-100',
    label: 'Electric (100+ MPGe)',
    description: 'EVs & plug-in hybrids',
    filters: { fuelEconomy: { min: 100 } },
  },
];

/** Rated power, from EPA's test-car list or the manufacturer. */
export const POWER_BUCKETS: BucketOption[] = [
  { id: 'hp-under-150', label: 'Under 150 hp', filters: { horsepower: { max: 149 } } },
  { id: 'hp-150', label: '150–249 hp', filters: { horsepower: { min: 150, max: 249 } } },
  { id: 'hp-250', label: '250–399 hp', filters: { horsepower: { min: 250, max: 399 } } },
  { id: 'hp-400', label: '400+ hp', filters: { horsepower: { min: 400 } } },
];

/** NHTSA overall stars. A car NHTSA has not rated matches neither. */
export const SAFETY_BUCKETS: BucketOption[] = [
  { id: 'nhtsa-5', label: '5 stars', filters: { safety: { min: 5 } } },
  { id: 'nhtsa-4', label: '4 stars or more', filters: { safety: { min: 4 } } },
];

/**
 * EPA range for EVs, in km. The API filters on EPA's miles; each bound is the
 * mile figure that reads back as the round number of kilometres.
 */
export const RANGE_BUCKETS: BucketOption[] = [
  { id: 'range-300', label: '300+ km', filters: { rangeMiles: { min: 186.4 } } },
  { id: 'range-400', label: '400+ km', filters: { rangeMiles: { min: 248.5 } } },
  { id: 'range-500', label: '500+ km', filters: { rangeMiles: { min: 310.7 } } },
];

export const BODY_TYPES: { id: string; label: string; description: string }[] = [
  { id: 'sedan', label: 'Sedan', description: 'Four doors and a separate trunk' },
  { id: 'hatchback', label: 'Hatchback', description: 'A rear door that lifts with the glass' },
  { id: 'suv', label: 'SUV', description: 'Higher seats and a rear door that lifts' },
  { id: 'truck', label: 'Pickup', description: 'An open box behind the cab' },
  { id: 'coupe', label: 'Coupe', description: 'Two doors' },
  { id: 'convertible', label: 'Convertible', description: 'A roof that folds away' },
  { id: 'wagon', label: 'Wagon', description: 'A car with a long roof over the cargo area' },
  { id: 'minivan', label: 'Minivan', description: 'Sliding side doors and three rows' },
  { id: 'van', label: 'Van', description: 'Cargo and passenger vans' },
];

export const FUEL_TYPES: { id: string; label: string; description: string }[] = [
  { id: 'gasoline', label: 'Gasoline', description: 'A gas engine' },
  { id: 'hybrid', label: 'Hybrid', description: 'Gas and electric; never plugs in' },
  {
    id: 'plug-in hybrid',
    label: 'Plug-in hybrid',
    description: 'Plugs in to drive some way on electricity, then runs on gas',
  },
  { id: 'electric', label: 'Electric', description: 'Battery only; plugs in' },
  { id: 'diesel', label: 'Diesel', description: 'A diesel engine' },
  { id: 'hydrogen', label: 'Hydrogen', description: 'A fuel cell, filled with hydrogen' },
];

export const DRIVE_TYPES = ['FWD', 'RWD', 'AWD', '4WD'] as const;

/** What each drive means, said out: "AWD" alone means little to many buyers. */
export const DRIVE_LABELS: Record<(typeof DRIVE_TYPES)[number], string> = {
  FWD: 'Front-wheel',
  RWD: 'Rear-wheel',
  AWD: 'All-wheel',
  '4WD': 'Four-wheel (4x4)',
};

export const TOP_MAKES = [
  'Toyota',
  'Honda',
  'Ford',
  'Chevrolet',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Tesla',
  'Nissan',
  'Hyundai',
  'Kia',
  'Subaru',
  'Mazda',
  'Lexus',
  'Jeep',
  'Ram',
];

export const POPULAR_SEARCHES = [
  {
    label: `${LATEST_FULL_MODEL_YEAR} Toyota Camry`,
    query: `${LATEST_FULL_MODEL_YEAR} toyota camry`,
  },
  { label: 'Honda Civic', query: 'honda civic' },
  { label: 'Ford F-150', query: 'ford f-150' },
  { label: 'Toyota RAV4', query: 'toyota rav4' },
];

export function presetToSearchQuery(preset: BrowsePreset | BucketOption): SearchQuery {
  return {
    ...('query' in preset && preset.query ? { query: preset.query } : {}),
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

/**
 * The lifestyle preset the current search is (for UI highlight): its filters
 * exactly, and its words where it has some. A preset with words and no
 * filters ("third row") matched every unfiltered search on filters alone.
 */
export function matchingLifestylePreset(filters: CarFilter = {}, query?: string): string | null {
  const text = (query ?? '').trim().toLowerCase();
  for (const preset of LIFESTYLE_PRESETS) {
    if (preset.query && preset.query !== text) continue;
    if (filtersMatchExactly(filters, preset.filters)) return preset.id;
  }
  return null;
}
