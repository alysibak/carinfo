/**
 * The curated shortlists and how their picks are ranked, shared by the server
 * (the home page's previews, GET /api/cars/collections/previews) and the
 * client (each shortlist's own page), so a preview's three cars are the page's
 * first three. Pure: see energy-cost.ts for what code here may import.
 */
import type { CarSpecs, SearchQuery } from '../types/car.types.js';

export type CollectionRankBy =
  | 'best-value'
  | 'daily-driver'
  | 'efficiency'
  | 'fun'
  | 'capability'
  | 'range'
  | 'luxury'
  | 'lightest';

/**
 * Rank shortlist picks on what EPA, NHTSA and Transport Canada recorded, each
 * list by what it promises: fuel economy, crash-test stars, rated power, EPA
 * range, curb weight, newer model years among equals. The site's estimated
 * price neither ranks a list nor bounds one: it is a guess at a price.
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
      // Crash-test stars first, then the newest; among equals the version
      // using less fuel, not the most powerful (a 668 hp CT5-V led).
      return stars * 100 + recency * 3 + mpg / 100;
    case 'lightest': {
      // Transport Canada's curb weight, the lightest version measured.
      const kg = car.size?.curbWeightKg[0];
      return kg ? -kg + recency * 0.5 : missing;
    }
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
  // The id stays: links to /collection/goldilocks keep working.
  goldilocks: {
    id: 'goldilocks',
    title: 'Safe and thrifty',
    subtitle: 'Five crash-test stars, the least fuel',
    description:
      'Gas and hybrid cars and SUVs from 2021 on with five NHTSA stars overall, ranked by EPA fuel economy.',
    query: {
      filters: {
        safety: { min: 5 },
        fuelType: ['gasoline', 'hybrid'],
        bodyStyle: ['sedan', 'hatchback', 'suv', 'wagon'],
        year: { min: 2021 },
      },
      sort: { field: 'fuelEconomy', order: 'desc' },
    },
    // All five stars: ranked, and shown, by fuel use.
    display: { ...CURATED, rankBy: 'efficiency' },
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
  'clean-record': {
    id: 'clean-record',
    title: 'Clean recall record',
    subtitle: 'No recalls in Canada, 2019–2023',
    description:
      'Model years 2019 to 2023 with no recall in Canada for their powertrain, as Transport Canada lists them, ranked by NHTSA crash rating, then EPA fuel economy. Newer years are left out: they have had less time to be recalled.',
    query: {
      filters: {
        noRecalls: true,
        fuelType: ['gasoline', 'hybrid', 'plug-in hybrid', 'electric', 'diesel'],
        year: { min: 2019, max: 2023 },
      },
      sort: { field: 'safety', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'daily-driver' },
  },
  'gas-savers': {
    id: 'gas-savers',
    title: 'Gas savers',
    subtitle: 'The least fuel, gas and hybrid',
    description:
      'Gas and hybrid cars from 2019 on using 5.9 L/100 km or less, ranked by EPA fuel economy. EVs have their own list.',
    query: {
      filters: {
        fuelType: ['gasoline', 'hybrid'],
        fuelEconomy: { min: 40 },
        year: { min: 2019 },
      },
      sort: { field: 'fuelEconomy', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'efficiency' },
  },
  'future-proof': {
    id: 'future-proof',
    title: 'Future-proof',
    subtitle: 'EVs with 400+ km of range',
    description:
      'Electric cars from 2022 on with at least 400 km of EPA range, from carmakers still in business, ranked by EPA range.',
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
        year: { min: 2022 },
      },
      sort: { field: 'range', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'range', shortlistSize: 12 },
  },
  'work-horses': {
    id: 'work-horses',
    title: 'Work horses',
    subtitle: 'Full-size 4x4 pickups, the least fuel',
    description:
      'Full-size four-wheel-drive gas, diesel and hybrid pickups from 2019 on, ranked by EPA fuel economy.',
    query: {
      query: 'full size pickup',
      filters: {
        make: ['Ford', 'Chevrolet', 'GMC', 'Ram', 'Toyota', 'Nissan'],
        fuelType: ['gasoline', 'diesel', 'hybrid'],
        driveType: ['4WD', 'AWD'],
        year: { min: 2019 },
      },
      sort: { field: 'fuelEconomy', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'efficiency' },
  },
  'weekend-warriors': {
    id: 'weekend-warriors',
    title: 'Weekend warriors',
    subtitle: 'Sports cars, lightest first',
    description:
      'Sports cars from 2018 on, ranked by Transport Canada’s curb weight, the lightest first: less weight to carry around a corner.',
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
        year: { min: 2018 },
      },
      // Each model by its lightest version measured.
      sort: { field: 'weight', order: 'asc' },
    },
    display: { ...CURATED, rankBy: 'lightest' },
  },
  'luxury-less': {
    id: 'luxury-less',
    title: 'Luxury, a few years old',
    subtitle: 'Premium brands, 2018–2023',
    description:
      'German, Japanese, Korean, Swedish and American luxury brands from 2018 to 2023, ranked by NHTSA crash rating, then the newest.',
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
        // A few years old: the years a used luxury car is shopped in.
        year: { min: 2018, max: 2023 },
      },
      sort: { field: 'safety', order: 'desc' },
    },
    display: { ...CURATED, rankBy: 'luxury' },
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
