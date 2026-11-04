import { LATEST_FULL_MODEL_YEAR } from '@carinfo/config/model-years';
import { FIRST_CAR } from '@carinfo/config/first-car';
import type { CarFilter, SearchQuery } from '../types/car.types';
import { filtersMatchExactly } from '../utils/filterState';
import { msg } from '../i18n';

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
    label: msg('Daily driver'),
    description: msg('Sedans, hatchbacks and SUVs from 2020 on, 7.8 L/100 km or less'),
    filters: {
      bodyStyle: ['sedan', 'hatchback', 'suv'],
      fuelEconomy: { min: 30 },
      year: { min: 2020 },
    },
    sort: { field: 'fuelEconomy', order: 'desc' },
  },
  {
    id: 'first-car',
    label: msg('First car'),
    description: msg('2015 on, 4+ crash-test stars, not small or too powerful'),
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
    label: msg('Family hauler'),
    description: msg('Minivans and three-row SUVs'),
    // Every SUV and wagon used to qualify, down to a two-door Wrangler.
    query: 'third row',
    filters: {},
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'commuter',
    label: msg('Long commute'),
    description: msg('5.9 L/100 km or less'),
    filters: { fuelEconomy: { min: 40 } },
    sort: { field: 'fuelEconomy', order: 'desc' },
  },
  {
    id: 'work-truck',
    label: msg('Work and tow'),
    description: msg('Full-size four-wheel-drive pickups'),
    query: 'full size truck',
    filters: { bodyStyle: ['truck'], driveType: ['AWD', '4WD'] },
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'weekend',
    label: msg('Weekend fun'),
    description: msg('Sports cars, roadsters and muscle cars'),
    // Any coupe over 3 litres took in a CL600 and left out every Miata.
    query: 'sports car',
    filters: {},
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'eco',
    label: msg('Go electric'),
    description: msg('Electric, hybrid and plug-in, 2018 on'),
    filters: { fuelType: ['electric', 'hybrid', 'plug-in hybrid'], year: { min: 2018 } },
    sort: { field: 'year', order: 'desc' },
  },
  {
    id: 'luxury-value',
    label: msg('Luxury, a few years old'),
    description: msg('Premium brands, 2018 to 2023'),
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
  { label: msg('Compact cars'), query: 'compact car' },
  { label: msg('Midsize sedans'), query: 'midsize sedan' },
  { label: msg('Compact SUVs'), query: 'compact suv' },
  { label: msg('Midsize SUVs'), query: 'midsize suv' },
  { label: msg('Three-row SUVs'), query: 'third row suv' },
  { label: msg('Full-size SUVs'), query: 'full size suv' },
  { label: msg('Midsize pickups'), query: 'midsize truck' },
  { label: msg('Full-size pickups'), query: 'full size truck' },
  { label: msg('Off-roaders'), query: 'off road suv' },
  { label: msg('Luxury sedans'), query: 'luxury sedan' },
  { label: msg('Luxury SUVs'), query: 'luxury suv' },
  { label: msg('Hot hatches'), query: 'hot hatch' },
  { label: msg('Sport sedans'), query: 'sport sedan' },
  { label: msg('Sports cars'), query: 'sports car' },
  { label: msg('Muscle cars'), query: 'muscle car' },
  { label: msg('Supercars'), query: 'supercar' },
];

export const PRICE_BUCKETS: BucketOption[] = [
  {
    id: 'under-15',
    label: msg('Under $15k'),
    description: msg('Budget picks'),
    filters: { price: { max: 15000 } },
  },
  { id: '15-25', label: msg('$15k-$25k'), filters: { price: { min: 15000, max: 25000 } } },
  { id: '25-40', label: msg('$25k-$40k'), filters: { price: { min: 25000, max: 40000 } } },
  { id: '40-60', label: msg('$40k-$60k'), filters: { price: { min: 40000, max: 60000 } } },
  { id: '60-plus', label: msg('$60k+'), filters: { price: { min: 60000 } } },
];

export const YEAR_BUCKETS: BucketOption[] = [
  {
    id: 'latest',
    label: `${LATEST_FULL_MODEL_YEAR}+`,
    description: msg('Newest models'),
    filters: { year: { min: LATEST_FULL_MODEL_YEAR } },
  },
  {
    id: '2020s',
    label: msg('2020+'),
    description: msg('Current gen'),
    filters: { year: { min: 2020 } },
  },
  { id: '2015s', label: msg('2015+'), filters: { year: { min: 2015 } } },
  { id: '2010s', label: msg('2010–2019'), filters: { year: { min: 2010, max: 2019 } } },
  { id: '2000s', label: msg('2000–2009'), filters: { year: { min: 2000, max: 2009 } } },
  {
    id: 'classic',
    label: msg('1995–1999'),
    description: msg('Classic era'),
    filters: { year: { min: 1995, max: 1999 } },
  },
];

export const MPG_BUCKETS: BucketOption[] = [
  // Labelled in L/100 km, Canada's unit; the filter keeps EPA's MPG (25 MPG = 9.4 L/100 km).
  { id: 'mpg-25', label: msg('9.4 L/100 km or less'), filters: { fuelEconomy: { min: 25 } } },
  { id: 'mpg-35', label: msg('6.7 L/100 km or less'), filters: { fuelEconomy: { min: 35 } } },
  { id: 'mpg-45', label: msg('5.2 L/100 km or less'), filters: { fuelEconomy: { min: 45 } } },
  {
    id: 'mpg-100',
    label: msg('Electric (100+ MPGe)'),
    description: msg('EVs & plug-in hybrids'),
    filters: { fuelEconomy: { min: 100 } },
  },
];

/** Rated power, from EPA's test-car list or the manufacturer. */
export const POWER_BUCKETS: BucketOption[] = [
  { id: 'hp-under-150', label: msg('Under 150 hp'), filters: { horsepower: { max: 149 } } },
  { id: 'hp-150', label: msg('150–249 hp'), filters: { horsepower: { min: 150, max: 249 } } },
  { id: 'hp-250', label: msg('250–399 hp'), filters: { horsepower: { min: 250, max: 399 } } },
  { id: 'hp-400', label: msg('400+ hp'), filters: { horsepower: { min: 400 } } },
];

/** NHTSA overall stars. A car NHTSA has not rated matches neither. */
export const SAFETY_BUCKETS: BucketOption[] = [
  { id: 'nhtsa-5', label: msg('5 stars'), filters: { safety: { min: 5 } } },
  { id: 'nhtsa-4', label: msg('4 stars or more'), filters: { safety: { min: 4 } } },
];

/**
 * EPA range for EVs, in km. The API filters on EPA's miles; each bound is the
 * mile figure that reads back as the round number of kilometres.
 */
export const RANGE_BUCKETS: BucketOption[] = [
  { id: 'range-300', label: msg('300+ km'), filters: { rangeMiles: { min: 186.4 } } },
  { id: 'range-400', label: msg('400+ km'), filters: { rangeMiles: { min: 248.5 } } },
  { id: 'range-500', label: msg('500+ km'), filters: { rangeMiles: { min: 310.7 } } },
];

export const BODY_TYPES: { id: string; label: string; description: string }[] = [
  { id: 'sedan', label: msg('Sedan'), description: msg('Four doors and a separate trunk') },
  {
    id: 'hatchback',
    label: msg('Hatchback'),
    description: msg('A rear door that lifts with the glass'),
  },
  { id: 'suv', label: msg('SUV'), description: msg('Higher seats and a rear door that lifts') },
  { id: 'truck', label: msg('Pickup'), description: msg('An open box behind the cab') },
  { id: 'coupe', label: msg('Coupe'), description: msg('Two doors') },
  { id: 'convertible', label: msg('Convertible'), description: msg('A roof that folds away') },
  {
    id: 'wagon',
    label: msg('Wagon'),
    description: msg('A car with a long roof over the cargo area'),
  },
  { id: 'minivan', label: msg('Minivan'), description: msg('Sliding side doors and three rows') },
  { id: 'van', label: msg('Van'), description: msg('Cargo and passenger vans') },
];

export const FUEL_TYPES: { id: string; label: string; description: string }[] = [
  { id: 'gasoline', label: msg('Gasoline'), description: msg('A gas engine') },
  { id: 'hybrid', label: msg('Hybrid'), description: msg('Gas and electric; never plugs in') },
  {
    id: 'plug-in hybrid',
    label: msg('Plug-in hybrid'),
    description: msg('Plugs in to drive some way on electricity, then runs on gas'),
  },
  { id: 'electric', label: msg('Electric'), description: msg('Battery only; plugs in') },
  { id: 'diesel', label: msg('Diesel'), description: msg('A diesel engine') },
  { id: 'hydrogen', label: msg('Hydrogen'), description: msg('A fuel cell, filled with hydrogen') },
];

export const DRIVE_TYPES = ['FWD', 'RWD', 'AWD', '4WD'] as const;

/** What each drive means, said out: "AWD" alone means little to many buyers. */
export const DRIVE_LABELS: Record<(typeof DRIVE_TYPES)[number], string> = {
  FWD: msg('Front-wheel'),
  RWD: msg('Rear-wheel'),
  AWD: msg('All-wheel'),
  '4WD': msg('Four-wheel (4x4)'),
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
