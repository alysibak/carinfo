/**
 * The curated shortlists and how their picks are ranked, shared by the server
 * (the home page's previews, GET /api/cars/collections/previews) and the
 * client (each shortlist's own page), so a preview's three cars are the page's
 * first three. Pure: see energy-cost.ts for what code here may import.
 */
import type { CarSpecs, SearchQuery } from '../types/car.types.js';

export type CollectionRankBy =
  'best-value' | 'daily-driver' | 'efficiency' | 'fun' | 'capability' | 'range' | 'luxury';

/** What a five- or four-star NHTSA rating is worth in a ranking, in dollars of cost. */
function safetyBonus(car: CarSpecs): number {
  const stars = car.safetyRating?.overall ?? 0;
  return stars >= 5 ? 2500 : stars >= 4 ? 1000 : 0;
}

/**
 * Rank shortlist picks on figures on file, each list by what it promises.
 *
 * The old score multiplied MPG by safety and divided by price: an EV's MPGe
 * (100+) swamped every gasoline car, so "Gas savers" led with a Model Y, and
 * dividing by price crowned the cheapest old car, so "Work horses" led with a
 * 1995 Mitsubishi pickup. Each score now works in the list's own terms, and
 * the lists' searches keep to recent model years.
 */
export function calculateCollectionScore(car: CarSpecs, rankBy: CollectionRankBy): number {
  const price = car.price?.msrp ?? 0;
  const running = car.runningCostCad ?? 0;
  const hp = car.engine.horsepower ?? 0;
  const mpg = car.fuelEconomy.combined ?? 0;
  const missing = -1e9;

  switch (rankBy) {
    case 'best-value':
      // Cheapest to buy and keep for three years; a little credit for newer.
      if (!(price > 0) || !(running > 0)) return missing;
      return -(price + 3 * running) + safetyBonus(car) + (car.year - 2018) * 600;
    case 'daily-driver':
      // As best-value, with the running cost weighed over five years.
      if (!(price > 0) || !(running > 0)) return missing;
      return -(price + 5 * running) + 2 * safetyBonus(car) + (car.year - 2018) * 800;
    case 'efficiency':
      return mpg > 0 ? mpg + (car.year - 2018) * 0.2 : missing;
    case 'fun':
      // Power for the money, newer first among equals.
      if (!(price > 0) || !(hp > 0)) return missing;
      return hp / (price / 10000) + (car.year - 2015) * 2;
    case 'capability':
      // Power for the money: a work truck is bought on what it can pull.
      if (!(price > 0) || !(hp > 0)) return missing;
      return hp / (price / 10000) + (car.year - 2015) * 3;
    case 'range': {
      const range = car.epa?.rangeMiles ?? 0;
      if (!(price > 0) || !(range > 0)) return missing;
      return (range * 1.609344) / (price / 10000) + (car.year - 2020) * 5;
    }
    case 'luxury':
      // The newest luxury car for the money.
      if (!(price > 0)) return missing;
      return (car.year - 2015) * 2500 - price + safetyBonus(car);
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
    subtitle: 'Balanced price and running costs',
    description:
      'Gas and hybrid cars and SUVs from 2021 on, $20k–$35k, ranked by what they cost to buy and to keep for three years.',
    query: {
      filters: {
        price: { min: 20000, max: 35000 },
        fuelType: ['gasoline', 'hybrid'],
        bodyStyle: ['sedan', 'hatchback', 'suv', 'wagon'],
        year: { min: 2021 },
      },
      sort: { field: 'runningCost', order: 'asc' },
    },
    display: CURATED,
  },
  'gas-savers': {
    id: 'gas-savers',
    title: 'Gas savers',
    subtitle: 'The least fuel, under $40k',
    description:
      'Gas and hybrid cars from 2019 on that burn the least fuel, under $40k. EVs have their own list.',
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
      'German, Japanese and American luxury brands from 2018 on, under $50k: the newest for the money first.',
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
        year: { min: 2018 },
      },
      sort: { field: 'year', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'luxury' },
  },
  'family-fortress': {
    id: 'family-fortress',
    title: 'Family fortress',
    subtitle: 'Three rows, sensible running costs',
    description:
      'Minivans and three-row SUVs from 2020 on, ranked by what they cost to buy and to run for five years, with credit for crash-test stars.',
    query: {
      filters: {
        threeRow: true,
        fuelType: ['gasoline', 'hybrid', 'plug-in hybrid'],
        year: { min: 2020 },
      },
      sort: { field: 'runningCost', order: 'asc' },
    },
    display: { ...CURATED, rankBy: 'daily-driver' },
  },
  'weekend-warriors': {
    id: 'weekend-warriors',
    title: 'Weekend warriors',
    subtitle: 'Sports cars under $70k',
    description: 'Sports cars from 2018 on, under $70k, ranked by power for the money.',
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
      'Full-size four-wheel-drive gas and diesel pickups from 2019 on, under $70k, ranked by power for the money.',
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
      'Electric cars from 2022 on with at least 400 km of EPA range, under $60k, ranked by range for the money.',
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
