import type { SearchQuery } from '../types/car.types';
import type { CollectionRankBy } from '../utils/collectionCuration';

export interface CollectionDisplayConfig {
  /** Default to one pick per make+model instead of every trim/year. */
  dedupeByModel?: boolean;
  /** Client-side ranking for curated collections. */
  rankBy?: CollectionRankBy;
}

export interface CollectionConfig {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  query: SearchQuery;
  display?: CollectionDisplayConfig;
}

/**
 * Curated collection definitions shared by the Landing page (cards + live
 * counts) and the Collection page (actual results). All filters use fields
 * that exist in the EPA-derived database.
 */
export const COLLECTIONS: Record<string, CollectionConfig> = {
  'goldilocks': {
    id: 'goldilocks',
    title: 'THE GOLDILOCKS ZONE',
    subtitle: 'Just Right for Most People',
    description: 'Balanced price and efficiency for everyday drivers',
    query: {
      filters: {
        price: { min: 15000, max: 35000 },
        fuelEconomy: { min: 30 },
      },
      sort: { field: 'year', order: 'desc' },
    },
    display: {
      dedupeByModel: true,
      rankBy: 'best-value',
    },
  },
  'gas-savers': {
    id: 'gas-savers',
    title: 'BEST GAS SAVERS',
    subtitle: 'Fill Up Less, Save More',
    description: 'Maximum fuel efficiency without breaking the bank',
    query: {
      filters: {
        fuelEconomy: { min: 35 },
        price: { max: 40000 },
      },
      sort: { field: 'fuelEconomy', order: 'desc' },
    },
  },
  'luxury-less': {
    id: 'luxury-less',
    title: 'LUXURY FOR LESS',
    subtitle: 'Premium Badge, Smart Price',
    description: 'High-end brands at accessible prices',
    query: {
      filters: {
        make: ['Mercedes-Benz', 'BMW', 'Audi', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Lincoln'],
        price: { max: 50000 },
        year: { min: 2015 },
      },
      sort: { field: 'year', order: 'desc' },
    },
  },
  'family-fortress': {
    id: 'family-fortress',
    title: 'FAMILY FORTRESS',
    subtitle: 'Protect What Matters Most',
    description: 'Maximum space and practicality for the whole crew',
    query: {
      filters: {
        bodyStyle: ['suv', 'minivan'],
      },
      sort: { field: 'year', order: 'desc' },
    },
  },
  'weekend-warriors': {
    id: 'weekend-warriors',
    title: 'WEEKEND WARRIORS',
    subtitle: 'Live for the Drive',
    description: 'Sporty coupes with larger engines (EPA has no convertible class)',
    query: {
      filters: {
        bodyStyle: ['coupe'],
        displacement: { min: 3.0 },
      },
      sort: { field: 'year', order: 'desc' },
    },
  },
  'work-horses': {
    id: 'work-horses',
    title: 'WORK HORSES',
    subtitle: 'Built to Work, Priced to Own',
    description: 'Serious truck capability for serious work',
    query: {
      filters: {
        bodyStyle: ['truck'],
        driveType: ['AWD', '4WD'],
      },
      sort: { field: 'year', order: 'desc' },
    },
  },
  'future-proof': {
    id: 'future-proof',
    title: 'FUTURE-PROOF',
    subtitle: 'Drive Tomorrow, Today',
    description: 'Electric and hybrid vehicles leading the way',
    query: {
      filters: {
        fuelType: ['electric', 'hybrid', 'plug-in hybrid'],
        year: { min: 2018 },
      },
      sort: { field: 'year', order: 'desc' },
    },
  },
};
