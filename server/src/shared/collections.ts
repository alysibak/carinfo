/**
 * The curated shortlists and how their picks are ranked, shared by the server
 * (the home page's previews, GET /api/cars/collections/previews) and the
 * client (each shortlist's own page), so a preview's three cars are the page's
 * first three. Pure: see energy-cost.ts for what code here may import.
 */
import type { CarSpecs, SearchQuery } from '../types/car.types.js';

export type CollectionRankBy =
  'best-value' | 'daily-driver' | 'efficiency' | 'fun' | 'capability' | 'range' | 'luxury';

/**
 * Rank shortlist picks on what EPA and NHTSA recorded, each list by what it
 * promises: fuel economy, crash-test stars, rated power, EPA range, newer
 * model years among equals. An estimated price only bounds a list (its search
 * filters); it never ranks one.
 *
 * The first score multiplied MPG by safety and divided by price, so an EV's
 * MPGe (100+) led "Gas savers" and the cheapest old pickup led "Work horses";
 * the next ranked on estimated running costs. The site leans on the records.
 */
export function calculateCollectionScore(car: CarSpecs, rankBy: CollectionRankBy): number {
  const hp = car.engine.horsepower ?? 0;
  const mpg = car.fuelEconomy.combined ?? 0;
  const stars = car.safetyRating?.overall ?? 0;
  const recency = car.year - 2015;
  const missing = -1e9;

  switch (rankBy) {
    case 'best-value':
      // Efficient and well rated: EPA combined MPG, then NHTSA stars.
      return mpg > 0 ? mpg + stars * 2 + recency * 0.5 : missing;
    case 'daily-driver':
      // Crash-test stars first, fuel economy and newer years among equals: a
      // star outweighs any MPG gap, so a 4-star hybrid never leads the
      // 5-star cars in "the best crash ratings".
      return mpg > 0 || stars > 0 ? stars * 100 + mpg * 0.5 + recency * 0.5 : missing;
    case 'efficiency':
      return mpg > 0 ? mpg + (car.year - 2018) * 0.2 : missing;
    case 'fun':
    case 'capability':
      return hp > 0 ? hp + recency * 5 : missing;
    case 'range': {
      const range = car.epa?.rangeMiles ?? 0;
      return range > 0 ? range * 1.609344 + (car.year - 2020) * 10 : missing;
    }
    case 'luxury':
      // The newest and best rated; the price filter keeps it "for less".
      return recency * 3 + stars * 2 + hp / 100;
  }
}

/** Keep the highest-scoring trim per make+model. */
export function dedupeByModel<T extends CarSpecs>(cars: T[], scoreFn: (car: T) => number): T[] {
  const best = new Map<string, T>();

  for (const car of cars) {
    const key = `${car.make}|${car.model}`.toLowerCase();
    const existing = best.get(key);
    if (!existing || scoreFn(car) > scoreFn(existing)) {
      best.set(key, car);
    }
  }

  return Array.from(best.values());
}

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
    subtitle: 'Well rated and efficient, $20k–$35k',
    description:
      'Gas and hybrid cars and SUVs from 2021 on with an estimated value of $20k–$35k, ranked by NHTSA crash rating, then EPA fuel economy.',
    query: {
      filters: {
        price: { min: 20000, max: 35000 },
        fuelType: ['gasoline', 'hybrid'],
        bodyStyle: ['sedan', 'hatchback', 'suv', 'wagon'],
        year: { min: 2021 },
      },
      sort: { field: 'safety', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'daily-driver' },
  },
  'gas-savers': {
    id: 'gas-savers',
    title: 'Gas savers',
    subtitle: 'The least fuel, under $40k',
    description:
      'Gas and hybrid cars from 2019 on with an estimated value under $40k, ranked by EPA fuel economy. EVs have their own list.',
    query: {
      filters: {
        fuelType: ['gasoline', 'hybrid'],
        fuelEconomy: { min: 40 },
        price: { max: 40000 },
        year: { min: 2019 },
      },
      sort: { field: 'fuelEconomy', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'efficiency' },
  },
  'luxury-less': {
    id: 'luxury-less',
    title: 'Luxury for less',
    subtitle: 'Premium badges, used-market prices',
    description:
      'German, Japanese and American luxury brands from 2018 to 2023 with an estimated value under $50k, the newest first, then by NHTSA crash rating.',
    query: {
      filters: {
        make: [
          'Mercedes-Benz',
          'BMW',
          'Audi',
          'Lexus',
          'Acura',
          'Infiniti',
          'Cadillac',
          'Lincoln',
          'Genesis',
          'Volvo',
        ],
        fuelType: ['gasoline', 'hybrid', 'diesel'],
        price: { max: 50000 },
        // Used-market years: with price left out of the ranking, a 2026 model
        // under the cap would lead a list of luxury cars "for less".
        year: { min: 2018, max: 2023 },
      },
      sort: { field: 'year', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'luxury' },
  },
  'family-fortress': {
    id: 'family-fortress',
    title: 'Family fortress',
    subtitle: 'Three rows, the best crash ratings',
    description:
      'Minivans and three-row SUVs from 2020 on, ranked by NHTSA crash rating, then EPA fuel economy.',
    query: {
      filters: {
        threeRow: true,
        fuelType: ['gasoline', 'hybrid', 'plug-in hybrid'],
        year: { min: 2020 },
      },
      sort: { field: 'safety', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'daily-driver' },
  },
  'weekend-warriors': {
    id: 'weekend-warriors',
    title: 'Weekend warriors',
    subtitle: 'Sports cars under $70k',
    description:
      'Sports cars from 2018 on with an estimated value under $70k, ranked by rated power.',
    query: {
      query: 'sports car',
      filters: {
        // Carmakers, not tuners: EPA also lists Roush's reworked Mustangs.
        make: [
          'Mazda',
          'Toyota',
          'Subaru',
          'Nissan',
          'Ford',
          'Chevrolet',
          'Dodge',
          'BMW',
          'Porsche',
          'Hyundai',
          'Honda',
          'Volkswagen',
          'Audi',
          'Lexus',
        ],
        fuelType: ['gasoline'],
        price: { max: 70000 },
        year: { min: 2018 },
      },
      sort: { field: 'horsepower', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'fun' },
  },
  'work-horses': {
    id: 'work-horses',
    title: 'Work horses',
    subtitle: 'Full-size 4x4 pickups',
    description:
      'Full-size four-wheel-drive gas and diesel pickups from 2019 on with an estimated value under $70k, ranked by rated power.',
    query: {
      query: 'full size pickup',
      filters: {
        make: ['Ford', 'Chevrolet', 'GMC', 'Ram', 'Toyota', 'Nissan'],
        fuelType: ['gasoline', 'diesel', 'hybrid'],
        driveType: ['4WD', 'AWD'],
        price: { max: 70000 },
        year: { min: 2019 },
      },
      sort: { field: 'horsepower', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'capability' },
  },
  'future-proof': {
    id: 'future-proof',
    title: 'Future-proof',
    subtitle: 'EVs with 400+ km of range',
    description:
      'Electric cars from 2022 on with at least 400 km of EPA range and an estimated value under $60k, ranked by EPA range.',
    query: {
      filters: {
        // Carmakers with a dealer network behind the car: Fisker went under in 2024.
        make: [
          'Tesla',
          'Hyundai',
          'Kia',
          'Chevrolet',
          'Ford',
          'Nissan',
          'Volkswagen',
          'Toyota',
          'Subaru',
          'BMW',
          'Polestar',
          'Volvo',
          'Honda',
          'Cadillac',
          'Genesis',
          'Audi',
          'Mercedes-Benz',
          'Rivian',
          'Lucid',
        ],
        fuelType: ['electric'],
        rangeMiles: { min: 250 },
        price: { max: 60000 },
        year: { min: 2022 },
      },
      sort: { field: 'range', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'range', shortlistSize: 12 },
  },
};

/** A shortlist's ranked picks from its search results: one per model, best first. */
export function rankCollectionPicks<T extends CarSpecs>(
  results: T[],
  collection: CollectionConfig,
): T[] {
  const rankBy = collection.display?.rankBy ?? 'best-value';
  const score = (car: CarSpecs) => calculateCollectionScore(car, rankBy);
  return dedupeByModel(results, score).sort((a, b) => score(b) - score(a));
}
