import type { SearchQuery } from '../types/car.types';
import type { CollectionRankBy } from '../utils/collectionCuration';

export interface CollectionDisplayConfig {
  /** Default to one pick per make+model instead of every trim/year. */
  dedupeByModel?: boolean;
  /** Client-side ranking for curated collections. */
  rankBy?: CollectionRankBy;
  /** How many ranked picks to show before “open Search”. */
  shortlistSize?: number;
}

export interface CollectionConfig {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  query: SearchQuery;
  display?: CollectionDisplayConfig;
}

const CURATED: CollectionDisplayConfig = {
  dedupeByModel: true,
  rankBy: 'best-value',
  shortlistSize: 12,
};

/**
 * Curated shortlists — not catalogs. Each opens as ranked picks + Search exit.
 */
export const COLLECTIONS: Record<string, CollectionConfig> = {
  goldilocks: {
    id: 'goldilocks',
    title: 'The Goldilocks zone',
    subtitle: 'Balanced price and efficiency',
    description: 'Everyday drivers who want solid MPG without a luxury budget.',
    query: {
      filters: {
        price: { min: 15000, max: 35000 },
        fuelEconomy: { min: 30 },
      },
      sort: { field: 'year', order: 'desc' },
    },
    display: CURATED,
  },
  'gas-savers': {
    id: 'gas-savers',
    title: 'Gas savers',
    subtitle: 'Efficiency first',
    description: 'Highest combined economy under a practical budget.',
    query: {
      filters: {
        fuelEconomy: { min: 35 },
        price: { max: 40000 },
      },
      sort: { field: 'fuelEconomy', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'daily-driver' },
  },
  'luxury-less': {
    id: 'luxury-less',
    title: 'Luxury for less',
    subtitle: 'Premium badges, used-market prices',
    description: 'German and Japanese luxury brands in an accessible CAD value band.',
    query: {
      filters: {
        make: ['Mercedes-Benz', 'BMW', 'Audi', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Lincoln'],
        price: { max: 50000 },
        year: { min: 2015 },
      },
      sort: { field: 'year', order: 'desc' },
    },
    display: CURATED,
  },
  'family-fortress': {
    id: 'family-fortress',
    title: 'Family fortress',
    subtitle: 'Space and practicality',
    description: 'SUVs and minivans for crews and cargo.',
    query: {
      filters: {
        bodyStyle: ['suv', 'minivan'],
      },
      sort: { field: 'year', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'daily-driver' },
  },
  'weekend-warriors': {
    id: 'weekend-warriors',
    title: 'Weekend warriors',
    subtitle: 'Sporty coupes',
    description: 'Coupes with larger engines (EPA has no convertible class).',
    query: {
      filters: {
        bodyStyle: ['coupe'],
        displacement: { min: 3.0 },
      },
      sort: { field: 'year', order: 'desc' },
    },
    display: CURATED,
  },
  'work-horses': {
    id: 'work-horses',
    title: 'Work horses',
    subtitle: 'Trucks that haul',
    description: 'AWD/4WD trucks for serious work.',
    query: {
      filters: {
        bodyStyle: ['truck'],
        driveType: ['AWD', '4WD'],
      },
      sort: { field: 'year', order: 'desc' },
    },
    display: CURATED,
  },
  'future-proof': {
    id: 'future-proof',
    title: 'Future-proof',
    subtitle: 'Electric and hybrid',
    description: 'Electrified powertrains from 2018 on — ranked shortlist, not every trim.',
    query: {
      filters: {
        fuelType: ['electric', 'hybrid', 'plug-in hybrid'],
        year: { min: 2018 },
      },
      sort: { field: 'year', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'best-value', shortlistSize: 12 },
  },
};
