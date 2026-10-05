import type { Car, SearchQuery, SearchResults } from '../types/car.types.js';
import { readFileSync } from 'fs';
import { computeEvScore } from '../utils/ev-scoring.js';
import { normalizeCarRecord } from '../utils/car-normalize.js';
import { cleanCorpusHorsepower } from '../utils/horsepower-plausibility.js';
import { dataFileCandidates, resolveDataFile } from '../utils/data-paths.js';
import {
  bestFuzzyScore,
  editDistance,
  fuzzyTokenMatch,
  lineupForToken,
  maxEditsForToken,
  modelFamilyName,
  modelPhraseMatches,
  modelWordsInOrder,
  normalizeSearchQuery,
  normalizeSearchToken,
} from '../utils/fuzzy-search.js';
import { enrichCar } from './content-enrichment.js';
import { ensureUniqueIds } from '../utils/unique-ids.js';
import { withRunningCosts } from '../utils/running-cost.js';
import { type RuntimeDatabaseFile, unpackRuntimeDatabase } from './runtime-db.js';
import { LATEST_FULL_MODEL_YEAR } from '../config/model-years.js';
import { FIRST_CAR } from '../config/first-car.js';
import { mpgToLPer100Km } from '../config/regional-assumptions.js';
import { TRIM_QUERY_FORMS } from '../utils/performance-trims.js';
import { extractQueryModifiers, withoutFigures } from '../utils/search-modifiers.js';
import { ENGINE_FAMILIES, isEngineFamilyId } from '../utils/engine-families.js';
import { isThreeRow } from '../utils/three-row.js';
import { enginePosition } from '../utils/engine-position.js';
import { readGeneration } from '../utils/generations.js';
import { competitiveSets } from '../utils/competitive-sets.js';
import { isLuxuryBrand } from '../utils/vehicle-taxonomy.js';
import { findSimilarCars, sameModelLine } from '../utils/similar-vehicles.js';

function resolveDbPath(): string | null {
  return resolveDataFile('cars.json');
}

interface CarDatabase {
  cars: Car[];
  lastUpdated: string;
  sources?: string[];
  /** Present when file was pre-built by scripts/build-runtime-database.ts */
  ready?: boolean;
}

// ─── In-memory cache & indexes ────────────────────────────────────────────────
// The database is loaded once at startup and kept in memory.  All lookups use
// pre-built indexes so searches are O(matching-cars) instead of O(all-cars).

let cachedCars: Car[] = [];
let rawIdIndex: Map<string, Car> = new Map();
let lastUpdated = '';
let dbSources: string[] = ['epa'];

// Primary lookup
let idIndex: Map<string, Car> = new Map();

// Category indexes – map a lowercase key to the list of cars in that bucket.
let makeIndex: Map<string, Car[]> = new Map();
let modelIndex: Map<string, Car[]> = new Map();
let bodyStyleIndex: Map<string, Car[]> = new Map();
let fuelTypeIndex: Map<string, Car[]> = new Map();
let transmissionIndex: Map<string, Car[]> = new Map();
let driveTypeIndex: Map<string, Car[]> = new Map();
let countryIndex: Map<string, Car[]> = new Map();

// Pre-computed derived data
let cachedMakes: string[] = [];
let cachedStats: ReturnType<typeof computeStatistics> | null = null;

// Minimal built-in dataset so deployments still work even if `cars.json` is missing.
// This is primarily useful for serverless platforms (e.g. Vercel) where bundling a
// large JSON file may be deferred to a later optimization.
const FALLBACK_CARS: Car[] = [
  {
    id: 'car-001',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    trim: 'XSE',
    provenance: {},
    countryOfOrigin: 'Japan',
    engine: {
      displacement: 3.5,
      horsepower: 301,
      torque: 267,
      fuelType: 'gasoline',
      cylinders: 6,
      configuration: 'V6',
    },
    performance: { zeroToSixty: 5.8, topSpeed: 135 },
    dimensions: { length: 192.1, width: 72.4, height: 56.9, wheelbase: 111.2, curbWeight: 3572 },
    fuelEconomy: { city: 22, highway: 32, combined: 26 },
    transmission: { type: 'automatic', speeds: 8 },
    driveType: 'FWD',
    bodyStyle: 'sedan',
    safetyRating: { overall: 5 },
    price: { msrp: 34400 },
  },
  {
    id: 'car-002',
    make: 'Ford',
    model: 'Mustang',
    year: 2021,
    trim: 'GT',
    provenance: {},
    countryOfOrigin: 'USA',
    engine: {
      displacement: 5.0,
      horsepower: 450,
      torque: 410,
      fuelType: 'gasoline',
      cylinders: 8,
      configuration: 'V8',
    },
    performance: { zeroToSixty: 4.2, topSpeed: 155 },
    dimensions: { length: 188.5, width: 75.4, height: 54.3, wheelbase: 107.1, curbWeight: 3705 },
    fuelEconomy: { city: 15, highway: 24, combined: 18 },
    transmission: { type: 'manual', speeds: 6 },
    driveType: 'RWD',
    bodyStyle: 'coupe',
    safetyRating: { overall: 5 },
    price: { msrp: 36800 },
  },
];

/**
 * Load the database once into memory and build all indexes.
 * Prefers cars-ready.json (pre-enriched at build time) for fast Vercel cold starts.
 *
 * INVARIANT: every path out of this function leaves `cachedCars` fully enriched
 * and normalized. Read paths (getCarById, searchCars, …) therefore hand records
 * straight back instead of re-running normalizeCarRecord per request — that
 * re-normalization used to be ~75% of the cost of a 500-result search, because
 * applyMarketValue only short-circuits on `price.isEstimated === false` and
 * normalized records carry `true`, so estimateMarketValue re-ran every time.
 */
function initDatabase(): void {
  if (cachedCars.length > 0) return;

  try {
    const readyPath = resolveDataFile('cars-ready.json');
    const dbPath = readyPath ?? resolveDbPath();
    if (!dbPath) {
      console.warn(
        `[car.service] Missing database file. Tried: ${dataFileCandidates('cars.json').join(', ')}. Using fallback dataset.`,
      );
      loadFallbackDataset();
      return;
    }

    const started = Date.now();
    const raw = readFileSync(dbPath, 'utf-8');
    const db = JSON.parse(raw) as CarDatabase | RuntimeDatabaseFile;

    if (db.ready || readyPath) {
      // Pre-built at deploy time — skip enrich/normalize (the cold-start killer).
      cachedCars = unpackRuntimeDatabase(db);
      rawIdIndex = new Map(cachedCars.map((car) => [car.id, car]));
      console.log(
        `[car.service] Loaded ready DB: ${cachedCars.length.toLocaleString()} cars in ${((Date.now() - started) / 1000).toFixed(1)}s`,
      );
    } else {
      // Dev / missing ready file: enrich + normalize at load (slow on large DBs).
      cachedCars = withRunningCosts(
        ensureUniqueIds(cleanCorpusHorsepower(db.cars.map(enrichCar).map(normalizeCarRecord)).cars)
          .cars,
      );
      rawIdIndex = new Map(db.cars.map((car) => [car.id, car]));
      console.log(
        `[car.service] Loaded + enriched DB: ${cachedCars.length.toLocaleString()} cars in ${((Date.now() - started) / 1000).toFixed(1)}s`,
      );
    }

    lastUpdated = db.lastUpdated;
    dbSources = db.sources?.length ? db.sources : ['epa'];
    buildIndexes();
  } catch (error) {
    console.error(
      '[car.service] Failed to initialize database from cars.json, falling back to built-in dataset:',
      error,
    );
    loadFallbackDataset();
  }
}

/** Built-in two-car dataset, normalized so it satisfies the same invariant. */
function loadFallbackDataset(): void {
  cachedCars = withRunningCosts(FALLBACK_CARS.map(normalizeCarRecord));
  rawIdIndex = new Map(FALLBACK_CARS.map((car) => [car.id, car]));
  lastUpdated = new Date().toISOString();
  buildIndexes();
}

function addToMapIndex(map: Map<string, Car[]>, key: string, car: Car): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(car);
  } else {
    map.set(key, [car]);
  }
}

function buildIndexes(): void {
  idIndex = new Map();
  makeIndex = new Map();
  modelIndex = new Map();
  bodyStyleIndex = new Map();
  fuelTypeIndex = new Map();
  transmissionIndex = new Map();
  driveTypeIndex = new Map();
  countryIndex = new Map();

  for (const car of cachedCars) {
    idIndex.set(car.id, car);

    const makeLower = car.make.toLowerCase();
    addToMapIndex(makeIndex, makeLower, car);
    addToMapIndex(modelIndex, car.model.toLowerCase(), car);
    addToMapIndex(bodyStyleIndex, car.bodyStyle, car);
    addToMapIndex(fuelTypeIndex, car.engine.fuelType, car);
    if (car.transmission?.type) {
      addToMapIndex(transmissionIndex, car.transmission.type, car);
    }
    addToMapIndex(driveTypeIndex, car.driveType, car);
    if (car.countryOfOrigin) {
      addToMapIndex(countryIndex, car.countryOfOrigin, car);
    }
  }

  // Pre-compute sorted makes list
  cachedMakes = Array.from(makeIndex.keys())
    .map((k) => {
      // Return the original-case version from the first car in the bucket
      const cars = makeIndex.get(k)!;
      return cars[0].make;
    })
    .sort();

  cachedStats = null; // will be lazily computed
}

/** Load the database on first API call instead of at module import (Vercel cold start). */
function ensureDatabase(): void {
  if (cachedCars.length > 0) return;
  initDatabase();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get all unique makes (cached).
 */
export function getAllMakes(): string[] {
  ensureDatabase();
  return cachedMakes;
}

/**
 * Get models for a specific make using the make index.
 */
export function getModelsByMake(make: string): string[] {
  ensureDatabase();
  const cars = makeIndex.get(make.toLowerCase());
  if (!cars) return [];

  const models = new Set(cars.map((car) => car.model));
  return Array.from(models).sort();
}

/**
 * Get a car by ID – O(1) via Map.
 */
export function getCarById(id: string): Car | null {
  ensureDatabase();
  // Already normalized at load (see initDatabase invariant) — hand it back as-is.
  return idIndex.get(id) ?? null;
}

/** Cars sharing a body style — for segment / similar prefiltering. */
export function getCarsByBodyStyle(bodyStyle: string): Car[] {
  ensureDatabase();
  if (!bodyStyle) return [];
  return bodyStyleIndex.get(bodyStyle) ?? bodyStyleIndex.get(bodyStyle.toLowerCase()) ?? [];
}

/** Same make + model + year, different EPA configurations (trims/transmissions). */
export function getSiblingConfigs(id: string, limit = 24): Car[] {
  ensureDatabase();
  const anchor = idIndex.get(id);
  if (!anchor) return [];
  const makeCars = makeIndex.get(anchor.make.toLowerCase()) ?? [];
  const siblings = makeCars.filter(
    (c) =>
      c.id !== anchor.id &&
      c.year === anchor.year &&
      c.model.toLowerCase() === anchor.model.toLowerCase(),
  );
  siblings.sort((a, b) => {
    const drive = (a.driveType ?? '').localeCompare(b.driveType ?? '');
    if (drive !== 0) return drive;
    const mpg = (b.fuelEconomy?.combined ?? 0) - (a.fuelEconomy?.combined ?? 0);
    if (mpg !== 0) return mpg;
    const hp = (b.engine?.horsepower ?? 0) - (a.engine?.horsepower ?? 0);
    if (hp !== 0) return hp;
    return (a.trim ?? '').localeCompare(b.trim ?? '');
  });
  return siblings.slice(0, limit);
}

/** Debug: raw cars.json record plus enrichment and normalization stages. */
export function getCarPipelineDebug(id: string): {
  raw: Car;
  enriched: Car;
  normalized: Car;
} | null {
  ensureDatabase();
  const raw = rawIdIndex.get(id);
  if (!raw) return null;
  const enriched = enrichCar(raw);
  const normalized = normalizeCarRecord(enriched);
  return { raw, enriched, normalized };
}

/**
 * Search cars with filters and sorting.
 *
 * Strategy:
 * 1. Pick the smallest candidate set using indexes (make / bodyStyle / etc.)
 * 2. Run a single-pass filter over the candidates for remaining criteria
 * 3. Sort only the matching results
 * 4. Paginate
 */
export function searchCars(query: SearchQuery): SearchResults {
  ensureDatabase();
  const rivals = readRivalsQuery(query.query ?? '');
  if (rivals) {
    const found = searchRivals(query, rivals.lead, rivals.named);
    if (found) return found;
  }
  const parts = (query.query ?? '')
    .split(/\s+(?:vs\.?|versus|compared (?:to|with))\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) return searchTogether(query, parts.slice(0, 4));
  return searchOne(query);
}

/**
 * "cars like a camry", "alternatives to the rav4", "miata competitors": the
 * rivals of the car named, as its page lists them. "like" was set aside and
 * the search showed Camrys. Words before "like" narrow the rivals ("awd cars
 * like a camry", "cheapest suvs like the cr-v").
 */
const RIVALS_BEFORE =
  /^(.*?)\b(?:(?:similar|comparable)\s+to|like|alternatives?\s+(?:to|for)|competitors?\s+(?:to|of|for)|rivals?\s+(?:to|of|for)|instead\s+of)\s+(?:(?:a|an|the|my)\s+)?(.+)$/i;
const RIVALS_AFTER = /^(.+?)\s+(?:alternatives|competitors|rivals)$/i;
/** Words before "like" that ask for nothing: "cars like", "something like". */
const RIVALS_LEAD_FILLER =
  /\b(?:cars?|vehicles?|something|anything|other|others|models?|options?)\b/gi;

export function readRivalsQuery(text: string): { lead: string; named: string } | null {
  const t = text.trim();
  const before = RIVALS_BEFORE.exec(t);
  // "like new": a condition, not a comparison.
  if (before && !/^new\b/i.test(before[2])) {
    return { lead: before[1].replace(RIVALS_LEAD_FILLER, ' ').trim(), named: before[2].trim() };
  }
  const after = RIVALS_AFTER.exec(t);
  return after ? { lead: '', named: after[1].trim() } : null;
}

/** EPA's drive, door, body and trim words, where a shopper's name for a car ends. */
const NAME_ENDS_AT =
  /^(?:[24]wd|awd|fwd|rwd|ff|fr|4x[24]|\d-door|\d?dr|hev|pickup|sedan|coupe|hatchback|wagon|convertible|l?[sx]?e|xse|xle|lx|ex|sport|touring|limited|base|standard|premium|w\/.*|.*\/.*|\(.*)$/i;

/** "Camry HEV FF LE" → "Camry", "Civic 4Dr" (an Si) → "Civic Si", "F150 Pickup 2WD" → "F150". */
function shopperModelName(car: Pick<Car, 'model' | 'variant'>): string {
  const words = car.model.split(/\s+/).filter(Boolean);
  const end = words.findIndex((word, i) => i > 0 && NAME_ENDS_AT.test(word));
  const name = (end === -1 ? words : words.slice(0, end)).join(' ');
  return car.variant && !name.toLowerCase().includes(car.variant.toLowerCase())
    ? `${name} ${car.variant}`
    : name;
}

const isFourByFour = (car: Car) => car.driveType === 'AWD' || car.driveType === '4WD';
const plainName = (model: string) => model.replace(/\([^)]*\)/g, '').trim();

/**
 * The base configuration of the car a phrase names, in the newest year it
 * matched: "tesla model 3" anchored rivals on the Performance and listed
 * Taycans, "civic" on the Si and listed sport sedans.
 */
function baseConfiguration(named: string): Car | undefined {
  const matches = searchOne({ query: named, limit: 500, offset: 0 }).results;
  const top = matches[0];
  if (!top) return undefined;
  return matches
    .filter(
      (car) => car.year === top.year && car.bodyStyle === top.bodyStyle && sameModelLine(car, top),
    )
    .reduce((base, car) => {
      const price = car.price?.msrp ?? Infinity;
      const basePrice = base.price?.msrp ?? Infinity;
      // At one price, two-wheel drive is the base car (a Camry LE, not an AWD),
      // then the plainest name (a Corolla, not a Corolla Hybrid SE).
      if (price !== basePrice) return price < basePrice ? car : base;
      if (isFourByFour(base) !== isFourByFour(car)) return isFourByFour(car) ? base : car;
      return plainName(car.model).length < plainName(base.model).length ? car : base;
    }, top);
}

const carLabel = (car: Car) => `${car.year} ${car.make} ${shopperModelName(car)}`;

function searchRivals(query: SearchQuery, lead: string, named: string): SearchResults | null {
  const anchor = baseConfiguration(named);
  if (!anchor) return null;

  // The words before "like" and the sidebar's filters narrow the pool.
  const reading = enrichSearchQuery({ ...query, query: lead || undefined });
  const filters = reading.filters ?? {};
  let pool = singlePassFilter(getCandidateSet({ filters }), { filters }, false);
  // Rivals share a body style unless the query asks for another ("suvs like a
  // camry"), as on the car's page; a body with few cars opens to all.
  if (!filters.bodyStyle?.length) {
    const sameBody = pool.filter((car) => car.bodyStyle === anchor.bodyStyle);
    if (sameBody.length >= 40) pool = sameBody;
  }
  const rivals = findSimilarCars(anchor, pool, 24);

  const sort = query.sort?.field && query.sort.field !== 'relevance' ? query.sort : reading.sort;
  if (sort?.field && sort.field !== 'relevance') {
    sortResultsInPlace(rivals, sort.field, sort.order ?? 'desc');
  }
  const limit = Math.min(Math.max(query.limit || 50, 1), 500);
  const offset = Math.max(query.offset || 0, 0);
  const { ignored: _ignored, ...leadInterpretation } = reading.interpretation ?? {};
  return {
    results: rivals.slice(offset, offset + limit),
    total: rivals.length,
    hasMore: offset + limit < rivals.length,
    interpretation: {
      ...leadInterpretation,
      similarTo: {
        id: anchor.id,
        label: carLabel(anchor),
      },
    },
  };
}

function searchOne(query: SearchQuery): SearchResults {
  const results = runSearch(query);
  if (results.total > 0) return results;
  // "saab 9-3 sport sedan" and "cadillac xt5 luxury" name a model and a trim:
  // read the words as words before setting any aside.
  if (results.interpretation?.vehicleClass && !query.keepClassWords) {
    const literal = searchOne({ ...query, keepClassWords: true });
    if (literal.total > 0) return literal;
  }
  return (
    searchAsModelName(query) ??
    relaxTrailingWords(query) ??
    searchOtherYears(query, results) ??
    results
  );
}

/**
 * "2005 honda ridgeline", "2010 tesla model 3": the model is on file, just
 * not that year, and the search said nothing. Show its other years and say
 * which are on file. Years outside everything on file keep their own notice.
 */
function searchOtherYears(query: SearchQuery, empty: SearchResults): SearchResults | null {
  if (query.ignoreYearWords || empty.yearCoverage || query.filters?.year) return null;
  const asked = empty.interpretation?.newestFrom
    ? null
    : enrichSearchQuery({ ...query, offset: 0 }).filters?.year;
  if (!asked) return null;
  const all = runSearch({
    ...query,
    ignoreYearWords: true,
    offset: 0,
    limit: 500,
    collapseByModel: undefined,
  });
  if (all.total === 0) return null;
  const years = [...new Set(all.results.map((car) => car.year))].sort((a, b) => a - b);
  const onFile: Array<{ min: number; max: number }> = [];
  for (const year of years) {
    const run = onFile.at(-1);
    if (run && year === run.max + 1) run.max = year;
    else onFile.push({ min: year, max: year });
  }
  const shown = runSearch({ ...query, ignoreYearWords: true });
  return {
    ...shown,
    interpretation: { ...shown.interpretation, otherYears: { asked, onFile } },
  };
}

/**
 * Retry an empty search as one model name across makes. "hummer ev" read
 * "hummer" as the old HUMMER make and "ev" as electric, and found nothing;
 * the GMC Hummer EV is filed as "Hummer EV Pickup".
 */
function searchAsModelName(query: SearchQuery): SearchResults | null {
  if (query.filters?.make?.length || query.filters?.model?.length) return null;
  const phrase = normalizeSearchQuery(extractQueryModifiers(query.query ?? '').text);
  if (!phrase.includes(' ')) return null;
  const { models } = resolveModelsAcrossMakes(phrase);
  if (!models.length) return null;
  const retry = runSearch({ ...query, filters: { ...query.filters, model: models } });
  return retry.total > 0 ? retry : null;
}

/**
 * "honda accord vs toyota camry": each side searched on its own, the results
 * taken in turn so both show on the first page. It showed only Accords, with
 * "vs toyota camry" set aside.
 */
function searchTogether(query: SearchQuery, parts: string[]): SearchResults {
  const lists = parts.map(
    (part) => searchOne({ ...query, query: part, offset: 0, limit: 500 }).results,
  );
  const seen = new Set<string>();
  const merged: Car[] = [];
  for (let i = 0; lists.some((list) => i < list.length); i += 1) {
    for (const list of lists) {
      const car = list[i];
      if (car && !seen.has(car.id)) {
        seen.add(car.id);
        merged.push(car);
      }
    }
  }
  const limit = Math.min(Math.max(query.limit || 50, 1), 500);
  const offset = Math.max(query.offset || 0, 0);
  // One car per side for the compare page: each side's base configuration.
  const bases = parts.map(baseConfiguration);
  const compareWith = bases.every(Boolean)
    ? (bases as Car[]).map((car) => ({ id: car.id, label: carLabel(car) }))
    : undefined;
  return {
    results: merged.slice(offset, offset + limit),
    total: merged.length,
    hasMore: offset + limit < merged.length,
    interpretation: {
      compared: parts,
      ...(compareWith && new Set(compareWith.map((c) => c.id)).size > 1 ? { compareWith } : {}),
    },
  };
}

/**
 * Retry an empty text search without its last few free words, when what is
 * left still names a vehicle. EPA records no trim levels, so "toyota 4runner
 * trd pro", "honda civic ex" or "ford explorer limited" found nothing at all;
 * they now find the 4Runner, Civic or Explorer and say which words were set
 * aside. Years, body/fuel/drive words and price phrases are never dropped.
 */
function relaxTrailingWords(query: SearchQuery): SearchResults | null {
  const words = (query.query ?? '').trim().split(/\s+/).filter(Boolean);
  const droppable = words
    .map((word, index) => ({ word, index }))
    .filter(({ word }) => {
      const token = normalizeSearchToken(word.toLowerCase());
      return (
        !parseYearToken(token) &&
        !(token in BODY_WORDS) &&
        !(token in FUEL_WORDS) &&
        !(token in DRIVE_WORDS) &&
        !(token in ASPIRATION_WORDS) &&
        !PRICE_WORD.test(token) &&
        !/\d{2}/.test(token) &&
        extractQueryModifiers(token).text !== '' &&
        // "new camry" must not become "new" (the New Range Rover).
        !resolveMakeFromTokens([token]) &&
        !namesAModel(token)
      );
    });
  for (let count = 1; count <= 3 && count <= droppable.length; count += 1) {
    const dropped = droppable.slice(-count);
    const skip = new Set(dropped.map((d) => d.index));
    const text = words.filter((_, i) => !skip.has(i)).join(' ');
    const reading = enrichSearchQuery({ ...query, query: text });
    const namesVehicle =
      !reading.query && !!(reading.filters?.model?.length || reading.filters?.make?.length);
    if (!namesVehicle) continue;
    const retry = runSearch({ ...query, query: text });
    if (retry.total === 0) continue;
    return {
      ...retry,
      interpretation: { ...retry.interpretation, ignored: dropped.map((d) => d.word) },
    };
  }
  return null;
}

function runSearch(query: SearchQuery): SearchResults {
  const originalText = query.query?.trim() ?? '';
  const enriched = enrichSearchQuery(query);
  let candidates = getCandidateSet(enriched);

  // Single-pass filtering for criteria not already handled by index selection.
  // Typo tolerance only when the exact words find nothing: "gt500" matched the
  // Mercedes G500 (one edit away) alongside every Shelby GT500.
  const filtered = singlePassFilter(candidates, enriched, false);
  candidates =
    filtered.length || !enriched.query ? filtered : singlePassFilter(candidates, enriched, true);

  const sortField = enriched.sort?.field;
  const sortOrder = enriched.sort?.order ?? 'desc';
  const wantRelevance = !sortField || sortField === 'relevance';
  // "electric pickup" or "awd minivan" names no vehicle: every result matches
  // equally, and scoring the words against model names put a 1998 S10
  // Electric first. Newest first instead.
  const keywordsOnly =
    !enriched.query && !enriched.filters?.make?.length && !enriched.filters?.model?.length;

  // Always rank natural-language searches with the *original* query.
  // enrichSearchQuery may clear `query` after parsing make/model/year; using that
  // cleared value made "relevance" a no-op and left oldest EPA rows first.
  // Figures and prices go; words such as "sport sedan" stay, as they can be
  // part of a name (a Saab "9-3 Sport Sedan").
  if (wantRelevance && originalText && !keywordsOnly) {
    sortByRelevanceInPlace(
      candidates,
      extractPricePhrases(withoutFigures(originalText)).text,
      enriched.filterWords,
    );
  } else if (sortField && sortField !== 'relevance') {
    sortResultsInPlace(candidates, sortField, sortOrder);
  } else {
    // Stable default so one-per-model collapse keeps a recent, useful trim.
    sortResultsInPlace(candidates, 'year', 'desc');
  }

  if (enriched.collapseByModel === true) {
    // One row per make|family (e.g. a single Mazda 3). Year filters narrow the
    // pool first — "2024 mazda 3" still yields one best trim for that year.
    candidates = collapseCandidatesByModel(candidates, false);
  } else if (enriched.collapseByModel === false) {
    // Explicit opt-out: keep one row per make|family|year so years show without
    // every EPA trim. Omitting the flag leaves results uncollapsed.
    candidates = collapseCandidatesByModel(candidates, true);
  }

  const total = candidates.length;
  const limit = Math.min(Math.max(enriched.limit || 50, 1), 500);
  const offset = Math.max(enriched.offset || 0, 0);

  const results: SearchResults = {
    results: candidates.slice(offset, offset + limit),
    total,
    hasMore: offset + limit < total,
    ...(enriched.interpretation ? { interpretation: enriched.interpretation } : {}),
  };
  if (total === 0) {
    const covered = getStatistics().yearRange;
    const wanted = enriched.filters?.year;
    const before = wanted?.max != null && wanted.max < covered.min;
    const after = wanted?.min != null && wanted.min > covered.max;
    if (before || after) results.yearCoverage = { min: covered.min, max: covered.max };
  }
  return results;
}

/**
 * Keep the best car per shopper-facing model family after the caller’s sort.
 * "3 4-Door 2WD" and "3 5-Door 4WD" collapse together as Mazda 3.
 * "Civic Si" / "Civic 4Dr" collapse together as Civic.
 * When includeYear is true, keep one row per make|family|year (trim dedupe
 * while preserving year rows). Search uses includeYear=false so collapseByModel
 * means a true one-per-model collapse.
 */
function collapseCandidatesByModel(cars: Car[], includeYear = false): Car[] {
  const best = new Map<string, Car>();
  for (const car of cars) {
    const base = `${car.make}|${collapseModelKey(car.make, car.model)}`.toLowerCase();
    const key = includeYear ? `${base}|${car.year}` : base;
    if (!best.has(key)) best.set(key, car);
  }
  return Array.from(best.values());
}

/**
 * Names whose next words make another vehicle, by make. On the first word
 * alone "audi rs" showed one row for the RS 3, 5, 6, 7 and Q8, and "amg" one
 * for every AMG; the Grand Wagoneer sat under the Grand Cherokee, the Santa
 * Cruz under the Santa Fe, the Mach-E under the Mustang, the Bronco Sport under
 * the Bronco and the GR 86 under the GR Supra. `$n` takes a captured word.
 */
const SUBMODEL_KEYS: Record<string, Array<[RegExp, string]>> = {
  audi: [
    [/^(?:rs |s )?e-tron gt\b/, 'e-tron gt'],
    [/^rs ([\w-]+)/, 'rs $1'],
    // The electric A6, Q8 and their S models beside the petrol ones.
    [/^(s?[aq]\d) (?:sportback )?(?:\d\d )?e-tron\b/, '$1 e-tron'],
  ],
  // A series, not an engine: the 330i, M340i and 330e are one 3 Series.
  bmw: [
    [/^activehybrid ([357])/, '$1 series'],
    [/^i3s?\b/, 'i3'],
    [/^(activehybrid|alpina) (\w+)/, '$1 $2'],
    [/^m?([1-8])\d\d[a-z]*\b/, '$1 series'],
  ],
  // A class, not an engine: the E350 and E450 are one E-Class. AMG models
  // stand apart, "AMG C43" and "AMG C63" together with the badge-last "C63
  // AMG" before them, as do Maybachs (below).
  'mercedes-benz': [
    [/^amg (gt|[a-z]+)/, 'amg $1'],
    [/^([a-z]+)\d+ amg\b/, 'amg $1'],
    [/^([a-z]+)\d{2,3}[a-z]?\b/, '$1'],
  ],
  ford: [
    [/^(mustang mach-e|bronco sport|explorer sport(?: trac)?|taurus x|transit connect)\b/, '$1'],
  ],
  fiat: [[/^500 ?([lx])\b/, '500$1']],
  // EPA's 2003-09 "Carrera 2 Coupe", "Targa" and "Turbo 4 911" are 911s.
  porsche: [[/^(?:911|carrera [24]|targa|turbo)\b/, '911']],
  honda: [[/^accord crosstour\b/, 'accord crosstour']],
  jeep: [[/^(grand \w+|wagoneer s)\b/, '$1']],
  pontiac: [[/^(grand \w+)/, '$1']],
  hyundai: [[/^(santa \w+|ioniq \d|genesis coupe)\b/, '$1']],
  mitsubishi: [[/^(eclipse cross|outlander sport|montero sport)\b/, '$1']],
  nissan: [[/^rogue sport\b/, 'rogue sport']],
  toyota: [[/^(camry solara|corolla cross|corolla im|prius [cv]|gr [\w-]+)\b/, '$1']],
  vinfast: [[/^vf ?(\d)\b/, 'vf $1']],
  'land rover': [
    [/^discovery sport\b/, 'discovery sport'],
    // EPA's plain "Evoque" of 2020-21 is the Range Rover Evoque.
    [/^evoque\b/, 'range rover evoque'],
  ],
  volkswagen: [[/^atlas cross sport\b/, 'atlas cross sport']],
  buick: [[/^encore gx\b/, 'encore gx']],
  chevrolet: [[/^(blazer ev|equinox ev|silverado ev|bolt euv)\b/, '$1']],
  gmc: [[/^sierra ev\b/, 'sierra ev']],
  genesis: [[/^electrified (\w+)/, 'electrified $1']],
};

/** The model line a car belongs to, as "one per model" groups them: "honda|civic". */
export function modelLineKey(car: Pick<Car, 'make' | 'model'>): string {
  return `${car.make}|${collapseModelKey(car.make, car.model)}`.toLowerCase();
}

/** Stable one-per-model key from messy EPA model strings. */
function collapseModelKey(make: string, model: string): string {
  // EPA marks a new generation "New" (New Range Rover, New Wrangler Unlimited).
  const family = modelFamilyName(model).replace(/^new (?=\S)/, '');
  // An SUV sharing a sedan's name: the EQS and EQE SUVs.
  const suv = /\(suv\)/i.test(model) ? ' suv' : '';
  // From the whole name: the family of "S580 4matic Maybach" stops at "s580".
  if (make === 'Mercedes-Benz' && /\bmaybach\b/i.test(model)) {
    const rest = model
      .toLowerCase()
      .replace(/\bmaybach\b/, '')
      .trim();
    return `maybach ${/^[a-z]+/.exec(rest)?.[0] ?? ''}`.trim() + suv;
  }
  for (const [pattern, key] of SUBMODEL_KEYS[make.toLowerCase()] ?? []) {
    const m = pattern.exec(family);
    if (m) return key.replace(/\$(\d)/g, (_, i: string) => m[Number(i)]) + suv;
  }
  const parts = family.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'model') {
    return `${parts[0]} ${parts[1]}`;
  }
  // The Range Rover Sport, Evoque and Velar, not "Range Rover P530" apart from "Range Rover LWB".
  const rangeRover = /^range rover(?: (sport|evoque|velar)\b)?/.exec(family);
  if (rangeRover) return rangeRover[0] + suv;
  return (parts[0] || family) + suv;
}

export interface SearchSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  query: string;
}

const POPULAR_SUGGESTIONS: SearchSuggestion[] = [
  {
    id: 'pop-camry',
    label: `${LATEST_FULL_MODEL_YEAR} Toyota Camry`,
    sublabel: 'Sedan · EPA verified',
    query: `${LATEST_FULL_MODEL_YEAR} camry`,
  },
  { id: 'pop-civic', label: 'Honda Civic', sublabel: 'Compact · all years', query: 'honda civic' },
  { id: 'pop-f150', label: 'Ford F-150', sublabel: 'Truck · work & haul', query: 'ford f-150' },
  { id: 'pop-rav4', label: 'Toyota RAV4', sublabel: 'SUV · daily driver', query: 'toyota rav4' },
  { id: 'pop-model3', label: 'Tesla Model 3', sublabel: 'Electric', query: 'tesla model 3' },
  { id: 'pop-accord', label: 'Honda Accord', sublabel: 'Sedan · reliable', query: 'honda accord' },
];

/** Autocomplete suggestions for the search bar — includes typo-tolerant matches. */
/** "cars like a civ": the phrase before the name being typed, and the name. */
const RIVALS_PREFIX =
  /^((?:(?:cars?|vehicles?|suvs?|trucks?|sedans?|something|anything)\s+)?(?:(?:similar|comparable)\s+to|like|alternatives?\s+(?:to|for)|competitors?\s+(?:to|of|for)|rivals?\s+(?:to|of|for))\s+(?:(?:a|an|the)\s+)?)(.*)$/i;

export function getSearchSuggestions(rawQuery: string, limit = 8): SearchSuggestion[] {
  ensureDatabase();
  const qRaw = rawQuery.trim().toLowerCase();

  // "cars like a civ": complete the name, keeping the phrase, so the choice
  // opens the Civic's rivals rather than the Civic.
  const rivals = RIVALS_PREFIX.exec(qRaw);
  if (rivals && rivals[2].trim().length >= 2 && !/^new\b/.test(rivals[2])) {
    // One entry per model: the rivals of a Camry LE and a Camry XSE are the same.
    const models = new Map<string, string>();
    for (const s of getSearchSuggestions(rivals[2], limit * 3)) {
      const make = cachedMakes.find((m) => s.label.startsWith(`${m} `));
      if (!make || s.id.startsWith('raw-')) continue;
      const label = `${make} ${shopperModelName({ model: s.label.slice(make.length + 1) })}`;
      if (!models.has(label.toLowerCase())) models.set(label.toLowerCase(), label);
    }
    if (models.size) {
      return [...models.values()].slice(0, limit).map((label) => ({
        id: `rivals-${label.toLowerCase()}`,
        label: `Rivals of the ${label}`,
        sublabel: 'Cars shoppers compare it with',
        query: `${rivals[1].trim()} ${label.toLowerCase()}`,
      }));
    }
  }

  const q = normalizeSearchQuery(qRaw);
  if (!q) return POPULAR_SUGGESTIONS.slice(0, limit);

  type Ranked = SearchSuggestion & { score: number };
  const ranked: Ranked[] = [];
  const seen = new Set<string>();

  const add = (s: SearchSuggestion, score: number) => {
    // By label too: EPA's "Civic Type R" model and the derived Type R trim.
    const labelKey = `label:${s.label.toLowerCase()}`;
    if (seen.has(s.id) || seen.has(labelKey)) return;
    seen.add(s.id);
    seen.add(labelKey);
    ranked.push({ ...s, score });
  };

  // "3 series", "bmw 3 series", "c class": offer the lineup itself, since no
  // EPA model is called that.
  const lastToken = q.split(' ').at(-1) ?? '';
  const lineup = resolveLineup(lastToken, undefined);
  if (lineup && (q === lastToken || q === `${lineup.make.toLowerCase()} ${lastToken}`)) {
    add(
      {
        id: `lineup-${lastToken}`,
        label: `${lineup.make} ${lineup.label}`,
        sublabel: `Lineup · ${lineup.models.length} EPA model names`,
        query: `${lineup.make.toLowerCase()} ${lineup.label.toLowerCase()}`,
      },
      99,
    );
  }

  for (const make of cachedMakes) {
    const lower = make.toLowerCase();
    const dist = bestFuzzyScore(q, lower);
    if (dist <= 2 || lower.includes(q) || q.includes(lower)) {
      const score = dist <= 0.5 ? 100 - dist * 10 : 80 - dist * 15;
      if (score > 40) {
        add(
          {
            id: `make-${make}`,
            label: make,
            sublabel: dist > 0.5 ? `Did you mean ${make}?` : 'Manufacturer',
            query: make.toLowerCase(),
          },
          score,
        );
      }
    }
  }

  for (const [modelKey, cars] of modelIndex) {
    const car = cars[0];
    const label = `${car.make} ${car.model}`;
    const labelLower = label.toLowerCase();
    const modelLower = car.model.toLowerCase();
    const makePrefix = `${car.make.toLowerCase()} `;
    const phrase = q.startsWith(makePrefix) ? q.slice(makePrefix.length) : q;
    let score = -1;
    // Same hyphen/space-blind match the search uses: "f150" names both the
    // "F150 Pickup" and the "F-150 Lightning".
    if (modelLower === phrase) {
      // "Toyota Camry" searches every Camry, so it beats any one trim.
      score = 98;
    } else if (modelPhraseMatches(car.model, phrase)) {
      score = 95;
    } else if (modelKey.startsWith(q) || modelKey.includes(q) || labelLower.includes(q)) {
      score = modelKey.startsWith(q) ? 95 : 75;
    } else {
      const dModel = bestFuzzyScore(q, modelLower);
      const dLabel = bestFuzzyScore(q, labelLower);
      const d = Math.min(dModel, dLabel);
      if (d <= 2) score = 70 - d * 12;
    }
    if (score >= 40) {
      // Among equal matches, list models still on sale before long-gone ones.
      const latestYear = cars.reduce((latest, c) => Math.max(latest, c.year), 0);
      add(
        {
          id: `model-${car.make}-${car.model}`,
          label,
          sublabel: score < 70 ? `Close match · ${car.bodyStyle ?? 'Model'}` : 'Model',
          query: `${car.make.toLowerCase()} ${car.model.toLowerCase()}`,
        },
        score + Math.max(0, latestYear - 1990) * 0.05,
      );
    }
  }

  // Trims EPA leaves out of the name ("Ford Mustang GT", "Subaru WRX STI").
  for (const trim of trimSuggestions()) {
    const phrase = q.startsWith(`${trim.make.toLowerCase()} `) ? q.slice(trim.make.length + 1) : q;
    if (trim.query.startsWith(phrase) || trim.label.toLowerCase().startsWith(q)) {
      // An exact trim ("mustang gt") ranks with an exact model name, above the
      // Mustang GTD that merely starts the same.
      const score = trim.query === phrase ? 99 : 96;
      add(
        { id: `trim-${trim.label}`, label: trim.label, sublabel: 'Trim', query: trim.query },
        score,
      );
    }
  }

  // "hybrid s" → Hybrid SUVs: body-style and fuel phrases the search reads.
  if (q.length >= 3) {
    for (const phrase of KEYWORD_SUGGESTIONS) {
      if (phrase.query.startsWith(q) && phrase.query !== q) {
        add({ id: `kw-${phrase.query}`, ...phrase, sublabel: 'All makes and years' }, 90);
      }
    }
  }

  for (const p of POPULAR_SUGGESTIONS) {
    if (
      p.label.toLowerCase().includes(q) ||
      p.query.includes(q) ||
      bestFuzzyScore(q, p.query) <= 2
    ) {
      add(p, 60);
    }
  }

  ranked.sort((a, b) => b.score - a.score);

  const results: SearchSuggestion[] = ranked
    .slice(0, Math.max(0, limit - 1))
    .map(({ score: _s, ...s }) => s);
  results.push({
    id: `raw-${qRaw}`,
    label: `Search “${rawQuery.trim()}”`,
    sublabel: 'All makes, models & years',
    query: rawQuery.trim(),
  });

  return results.slice(0, limit);
}

const KEYWORD_SUGGESTIONS: Array<{ label: string; query: string }> = [
  { label: 'Hybrid SUVs', query: 'hybrid suv' },
  { label: 'Hybrid sedans', query: 'hybrid sedan' },
  { label: 'Hybrid minivans', query: 'hybrid minivan' },
  { label: 'Hybrid trucks', query: 'hybrid truck' },
  { label: 'Plug-in hybrid SUVs', query: 'plug-in suv' },
  { label: 'Electric SUVs', query: 'electric suv' },
  { label: 'Electric trucks', query: 'electric truck' },
  { label: 'Electric sedans', query: 'electric sedan' },
  { label: 'Diesel trucks', query: 'diesel truck' },
  { label: 'AWD sedans', query: 'awd sedan' },
  { label: 'Minivans', query: 'minivan' },
  { label: 'Convertibles', query: 'convertible' },
  { label: 'Hatchbacks', query: 'hatchback' },
  { label: 'Wagons', query: 'wagon' },
  // Phrases search-modifiers reads.
  { label: 'Third-row SUVs', query: 'third row suv' },
  { label: '3-row SUVs', query: '3 row suv' },
  { label: '7-seaters', query: '7 seater' },
  { label: 'Longest-range EVs', query: 'longest range ev' },
  { label: 'Most fuel-efficient cars', query: 'most fuel efficient' },
  { label: 'Most fuel-efficient SUVs', query: 'most fuel efficient suv' },
  { label: 'Manual transmission', query: 'manual transmission' },
  { label: 'Cheapest SUVs', query: 'cheapest suv' },
  { label: 'Cheapest sedans', query: 'cheapest sedan' },
  { label: 'Cheapest EVs', query: 'cheapest ev' },
  { label: 'Fastest cars', query: 'fastest car' },
  { label: 'V8 trucks', query: 'v8 truck' },
  { label: 'Compact SUVs', query: 'compact suv' },
  { label: 'Midsize SUVs', query: 'midsize suv' },
  { label: 'Full-size SUVs', query: 'full size suv' },
  { label: 'Compact cars', query: 'compact car' },
  { label: 'Midsize sedans', query: 'midsize sedan' },
  { label: 'Full-size trucks', query: 'full size truck' },
  { label: 'Midsize trucks', query: 'midsize truck' },
  { label: 'Sports cars', query: 'sports car' },
  { label: 'Muscle cars', query: 'muscle car' },
  { label: 'Supercars', query: 'supercar' },
  { label: 'Hot hatches', query: 'hot hatch' },
  { label: 'Luxury SUVs', query: 'luxury suv' },
  { label: 'Luxury sedans', query: 'luxury sedan' },
  { label: 'Off-road SUVs', query: 'off road suv' },
  { label: 'Family SUVs', query: 'family suv' },
  { label: 'Family cars', query: 'family car' },
  { label: 'Safest SUVs', query: 'safest suv' },
  { label: 'Safest minivans', query: 'safest minivan' },
  { label: 'SUVs with good gas mileage', query: 'suv good gas mileage' },
];

type TrimSuggestion = { make: string; label: string; query: string };
let trimSuggestionCache: { source: Car[]; list: TrimSuggestion[] } | null = null;

/** One suggestion per make, model family and derived trim, e.g. "Honda Civic Type R". */
function trimSuggestions(): TrimSuggestion[] {
  if (trimSuggestionCache?.source === cachedCars) return trimSuggestionCache.list;
  const byLabel = new Map<string, TrimSuggestion>();
  for (const car of cachedCars) {
    if (!car.variant) continue;
    // The model name up to its first config word: "Civic 5Dr" → Civic,
    // "Challenger SRT" → Challenger, "Impreza Wagon/Outback Sport AWD" → Impreza.
    const words = normalizeSearchQuery(car.model).split(' ');
    const cut = words.findIndex((w) => TRIM_FILLER.test(w));
    const family = car.model
      .split(/[\s/]+/)
      .slice(0, cut === -1 ? undefined : cut)
      .join(' ');
    if (!family) continue;
    const label = `${car.make} ${family} ${car.variant}`;
    if (!byLabel.has(label)) {
      byLabel.set(label, {
        make: car.make,
        label,
        query: normalizeSearchQuery(`${family} ${car.variant}`),
      });
    }
  }
  trimSuggestionCache = { source: cachedCars, list: [...byLabel.values()] };
  return trimSuggestionCache.list;
}

/**
 * Parse natural queries like "2024 camry", "mazda 3", or "toyota camry 2022"
 * into structured filters. User-provided filters always win — we only fill gaps.
 * Year prefixes: "20" → 2000–2099, "202" → 2020–2029; full years stay exact.
 */
/** Words that ask for the cheapest first, and the words price phrases use. */
const CHEAPEST_WORDS = /^(cheap|cheaper|cheapest|affordable|budget|inexpensive)$/;
const PRICE_WORD =
  /^(under|below|over|above|less|more|than|max|min|at|least|up|to|cheap|cheaper|cheapest|affordable|budget|inexpensive|\$.*|\d+k)$/;

/**
 * Read "under 30k", "below $25,000", "over 40 000", "less than 20k" and
 * "cheapest" out of a query. Amounts must carry a "k", a "$" or at least four
 * digits outside the model-year range, so "under 2015" or "civic 200" are not
 * prices. Returns the text with those phrases removed.
 */
function extractPricePhrases(raw: string): {
  text: string;
  min?: number;
  max?: number;
  cheapest: boolean;
} {
  let text = ` ${raw.toLowerCase()} `;
  // "under 20000 dollars", "under 25k cad": "dollars" was read as a name and
  // found nothing, "cad" as Cadillac. The word marks an amount as money.
  const CURRENCY = '(?:\\s*(dollars?|bucks|cad|canadian|usd))?';
  const amount = (num: string, suffix: string | undefined, dollar: string | undefined) => {
    const value = Number(num.replace(/[,\s]/g, '')) * (suffix ? 1000 : 1);
    const looksLikeYear = !suffix && !dollar && value >= 1950 && value <= 2035;
    return value >= 1000 && !looksLikeYear ? value : null;
  };
  const phrase = (words: string) =>
    new RegExp(
      `\\s(?:${words})\\s*(\\$)?\\s*(\\d{1,3}(?:[,\\s]\\d{3})+|\\d+(?:\\.\\d+)?)\\s*(k|thousand|grand)?${CURRENCY}(?=\\s)`,
    );
  let max: number | undefined;
  let min: number | undefined;
  // "between 20k and 30k", "20-30k", "$20,000 to $30,000": it found nothing.
  const number = '\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?';
  const range = new RegExp(
    `\\s(?:between\\s+|from\\s+)?(\\$)?\\s*(${number})\\s*(k|thousand|grand)?\\s*(?:-|–|to|and)\\s*(\\$)?\\s*(${number})\\s*(k|thousand|grand)?${CURRENCY}(?=\\s)`,
  ).exec(text);
  if (range) {
    // "20 to 30k": the second amount's "k" is the first's too.
    const lowSuffix = range[3] ?? (range[6] && Number(range[2]) < 1000 ? range[6] : undefined);
    const low = amount(range[2], lowSuffix, range[1] ?? range[4] ?? range[7]);
    const high = amount(range[5], range[6], range[4] ?? range[1] ?? range[7]);
    if (low != null && high != null && low < high) {
      min = low;
      max = high;
      text = text.replace(range[0], ' ');
    }
  }
  const maxHit =
    max == null
      ? phrase('under|below|less than|cheaper than|up to|max|maximum|<').exec(text)
      : null;
  if (maxHit) {
    const value = amount(maxHit[2], maxHit[3], maxHit[1] ?? maxHit[4]);
    if (value != null) {
      max = value;
      text = text.replace(maxHit[0], ' ');
    }
  }
  const minHit =
    min == null ? phrase('over|above|more than|at least|min|minimum|>').exec(text) : null;
  if (minHit) {
    const value = amount(minHit[2], minHit[3], minHit[1] ?? minHit[4]);
    if (value != null) {
      min = value;
      text = text.replace(minHit[0], ' ');
    }
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  const cheapest = words.some((w) => CHEAPEST_WORDS.test(w));
  return {
    text: words.filter((w) => !CHEAPEST_WORDS.test(w)).join(' '),
    ...(min != null ? { min } : {}),
    ...(max != null ? { max } : {}),
    cheapest,
  };
}

function enrichSearchQuery(query: SearchQuery): SearchQuery {
  const typed = query.query?.trim();
  if (!typed) return query;

  const filters = { ...(query.filters || {}) };
  const explicit = query.filters;
  // Before the modifiers: the "new" of "new edge mustang" is not the newest.
  const generation = query.ignoreYearWords ? null : readGeneration(typed, namesAVehicle);
  const modifiers = extractQueryModifiers(generation?.text ?? typed, {
    classes: !query.keepClassWords,
  });
  const price = extractPricePhrases(modifiers.text);
  const interpretation: NonNullable<SearchQuery['interpretation']> = {};
  if ((price.min != null || price.max != null) && !explicit?.price) {
    filters.price = { min: price.min, max: price.max };
    interpretation.price = { min: price.min, max: price.max };
  }
  // A year typed with a generation is narrower: "2003 e46 m3".
  if (generation && !explicit?.year && !modifiers.year) {
    filters.year = generation.year;
    interpretation.generation = generation.label;
  }
  if (modifiers.year && !explicit?.year && !query.ignoreYearWords) {
    filters.year = modifiers.year;
    if (modifiers.newest && modifiers.year.min != null && modifiers.year.max == null) {
      interpretation.newestFrom = modifiers.year.min;
    }
  }
  if (modifiers.transmission && !explicit?.transmission?.length) {
    filters.transmission = modifiers.transmission;
  }
  if (modifiers.cylinders && !explicit?.cylinders?.length) filters.cylinders = modifiers.cylinders;
  if (modifiers.layouts && !explicit?.layout?.length) {
    filters.layout = modifiers.layouts;
    interpretation.layouts = modifiers.layouts;
  }
  if (modifiers.engineFamily) {
    filters.engineFamily = modifiers.engineFamily;
    interpretation.engineFamily = ENGINE_FAMILIES[modifiers.engineFamily].label;
  }
  if (modifiers.firstCar) {
    // The First car preset's limits, where the query and filters set none.
    if (!filters.price) filters.price = { max: FIRST_CAR.maxPrice };
    if (!filters.fuelEconomy) filters.fuelEconomy = { min: FIRST_CAR.minMpg };
    if (!filters.year) filters.year = { min: FIRST_CAR.minYear };
    if (!filters.fuelType?.length) filters.fuelType = [...FIRST_CAR.fuelTypes];
    interpretation.firstCar = {
      maxPrice: FIRST_CAR.maxPrice,
      minMpg: FIRST_CAR.minMpg,
      minYear: FIRST_CAR.minYear,
    };
  }
  if (modifiers.automatedManual) {
    filters.automatedManual = true;
    interpretation.automatedManual = true;
  }
  if (modifiers.mildHybrid) {
    filters.mildHybrid = true;
    interpretation.mildHybrid = true;
  }
  if (modifiers.snow && !explicit?.driveType?.length) {
    filters.driveType = ['AWD', '4WD'];
    interpretation.snow = true;
  }
  if (modifiers.threeRow) {
    filters.threeRow = true;
    interpretation.threeRow = true;
  }
  if (modifiers.twoRow && filters.threeRow == null) {
    filters.threeRow = false;
    interpretation.twoRow = true;
  }
  if (modifiers.twoSeater) {
    filters.twoSeater = true;
    interpretation.twoSeater = true;
  }
  if (modifiers.enginePosition && !explicit?.enginePosition) {
    filters.enginePosition = modifiers.enginePosition;
    interpretation.enginePosition = modifiers.enginePosition;
  }
  if (modifiers.fuelEconomy && !explicit?.fuelEconomy) {
    const { min, max, unit, basis } = modifiers.fuelEconomy;
    // L/100 km falls as MPG rises: a ceiling in litres is a floor in MPG. The
    // conversion is its own inverse.
    const mpg = (litres: number) => Math.round(mpgToLPer100Km(litres) * 100) / 100;
    filters.fuelEconomy =
      unit === 'L/100 km'
        ? {
            ...(max != null ? { min: mpg(max) } : {}),
            ...(min != null ? { max: mpg(min) } : {}),
            ...(basis ? { basis } : {}),
          }
        : { min, max, ...(basis ? { basis } : {}) };
    interpretation.fuelEconomy = modifiers.fuelEconomy;
  }
  if (modifiers.engineSize != null && !explicit?.displacement) {
    const litres = modifiers.engineSize;
    filters.displacement = { min: litres - 0.05, max: litres + 0.05 };
    interpretation.engineSize = litres;
  }
  if (modifiers.horsepower && !explicit?.horsepower) {
    filters.horsepower = modifiers.horsepower;
    interpretation.horsepower = modifiers.horsepower;
  }
  if (modifiers.minRangeMiles != null && !explicit?.rangeMiles) {
    filters.rangeMiles = { min: modifiers.minRangeMiles };
    interpretation.minRangeMiles = modifiers.minRangeMiles;
  }
  if (modifiers.unmeasured?.length) interpretation.unmeasured = modifiers.unmeasured;
  if (modifiers.vehicleClass) {
    const { sets, segments, luxury, drive, label } = modifiers.vehicleClass;
    if (sets?.length) filters.classes = sets;
    if (segments?.length) filters.segments = segments;
    if (luxury) filters.luxury = true;
    if (drive?.length && !explicit?.driveType?.length) filters.driveType = drive;
    interpretation.vehicleClass = label;
  }
  let sort = query.sort;
  const sortedBy =
    price.cheapest || (modifiers.firstCar && !modifiers.sortedBy) ? 'price' : modifiers.sortedBy;
  if (sortedBy && (!sort || sort.field === 'relevance')) {
    sort = {
      field: sortedBy,
      order: sortedBy === 'price' || sortedBy === 'runningCost' ? 'asc' : 'desc',
    };
    interpretation.sortedBy = sortedBy;
  }
  const withInterpretation = (q: SearchQuery): SearchQuery =>
    Object.keys(interpretation).length ? { ...q, sort, interpretation } : { ...q, sort };
  // "Cheapest" over every year on file is a list of 30-year-old Accents: keep
  // to the last ten model years unless the query gives years.
  const keepRecentWhenCheapest = () => {
    const cheapest =
      interpretation.sortedBy === 'price' || interpretation.sortedBy === 'runningCost';
    // Hydrogen and natural-gas cars sell for little because there is almost
    // nowhere in Canada to fill them: a Tucson Fuel Cell led "cheap suv", and
    // a lease-only FCX Clarity sat among "honda under 10 grand".
    const rareFuelsOut = cheapest || interpretation.price?.max != null;
    // "good gas mileage" is an MPG order: EVs, rated in MPGe, led it. So is
    // "over 30 mpg" or "under 7 l/100km": every EV's MPGe clears it.
    const countsFuel =
      (modifiers.gasMileage && interpretation.sortedBy === 'fuelEconomy') ||
      (modifiers.fuelEconomy != null && modifiers.fuelEconomy.unit !== 'MPGe');
    // A fuel word in the query ("hybrid", "electric") keeps its own filter.
    if ((rareFuelsOut || countsFuel) && !filters.fuelType?.length) {
      filters.fuelType = (
        ['gasoline', 'diesel', 'hybrid', 'plug-in hybrid', 'electric', 'natural gas'] as const
      ).filter(
        (fuel) => !(rareFuelsOut && fuel === 'natural gas') && !(countsFuel && fuel === 'electric'),
      );
      if (rareFuelsOut) interpretation.rareFuelsLeftOut = true;
      if (countsFuel) interpretation.gasMileage = true;
    }
    // "Cheapest to run" too: a 30-year-old car's insurance and upkeep are capped.
    if (cheapest && !filters.year) {
      filters.year = { min: LATEST_FULL_MODEL_YEAR - 10 };
      interpretation.recentFrom = LATEST_FULL_MODEL_YEAR - 10;
    }
  };
  // Doors, where the body says or the name does: EPA records none. Beside a
  // truck, SUV or van word the count is set aside rather than emptying the
  // search ("4 door truck"). After the body words are read.
  const applyDoors = () => {
    if (modifiers.doors == null) return;
    const bodies = filters.bodyStyle ?? [];
    // SUVs are counted (two doors or four); a pickup's or van's doors are not.
    const counted = (body: string) =>
      DOORS_BY_BODY[body] != null || (body === 'suv' && modifiers.doors! <= 4);
    if (bodies.length && !bodies.some(counted)) {
      interpretation.unmeasured = [...(interpretation.unmeasured ?? []), `${modifiers.doors}-door`];
    } else {
      filters.doors = modifiers.doors;
      interpretation.doors = modifiers.doors;
    }
  };
  const raw = price.text;
  if (!raw) {
    // "cheap reliable car" leaves no words, and listed 1995 Mirages.
    applyDoors();
    keepRecentWhenCheapest();
    return withInterpretation({ ...query, query: undefined, filters });
  }

  const tokens = expandGluedMakeTokens(normalizeSearchQuery(raw).split(/\s+/).filter(Boolean));
  const textTokens: string[] = [];

  for (const token of tokens) {
    const yearRange = parseYearToken(token);
    if (yearRange && query.ignoreYearWords) continue;
    if (yearRange && filters.year?.min == null && filters.year?.max == null) {
      filters.year = yearRange;
    } else {
      textTokens.push(token);
    }
  }

  // A trailing trim comes off before the make is looked for: "STI" and "SRT"
  // are also (tiny) EPA makes, and claimed "wrx sti" and "grand cherokee srt".
  let trimForms: readonly string[] | undefined;
  if (!filters.make?.length && !filters.model?.length && textTokens.length > 1) {
    const trim = matchTrimQueryWithMake(textTokens);
    if (trim) {
      filters.model = trim.models;
      if (trim.makes.length === 1) filters.make = trim.makes;
      trimForms = trim.forms;
      textTokens.length = 0;
    }
  }

  if (!filters.make?.length && !explicit?.model?.length && textTokens.length > 0) {
    const makeHit = resolveMakeFromTokens(textTokens);
    if (makeHit) {
      filters.make = [makeHit.make];
      textTokens.splice(makeHit.index, makeHit.consumed);
    }
  }

  // Nothing but body, fuel, drive or induction words: "truck" means pickups,
  // not the 1990s models EPA calls "Truck 2WD".
  const isKeyword = (t: string) =>
    !!(BODY_WORDS[t] || FUEL_WORDS[t] || DRIVE_WORDS[t] || ASPIRATION_WORDS[t]);
  const filterWords: string[] = [...(generation?.words ?? [])];
  const readKeywords = () => {
    const kept = applyKeywordFilters(textTokens, filters, query.filters);
    filterWords.push(...textTokens.filter((t) => !kept.includes(t)));
    return kept;
  };
  if (!filters.model?.length && textTokens.length > 0 && textTokens.every(isKeyword)) {
    const kept = readKeywords();
    textTokens.splice(0, textTokens.length, ...kept);
  }

  if (!filters.model?.length && textTokens.length === 1) {
    const lineup = resolveLineup(textTokens[0], filters.make);
    if (lineup) {
      filters.make = [lineup.make];
      filters.model = lineup.models;
      textTokens.length = 0;
    }
  }

  // "mustang gt", "civic type r", "subaru sti": a trim EPA may leave out of the
  // model name (see performance-trims.ts), matched on model name + variant.
  if (!filters.model?.length && textTokens.length > 0) {
    const trim = matchTrimQuery(textTokens, filters.make);
    if (trim) {
      filters.model = trim.models;
      if (!filters.make?.length && trim.makes.length === 1) filters.make = trim.makes;
      trimForms = trim.forms;
      textTokens.length = 0;
    }
  }

  if (!filters.model?.length && textTokens.length > 0) {
    const modelPhrase = textTokens.join(' ').toLowerCase();

    if (filters.make?.length === 1) {
      const matched = resolveModelsForPhrase(filters.make[0], modelPhrase);
      if (matched.length) {
        filters.model = matched;
        textTokens.length = 0;
      }
    }

    if (!filters.model?.length) {
      const matched = resolveModelsAcrossMakes(modelPhrase);
      if (matched.models.length) {
        filters.model = matched.models;
        if (!filters.make?.length && matched.makes.length === 1) {
          filters.make = matched.makes;
        }
        textTokens.length = 0;
      }
    }
  }

  // Body-style, fuel and drive words ("hybrid suv", "mazda 3 hatchback",
  // "awd sedan") once the phrase is not a model name: "RAV4 Hybrid" and
  // "Bolt EV" resolved above and never get here.
  if (!filters.model?.length && textTokens.length > 0) {
    const kept = readKeywords();
    if (kept.length < textTokens.length) {
      textTokens.splice(0, textTokens.length, ...kept);
      if (kept.length > 0) {
        const phrase = kept.join(' ');
        const models =
          filters.make?.length === 1
            ? resolveModelsForPhrase(filters.make[0], phrase)
            : resolveModelsAcrossMakes(phrase).models;
        if (models.length) {
          filters.model = models;
          textTokens.length = 0;
        }
      }
    }
  }

  const remainingQuery = textTokens.join(' ').trim() || undefined;

  applyDoors();
  keepRecentWhenCheapest();

  return withInterpretation({
    ...query,
    query: remainingQuery,
    filters,
    ...(trimForms ? { trimForms } : {}),
    ...(filterWords.length ? { filterWords } : {}),
  });
}

/**
 * Electric cars sold as sports cars. Their segment is "ev", so "electric
 * sports car" found none and listed Audi "Sportback" SUVs by name instead.
 */
const ELECTRIC_SPORTS_CARS =
  /^(?:porsche taycan|audi (?:rs |s )?e-tron gt|tesla model s plaid|tesla roadster|lucid air sapphire|bmw i[45] m[56]0|mercedes-benz amg eq[es]\b(?!.*\(suv\)))/i;

function isElectricSportsCar(car: Car): boolean {
  return (
    car.engine.fuelType === 'electric' &&
    ELECTRIC_SPORTS_CARS.test(`${car.make} ${car.model}`) &&
    !['suv', 'truck', 'van', 'minivan'].includes(car.bodyStyle)
  );
}

/** Doors by body style, where the body tells: a coupe has two, a sedan four. */
const DOORS_BY_BODY: Partial<Record<string, number>> = {
  coupe: 2,
  convertible: 2,
  sedan: 4,
  wagon: 5,
};
const DOOR_NAME = /\b([2-5])[- ]?(?:dr|doors?)\b|\b(two|three|four|five)[- ]doors?\b/i;
const DOOR_COUNT_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5 };

/**
 * SUVs with two doors that their names do not count: the Wrangler before
 * "Unlimited" and "4dr", the Explorer Sport, Defender 90, Amigo, Rodeo Sport,
 * X-90, soft-top Trackers and the Evoque and Murano with a folding roof.
 */
const TWO_DOOR_SUV =
  /^(?:jeep (?:new )?wrangler(?!.*\b(?:unlimited|4dr)\b)|ford explorer sport\b(?! trac)|land rover defender 90\b|land rover range rover evoque (?:coupe|convertible)|isuzu (?:amigo|rodeo sport)\b|suzuki x-90\b|nissan murano crosscabriolet|(?:chevrolet|geo) tracker\b.*\bconvertible\b)/;

/**
 * A car's doors: from its name ("Wrangler 2dr", "Civic 5Dr", "Cooper (5-doors)"),
 * else from its body; an SUV has four unless it is one of the two-doors above.
 * Undefined for a hatchback, truck or van not named.
 */
function doorCount(car: Car): number | undefined {
  const named = DOOR_NAME.exec(car.model);
  if (named) return named[1] ? Number(named[1]) : DOOR_COUNT_WORDS[named[2].toLowerCase()];
  if (car.bodyStyle === 'suv') {
    return TWO_DOOR_SUV.test(`${car.make} ${car.model}`.toLowerCase()) ? 2 : 4;
  }
  return DOORS_BY_BODY[car.bodyStyle];
}

const trimLabels = new WeakMap<Car, string>();

/** Model name plus derived variant, normalized like a query ("charger r t"). */
function trimLabel(car: Car): string {
  let label = trimLabels.get(car);
  if (label === undefined) {
    label = ` ${normalizeSearchQuery(`${car.model} ${car.variant ?? ''}`)} `;
    trimLabels.set(car, label);
  }
  return label;
}

const hasWords = (label: string, words: string) => label.includes(` ${words} `);

/** Words that may sit between a model and its trim: "Civic 5Dr Type R", "Charger AWD R/T". */
const TRIM_FILLER =
  /^(\d?dr|[245]wd|awd|fwd|rwd|4x4|coupe|convertible|sedan|hatchback|wagon|door|doors|\d|ffv|srt8?|widebody|outback|spt|sport)$/;

/** The trim directly follows the base name, give or take filler words. */
function trimFollowsBase(label: string, base: string, forms: readonly string[]): boolean {
  const words = label.trim().split(' ');
  const baseWords = base.split(' ');
  for (let i = 0; i + baseWords.length <= words.length; i += 1) {
    if (!baseWords.every((w, k) => words[i + k] === w)) continue;
    for (let j = i + baseWords.length; j < words.length; j += 1) {
      if (forms.some((f) => f.split(' ').every((w, k) => words[j + k] === w))) return true;
      if (!TRIM_FILLER.test(words[j])) break;
    }
  }
  return false;
}

/** Trim names shared by too many vehicles to search on their own. */
const GENERIC_TRIMS = new Set(['gt', 'ss', 'si', 'rt', 'r t', 'sti', 'srt', 'ecoboost', 'n line']);

function matchTrimQuery(
  tokens: string[],
  makes: string[] | undefined,
): { models: string[]; makes: string[]; forms: readonly string[] } | null {
  const phrase = tokens.join(' ');
  const makeSet = makes?.length ? new Set(makes.map((m) => m.toLowerCase())) : null;
  for (const forms of TRIM_QUERY_FORMS) {
    for (const form of forms) {
      if (phrase !== form && !phrase.endsWith(` ${form}`)) continue;
      const base = phrase.slice(0, phrase.length - form.length).trim();
      // A bare "gt" or "ss" names no vehicle; a bare "gt500" or "hellcat" does,
      // and EPA files the 2007-14 Shelby GT500 as a plain "Mustang".
      if (!base && !makeSet && GENERIC_TRIMS.has(form)) continue;
      // Prefer the trim right after the model ("Mustang" + GT) over one that
      // merely appears in the name ("Mustang Mach-E GT").
      const strict = { models: new Set<string>(), makes: new Set<string>() };
      const loose = { models: new Set<string>(), makes: new Set<string>() };
      for (const car of cachedCars) {
        if (makeSet && !makeSet.has(car.make.toLowerCase())) continue;
        const label = trimLabel(car);
        if (base && !hasWords(label, base)) continue;
        if (!forms.some((f) => hasWords(label, f))) continue;
        const bucket = !base || trimFollowsBase(label, base, forms) ? strict : loose;
        bucket.models.add(car.model);
        bucket.makes.add(car.make);
      }
      const hit = strict.models.size ? strict : loose;
      if (hit.models.size) return { models: [...hit.models], makes: [...hit.makes], forms };
    }
  }
  return null;
}

/** matchTrimQuery on a query that may also name the make ("subaru wrx sti"). */
function matchTrimQueryWithMake(
  tokens: string[],
): { models: string[]; makes: string[]; forms: readonly string[] } | null {
  const phrase = tokens.join(' ');
  for (const forms of TRIM_QUERY_FORMS) {
    for (const form of forms) {
      if (!phrase.endsWith(` ${form}`)) continue;
      const base = phrase
        .slice(0, phrase.length - form.length)
        .trim()
        .split(' ');
      const makeHit = resolveMakeFromTokens(base);
      if (makeHit) base.splice(makeHit.index, makeHit.consumed);
      const hit = matchTrimQuery([...base, form], makeHit ? [makeHit.make] : undefined);
      if (hit) return hit;
    }
  }
  return null;
}

const BODY_WORDS: Record<string, string> = {
  suv: 'suv',
  suvs: 'suv',
  crossover: 'suv',
  crossovers: 'suv',
  truck: 'truck',
  trucks: 'truck',
  pickup: 'truck',
  pickups: 'truck',
  sedan: 'sedan',
  sedans: 'sedan',
  coupe: 'coupe',
  coupes: 'coupe',
  hatchback: 'hatchback',
  hatchbacks: 'hatchback',
  hatch: 'hatchback',
  wagon: 'wagon',
  wagons: 'wagon',
  minivan: 'minivan',
  minivans: 'minivan',
  van: 'van',
  vans: 'van',
  convertible: 'convertible',
  convertibles: 'convertible',
  cabriolet: 'convertible',
  roadster: 'convertible',
};

const FUEL_WORDS: Record<string, string[]> = {
  hybrid: ['hybrid', 'plug-in hybrid'],
  hybrids: ['hybrid', 'plug-in hybrid'],
  phev: ['plug-in hybrid'],
  'plug-in': ['plug-in hybrid'],
  plugin: ['plug-in hybrid'],
  ev: ['electric'],
  evs: ['electric'],
  electric: ['electric'],
  bev: ['electric'],
  diesel: ['diesel'],
  hydrogen: ['hydrogen'],
  fcev: ['hydrogen'],
  // "cheapest gas car to own" read "gas" as a name and found nothing.
  gas: ['gasoline'],
  gasoline: ['gasoline'],
  petrol: ['gasoline'],
  cng: ['natural gas'],
};

const ASPIRATION_WORDS: Record<string, string[]> = {
  turbo: ['turbocharged', 'turbocharged and supercharged'],
  turbocharged: ['turbocharged', 'turbocharged and supercharged'],
  'twin-turbo': ['turbocharged', 'turbocharged and supercharged'],
  supercharged: ['supercharged', 'turbocharged and supercharged'],
};

const DRIVE_WORDS: Record<string, string[]> = {
  awd: ['AWD', '4WD'],
  '4wd': ['4WD', 'AWD'],
  '4x4': ['4WD', 'AWD'],
  fwd: ['FWD'],
  rwd: ['RWD'],
  '2wd': ['FWD', 'RWD'],
};

/**
 * Move body-style, fuel and drive words into filters, unless the caller set
 * that filter explicitly. Returns the tokens left over.
 */
function applyKeywordFilters(
  tokens: string[],
  filters: NonNullable<SearchQuery['filters']>,
  explicit: SearchQuery['filters'],
): string[] {
  const bodies = new Set<string>();
  const fuels = new Set<string>();
  const drives = new Set<string>();
  const aspirations = new Set<string>();
  const kept: string[] = [];
  // A word whose filter is already set explicitly is consumed all the same:
  // left as text, "truck" beside a body filter had to appear in the model
  // name, and a Browse preset's "full size truck" found only 1990s "Truck"s.
  for (const token of tokens) {
    if (BODY_WORDS[token]) {
      if (!explicit?.bodyStyle?.length) bodies.add(BODY_WORDS[token]);
    } else if (FUEL_WORDS[token]) {
      if (!explicit?.fuelType?.length) for (const f of FUEL_WORDS[token]) fuels.add(f);
    } else if (DRIVE_WORDS[token]) {
      if (!explicit?.driveType?.length) for (const d of DRIVE_WORDS[token]) drives.add(d);
    } else if (ASPIRATION_WORDS[token]) {
      if (!explicit?.aspiration?.length)
        for (const a of ASPIRATION_WORDS[token]) aspirations.add(a);
    } else kept.push(token);
  }
  if (bodies.size) filters.bodyStyle = [...bodies];
  if (fuels.size) filters.fuelType = [...fuels];
  if (drives.size) filters.driveType = [...drives];
  if (aspirations.size) filters.aspiration = [...aspirations];
  return kept;
}

/**
 * Full years (2022) → exact min=max.
 * Decade prefixes of length 3 under 19xx/20xx (202 → 2020–2029).
 * Century prefixes of length 2: only "19" → 1900–1999 and "20" → 2000–2099.
 */
function parseYearToken(token: string): { min: number; max: number } | null {
  if (/^(19|20)\d{2}$/.test(token)) {
    const year = parseInt(token, 10);
    return { min: year, max: year };
  }
  if (/^(19|20)\d$/.test(token)) {
    const decade = parseInt(token, 10);
    return { min: decade * 10, max: decade * 10 + 9 };
  }
  if (token === '19' || token === '20') {
    const century = parseInt(token, 10);
    return { min: century * 100, max: century * 100 + 99 };
  }
  return null;
}

/** Split tokens like "mazda3" when aliasing missed them. */
function expandGluedMakeTokens(tokens: string[]): string[] {
  const makes = [...cachedMakes].sort((a, b) => b.length - a.length);
  const out: string[] = [];

  for (const token of tokens) {
    let split = false;
    // "minivan" is not MINI + "van", nor "ramcharger" Ram + "charger": split
    // only a keyword-free token whose remainder is one of the make's models.
    const isKeyword = !!(BODY_WORDS[token] || FUEL_WORDS[token] || DRIVE_WORDS[token]);
    const compactToken = token.replace(/[\s-]/g, '');
    for (const make of isKeyword ? [] : makes) {
      const compactMake = make.toLowerCase().replace(/[\s-]/g, '');
      if (compactToken.startsWith(compactMake) && compactToken.length > compactMake.length) {
        const rest = normalizeSearchToken(compactToken.slice(compactMake.length));
        if (/^[a-z0-9]/i.test(rest) && resolveModelsForPhrase(make, rest).length > 0) {
          out.push(make.toLowerCase(), rest);
          split = true;
          break;
        }
      }
    }
    if (!split) out.push(token);
  }

  return out.join(' ').split(/\s+/).filter(Boolean);
}

function resolveMakeFromTokens(
  tokens: string[],
): { make: string; index: number; consumed: number } | null {
  // 1) Exact single-token make first so "mazda 3" keeps "3" as the model.
  for (let i = 0; i < tokens.length; i++) {
    const hit = findExactMake(tokens[i]);
    if (hit) return { make: hit, index: i, consumed: 1 };
  }

  // 2) Exact multi-word makes before prefix matching ("land rover")
  for (let i = 0; i < tokens.length - 1; i++) {
    const two = `${tokens[i]} ${tokens[i + 1]}`;
    const hit = findExactMake(two);
    if (hit) return { make: hit, index: i, consumed: 2 };
  }

  // 3) Unique prefix single token ("chev" → Chevrolet) — not used for multi-word.
  // Neither a prefix nor a typo when the word is a model's name: "beetle" is
  // two edits from "bentley", and searched every Bentley instead of Beetles.
  for (let i = 0; i < tokens.length; i++) {
    if (namesAModel(tokens[i])) continue;
    const hit = findPrefixMake(tokens[i]);
    if (hit) return { make: hit, index: i, consumed: 1 };
  }

  // 4) Fuzzy single token for typos: "toyata" → Toyota
  for (let i = 0; i < tokens.length; i++) {
    if (namesAModel(tokens[i])) continue;
    const hit = findFuzzyMake(tokens[i]);
    if (hit) return { make: hit, index: i, consumed: 1 };
  }

  return null;
}

const modelWordCache = new Map<string, boolean>();

/** Whether a word is a whole model name ("beetle", "camry"), not a prefix of one ("land"). */
/** Words that name a make or a model: "mercedes", "amg", "civic". */
function namesAVehicle(words: string): boolean {
  const tokens = normalizeSearchQuery(words).split(/\s+/).filter(Boolean);
  return !!resolveMakeFromTokens(tokens) || tokens.some(namesAModel);
}

function namesAModel(token: string): boolean {
  const word = token.toLowerCase();
  let hit = modelWordCache.get(word);
  if (hit === undefined) {
    hit = false;
    for (const [key, cars] of modelIndex) {
      if (key === word || (cars.length && modelFamilyName(cars[0].model) === word)) {
        hit = true;
        break;
      }
    }
    modelWordCache.set(word, hit);
  }
  return hit;
}

function findExactMake(label: string): string | null {
  const lower = label.toLowerCase();
  return cachedMakes.find((m) => m.toLowerCase() === lower) ?? null;
}

function findPrefixMake(label: string): string | null {
  const lower = label.toLowerCase();
  if (lower.length < 3 || /\s/.test(lower)) return null;
  const prefixMakes = cachedMakes.filter((m) => m.toLowerCase().startsWith(lower));
  return prefixMakes.length === 1 ? prefixMakes[0] : null;
}

function findFuzzyMake(label: string): string | null {
  const lower = label.toLowerCase();
  // Multi-word labels like "mazda 3" are within edit distance of "mazda"
  // and would steal the model token if allowed here.
  if (!lower || /\s/.test(lower)) return null;
  // A typo of a whole word of the make ("toyata", "rovr"), never a fragment
  // of one: "gle" sits inside "eagle" but means the Mercedes GLE, and used to
  // filter every search for it down to Eagles.
  const maxEdits = maxEditsForToken(lower);
  const fuzzyMakes = cachedMakes.filter((m) =>
    m
      .toLowerCase()
      .split(/[\s-]+/)
      .some((word) => editDistance(word, lower, maxEdits) <= maxEdits),
  );
  return fuzzyMakes.length === 1 ? fuzzyMakes[0] : null;
}

/** The models a lineup token ("3-series", "c-class") stands for, if any. */
function resolveLineup(
  token: string,
  makes: string[] | undefined,
): { make: string; label: string; models: string[] } | null {
  const lineup = lineupForToken(token);
  if (!lineup) return null;
  if (makes?.length && !makes.some((m) => m.toLowerCase() === lineup.make.toLowerCase())) {
    return null;
  }
  const models = getModelsByMake(lineup.make).filter((m) => lineup.pattern.test(m));
  return models.length ? { make: lineup.make, label: lineup.label, models } : null;
}

/** All EPA model strings for a make that shoppers mean by `phrase` (e.g. "3"). */
function resolveModelsForPhrase(make: string, phrase: string): string[] {
  const models = getModelsByMake(make);
  const matched = models.filter((m) => modelPhraseMatches(m, phrase));
  if (matched.length) {
    // With the names that put words between the model and the trim typed after
    // it: "911 gts" found only the 2011-12 "911 GTS". A phrase no name begins
    // with is left to the word search below, which finds these anyway.
    const spread = models.filter((m) => !matched.includes(m) && modelWordsInOrder(m, phrase));
    return [...matched, ...spread];
  }

  // Unique fuzzy fallback for mild typos ("civc" → Civic)
  const fuzzy = models.filter((m) => fuzzyTokenMatch(modelFamilyName(m), phrase));
  return fuzzy.length === 1 ? fuzzy : [];
}

function resolveModelsAcrossMakes(phrase: string): { models: string[]; makes: string[] } {
  const models = new Set<string>();
  const makes = new Set<string>();

  for (const [modelKey, cars] of modelIndex) {
    if (!cars.length) continue;
    if (!modelPhraseMatches(cars[0].model, phrase) && !modelKey.startsWith(phrase)) {
      continue;
    }
    // Avoid ultra-short phrases matching huge prefixes ("3" → every "3..." globally).
    // A name's first word still counts: BMW files the iX as "iX xDrive50 (21
    // inch Wheels)", so "ix" fell through to a substring search (Matrix).
    if (
      phrase.length <= 2 &&
      modelFamilyName(cars[0].model) !== phrase &&
      cars[0].model.toLowerCase().split(/\s+/)[0] !== phrase
    ) {
      continue;
    }
    models.add(cars[0].model);
    // Every make under the name: EPA filed the 2013-14 Viper under "SRT", and
    // counting only the first car's make narrowed "viper" to Dodge.
    for (const car of cars) makes.add(car.make);
  }

  // If the phrase only matched one family name, expand to every EPA variant.
  // A prefix-only match ("gle" → GLE350, GLE450…) has no family to expand, so
  // keep what matched rather than falling back to a substring search that
  // also finds "wran-gle-r".
  if (models.size > 0 && makes.size === 1) {
    const make = Array.from(makes)[0];
    const expanded = resolveModelsForPhrase(make, phrase);
    return { models: expanded.length ? expanded : Array.from(models), makes: [make] };
  }

  return {
    models: Array.from(models),
    makes: Array.from(makes),
  };
}

function sortByRelevanceInPlace(
  cars: Car[],
  searchText: string,
  filterWords: readonly string[] = [],
): void {
  const normalized = normalizeSearchQuery(searchText);
  // A body or fuel word read as a filter is on every result: in a name it put
  // a 2004 "C320 4matic Sedan" first for "mercedes sedan".
  const tokens = normalized.split(/\s+/).filter((t) => t && !filterWords.includes(t));
  if (tokens.length === 0) {
    cars.sort((a, b) => b.year - a.year);
    return;
  }

  cars.sort((a, b) => {
    const scoreDiff = scoreRelevance(b, tokens) - scoreRelevance(a, tokens);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.year !== b.year) return b.year - a.year;
    // Of equals, the plainer name: "2004 camry" showed the Camry Solara
    // convertible for the year, as it came first.
    return unaskedNameWords(a, tokens) - unaskedNameWords(b, tokens);
  });
}

/** Words of a car's model family the query did not ask for. */
function unaskedNameWords(car: Car, tokens: string[]): number {
  return modelFamilyName(car.model)
    .split(/\s+/)
    .filter((word) => word && !tokens.some((t) => word === t || word.startsWith(t))).length;
}

function scoreRelevance(car: Car, tokens: string[]): number {
  let score = 0;
  const makeLower = car.make.toLowerCase();
  const modelLower = car.model.toLowerCase();
  const family = modelFamilyName(car.model);
  const variantWords = (car.variant ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const haystack =
    `${makeLower} ${modelLower} ${car.year} ${car.trim ?? ''} ${car.variant ?? ''}`.toLowerCase();

  for (const token of tokens) {
    const yearRange = parseYearToken(token);
    if (yearRange) {
      if (car.year >= yearRange.min && car.year <= yearRange.max) {
        // Exact year outranks a decade-prefix hit; both beat near-miss years.
        score += yearRange.min === yearRange.max ? 60 : 50;
      } else if (yearRange.min === yearRange.max && Math.abs(car.year - yearRange.min) === 1) {
        score += 15;
      }
      continue;
    }

    if (makeLower === token) score += 50;
    else if (makeLower.startsWith(token)) score += 35;
    // "camry" names the "Camry HEV …" family as much as the plain "Camry":
    // scoring them alike lets the newest year lead (the Camry is hybrid-only
    // since 2025, so the plain name stops at 2024).
    else if (family === token || modelLower === token || modelPhraseMatches(car.model, token))
      score += 48;
    // A word of the model name ("gti" in "Golf GTI") beats a hit only in the
    // trim: EPA files the Golf R under a "golf-gti" base model.
    else if (modelLower.split(/[\s-]+/).includes(token) || variantWords.includes(token)) {
      // A whole word of the name counts like its first word once it is long
      // enough to mean something: "lightning" is the F-150 Lightning as much as
      // the 1990s "Lightning Pickup", and the newer should lead.
      score += token.length >= 5 ? 48 : 36;
    } else if (modelLower.startsWith(token)) score += 30;
    else if (haystack.includes(token)) score += 12;
    else if (fuzzyTokenMatch(makeLower, token)) score += 28;
    else if (fuzzyTokenMatch(family, token) || fuzzyTokenMatch(modelLower, token)) score += 24;
    else if (fuzzyTokenMatch(haystack, token)) score += 8;
  }

  // Prefer current-generation inventory when tokens otherwise tie
  // (e.g. every Mazda 3 year scores the same on "mazda" + "3").
  score += Math.max(0, car.year - 1990) * 0.35;

  return score;
}

/**
 * Choose the narrowest starting set by leveraging indexes.
 * This avoids scanning the entire database when a selective filter is provided.
 */
function getCandidateSet(query: SearchQuery): Car[] {
  const filters = query.filters;

  // If no filters and no text query, start with the full set
  if (!filters && !query.query) {
    return cachedCars;
  }

  // Try to pick the most selective index to minimize work.
  // We intersect results when multiple indexed filters are active.
  type IndexFilter = { index: Map<string, Car[]>; keys: string[] };
  const indexFilters: IndexFilter[] = [];

  if (filters) {
    if (filters.make?.length) {
      indexFilters.push({
        index: makeIndex,
        keys: filters.make.map((m) => m.toLowerCase()),
      });
    }
    if (filters.bodyStyle?.length) {
      indexFilters.push({
        index: bodyStyleIndex,
        keys: filters.bodyStyle,
      });
    }
    if (filters.fuelType?.length) {
      indexFilters.push({
        index: fuelTypeIndex,
        keys: filters.fuelType,
      });
    }
    if (filters.transmission?.length) {
      indexFilters.push({
        index: transmissionIndex,
        keys: filters.transmission,
      });
    }
    if (filters.driveType?.length) {
      indexFilters.push({
        index: driveTypeIndex,
        keys: filters.driveType,
      });
    }
    if (filters.countryOfOrigin?.length) {
      indexFilters.push({
        index: countryIndex,
        keys: filters.countryOfOrigin,
      });
    }
  }

  if (indexFilters.length === 0) {
    return cachedCars;
  }

  // Use the smallest bucket set as the starting point, then intersect
  // Sort by estimated result size (number of keys * avg bucket size) ascending
  indexFilters.sort((a, b) => {
    const sizeA = a.keys.reduce((sum, k) => sum + (a.index.get(k)?.length || 0), 0);
    const sizeB = b.keys.reduce((sum, k) => sum + (b.index.get(k)?.length || 0), 0);
    return sizeA - sizeB;
  });

  // Start with the smallest index filter
  const first = indexFilters[0];
  const resultSet: Set<Car> = new Set();
  for (const key of first.keys) {
    const bucket = first.index.get(key);
    if (bucket) {
      for (const car of bucket) {
        resultSet.add(car);
      }
    }
  }

  // Intersect with remaining index filters
  for (let i = 1; i < indexFilters.length; i++) {
    const filter = indexFilters[i];
    const allowedSet = new Set<Car>();
    for (const key of filter.keys) {
      const bucket = filter.index.get(key);
      if (bucket) {
        for (const car of bucket) {
          allowedSet.add(car);
        }
      }
    }
    // Keep only cars that appear in both sets
    for (const car of resultSet) {
      if (!allowedSet.has(car)) {
        resultSet.delete(car);
      }
    }
  }

  return Array.from(resultSet);
}

/**
 * Single-pass filter: evaluate ALL remaining conditions per car in one loop.
 * Indexed fields (make, bodyStyle, fuelType, transmission, driveType, country)
 * are skipped here since getCandidateSet already handled them.
 */
/** EPA's "AM" and "AM-S7" codes: a PDK, a DSG, or an older single-clutch box. */
const isAutomatedManual = (car: Car) =>
  /\(AM(?:-S)?\d*\)/i.test(car.transmission?.description ?? '');

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function singlePassFilter(cars: Car[], query: SearchQuery, allowFuzzy = true): Car[] {
  const filters = query.filters;
  const searchTerm = query.query ? normalizeSearchQuery(query.query) : '';
  // Tokenize so multi-word queries like "2024 camry" match across fields
  const searchTokens = searchTerm
    ? searchTerm.split(/\s+/).filter(Boolean).map(normalizeSearchToken)
    : [];

  // If nothing to filter, return as-is
  const hasTextSearch = searchTokens.length > 0;
  const hasModel = !!filters?.model?.length;
  const hasYearMin = filters?.year?.min != null;
  const hasYearMax = filters?.year?.max != null;
  const hasHpMin = filters?.horsepower?.min != null;
  const hasHpMax = filters?.horsepower?.max != null;
  const hasDispMin = filters?.displacement?.min != null;
  const hasDispMax = filters?.displacement?.max != null;
  const hasFuelEcoMin = filters?.fuelEconomy?.min != null;
  const hasFuelEcoMax = filters?.fuelEconomy?.max != null;
  const hasPriceMin = filters?.price?.min != null;
  const hasPriceMax = filters?.price?.max != null;

  const cylinderSet = filters?.cylinders?.length ? new Set(filters.cylinders) : null;
  const aspirationSet = filters?.aspiration?.length ? new Set(filters.aspiration) : null;
  const threeRow = filters?.threeRow === true;
  const twoRow = filters?.threeRow === false;
  const twoSeater = filters?.twoSeater === true;
  const positionWanted = filters?.enginePosition;
  const doors = filters?.doors;
  const rangeMin = filters?.rangeMiles?.min;
  const rangeMax = filters?.rangeMiles?.max;
  const safetyMin = filters?.safety?.min;
  const safetyMax = filters?.safety?.max;
  const classSet = filters?.classes?.length ? new Set(filters.classes) : null;
  const segmentSet = filters?.segments?.length ? new Set(filters.segments) : null;
  const luxuryOnly = filters?.luxury === true;
  const mildOnly = filters?.mildHybrid === true;
  const automatedManualOnly = filters?.automatedManual === true;
  const layoutSet = filters?.layout?.length ? new Set(filters.layout) : null;
  const engineFamily = isEngineFamilyId(filters?.engineFamily)
    ? ENGINE_FAMILIES[filters.engineFamily]
    : null;

  const needsFiltering =
    !!classSet ||
    !!segmentSet ||
    luxuryOnly ||
    mildOnly ||
    automatedManualOnly ||
    !!layoutSet ||
    !!engineFamily ||
    !!cylinderSet ||
    !!aspirationSet ||
    threeRow ||
    twoRow ||
    twoSeater ||
    !!positionWanted ||
    doors != null ||
    rangeMin != null ||
    rangeMax != null ||
    safetyMin != null ||
    safetyMax != null ||
    hasTextSearch ||
    hasModel ||
    !!query.trimForms?.length ||
    hasYearMin ||
    hasYearMax ||
    hasHpMin ||
    hasHpMax ||
    hasDispMin ||
    hasDispMax ||
    hasFuelEcoMin ||
    hasFuelEcoMax ||
    hasPriceMin ||
    hasPriceMax;

  if (!needsFiltering) {
    return cars;
  }

  // Pre-compute lowercase model set for fast lookup
  const modelSet = hasModel ? new Set(filters!.model!.map((m) => m.toLowerCase())) : null;

  const yearMin = filters?.year?.min;
  const yearMax = filters?.year?.max;
  const hpMin = filters?.horsepower?.min;
  const hpMax = filters?.horsepower?.max;
  const dispMin = filters?.displacement?.min;
  const dispMax = filters?.displacement?.max;
  const fuelEcoMin = filters?.fuelEconomy?.min;
  const fuelEcoMax = filters?.fuelEconomy?.max;
  const fuelEcoBasis = filters?.fuelEconomy?.basis ?? 'combined';
  const priceMin = filters?.price?.min;
  const priceMax = filters?.price?.max;
  const trimForms = query.trimForms?.length ? query.trimForms : null;

  const result: Car[] = [];

  // A word of one or two characters must start a word: "ix" was found inside
  // "Matrix" and "Grand Prix", "i4" inside a Discovery Sport "Si4".
  const shortTokens = new Map(
    searchTokens
      .filter((token) => token.length <= 2)
      .map((token) => [token, new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(token)}`)]),
  );

  for (const car of cars) {
    // Text search: every token must match at least one field (exact or fuzzy typo)
    if (hasTextSearch) {
      const haystack = `${car.make} ${car.model} ${car.year} ${car.variant ?? ''}`.toLowerCase();
      let allMatch = true;
      for (const token of searchTokens) {
        const short = shortTokens.get(token);
        if (short ? short.test(haystack) : haystack.includes(token)) continue;
        if (allowFuzzy && fuzzyTokenMatch(haystack, token)) continue;
        allMatch = false;
        break;
      }
      if (!allMatch) continue;
    }

    // Model filter
    if (modelSet && !modelSet.has(car.model.toLowerCase())) {
      continue;
    }

    if (cylinderSet && !cylinderSet.has(car.engine.cylinders ?? -1)) continue;
    if (layoutSet && !layoutSet.has(car.engine.configuration ?? '')) continue;
    if (engineFamily && !engineFamily.test(car)) continue;
    if (aspirationSet && !aspirationSet.has(car.engine.aspiration ?? '')) continue;
    if (threeRow && !isThreeRow(car)) continue;
    if (twoRow && isThreeRow(car)) continue;
    if (twoSeater && car.epa?.vClass !== 'Two Seaters') continue;
    if (positionWanted && enginePosition(car) !== positionWanted) continue;
    if (doors != null && doorCount(car) !== doors) continue;
    if (classSet && !competitiveSets(car).some((set) => classSet.has(set))) continue;
    if (
      segmentSet &&
      !segmentSet.has(car.shoppingSegment ?? 'mainstream') &&
      !(segmentSet.has('sports-car') && isElectricSportsCar(car))
    )
      continue;
    if (luxuryOnly && !isLuxuryBrand(car.make)) continue;
    if (mildOnly && !car.engine.mildHybrid) continue;
    if (automatedManualOnly && !isAutomatedManual(car)) continue;
    if (rangeMin != null || rangeMax != null) {
      const range = car.epa?.rangeMiles;
      if (range == null) continue;
      if (rangeMin != null && range < rangeMin) continue;
      if (rangeMax != null && range > rangeMax) continue;
    }
    if (safetyMin != null || safetyMax != null) {
      const stars = car.safetyRating?.overall;
      if (!stars) continue;
      if (safetyMin != null && stars < safetyMin) continue;
      if (safetyMax != null && stars > safetyMax) continue;
    }

    // A trim the query ended in ("mustang gt"): the model shares its name
    // with the other trims, so check the model name plus derived variant.
    if (trimForms && !trimForms.some((form) => hasWords(trimLabel(car), form))) continue;

    // Year range
    if (hasYearMin && car.year < yearMin!) continue;
    if (hasYearMax && car.year > yearMax!) continue;

    // Horsepower range (exclude cars without horsepower data when filtering)
    if (hasHpMin || hasHpMax) {
      const hp = car.engine.horsepower;
      if (hp == null) continue;
      if (hasHpMin && hp < hpMin!) continue;
      if (hasHpMax && hp > hpMax!) continue;
    }

    // Displacement range (exclude cars without displacement, e.g. EVs)
    if (hasDispMin || hasDispMax) {
      const disp = car.engine.displacement;
      if (disp == null || disp <= 0) continue;
      if (hasDispMin && disp < dispMin!) continue;
      if (hasDispMax && disp > dispMax!) continue;
    }

    // Fuel economy range — exclude cars without EPA MPG when filtering
    if (hasFuelEcoMin || hasFuelEcoMax) {
      const mpg = car.fuelEconomy[fuelEcoBasis];
      if (mpg == null || mpg <= 0) continue;
      if (hasFuelEcoMin && mpg < fuelEcoMin!) continue;
      if (hasFuelEcoMax && mpg > fuelEcoMax!) continue;
    }

    // Price range — exclude cars without price when filtering
    if (hasPriceMin || hasPriceMax) {
      const msrp = car.price?.msrp;
      if (msrp == null || msrp <= 0) continue;
      if (hasPriceMin && msrp < priceMin!) continue;
      if (hasPriceMax && msrp > priceMax!) continue;
    }

    result.push(car);
  }

  return result;
}

/**
 * Sort results in-place (avoids creating a new array).
 */
function sortResultsInPlace(cars: Car[], field: string, order: 'asc' | 'desc'): void {
  const dir = order === 'asc' ? 1 : -1;

  cars.sort((a, b) => {
    const aVal = getSortValue(a, field);
    const bVal = getSortValue(b, field);
    const aMissing = aVal === null;
    const bMissing = bVal === null;
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    if (aVal! < bVal!) return -dir;
    if (aVal! > bVal!) return dir;
    return 0;
  });
}

function getSortValue(car: Car, field: string): number | string | null {
  switch (field) {
    case 'make':
      return car.make;
    case 'model':
      return car.model;
    case 'year':
      return car.year;
    case 'horsepower':
      return car.engine.horsepower ?? null;
    case 'price':
      return car.price?.msrp ?? null;
    case 'fuelEconomy':
      return car.fuelEconomy?.combined ?? null;
    case 'range':
      return car.epa?.rangeMiles ?? null;
    case 'safety':
      return car.safetyRating?.overall || null;
    case 'runningCost':
      return car.runningCostCad ?? null;
    case 'evScore':
      return computeEvScore(car, car.price?.msrp ?? undefined);
    default:
      return null;
  }
}

export function getAllCars(): Car[] {
  ensureDatabase();
  return cachedCars;
}

/**
 * Get multiple cars by IDs – O(n) via Map instead of O(n*m).
 */
export function getCarsByIds(ids: string[]): { cars: Car[]; notFound: string[] } {
  ensureDatabase();
  const cars: Car[] = [];
  const notFound: string[] = [];
  for (const id of ids) {
    const car = idIndex.get(id);
    if (car) cars.push(car);
    else notFound.push(id);
  }
  return { cars, notFound };
}

/**
 * Get statistics about the database (cached after first computation).
 */
export function getStatistics() {
  ensureDatabase();
  if (cachedStats) return cachedStats;
  cachedStats = computeStatistics();
  return cachedStats;
}

/**
 * Fingerprint for the loaded dataset. The vehicle corpus only changes when a
 * new build ships, so this doubles as the ETag basis for every car endpoint —
 * the whole read API is safely cacheable until the next deploy.
 */
export function getDataVersion(): string {
  ensureDatabase();
  return `${lastUpdated || 'unknown'}-${cachedCars.length}`;
}

function computeStatistics() {
  const totalCars = cachedCars.length;

  const yearRange = { min: Infinity, max: -Infinity };
  const bodyStyles: Record<string, number> = {};
  const fuelTypes: Record<string, number> = {};
  const countries: Record<string, number> = {};
  const provenanceCounts = { epa: 0, nrcan: 0, nhtsa: 0, estimated: 0, curated: 0 };
  let withEpaMpg = 0;
  let withNhtsaSafety = 0;
  let withEstimatedPrice = 0;

  for (const car of cachedCars) {
    if (car.year < yearRange.min) yearRange.min = car.year;
    if (car.year > yearRange.max) yearRange.max = car.year;
    bodyStyles[car.bodyStyle] = (bodyStyles[car.bodyStyle] || 0) + 1;
    fuelTypes[car.engine.fuelType] = (fuelTypes[car.engine.fuelType] || 0) + 1;
    if (car.countryOfOrigin) {
      countries[car.countryOfOrigin] = (countries[car.countryOfOrigin] || 0) + 1;
    }
    if (car.fuelEconomy.combined) withEpaMpg++;
    if (car.safetyRating?.overall) withNhtsaSafety++;
    if (car.price?.isEstimated) withEstimatedPrice++;
    const carSources = new Set(Object.values(car.provenance || {}));
    for (const source of carSources) {
      provenanceCounts[source]++;
    }
  }

  return {
    totalCars,
    // Model lines ("Civic", "RAV4"), the way one-per-model search counts them:
    // EPA lists each engine, gearbox and drive of a model year on its own.
    totalModels: new Set(cachedCars.map(modelLineKey)).size,
    totalMakes: makeIndex.size,
    totalCountries: countryIndex.size,
    countries: Object.keys(countries).sort(),
    yearRange: totalCars > 0 ? yearRange : { min: 0, max: 0 },
    bodyStyles,
    fuelTypes,
    lastUpdated,
    dataSources: dbSources,
    provenanceCounts,
    coverage: {
      fuelEconomy: withEpaMpg,
      nhtsaSafety: withNhtsaSafety,
      estimatedPrice: withEstimatedPrice,
    },
  };
}

export interface ChartPoint {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mpg: number;
  displacement: number;
  co2: number;
  bodyStyle: string;
  /** Y-axis value is always EPA-verified when present */
  ySource: 'epa' | 'estimated';
  /** X-axis (price) is always model-estimated in this app */
  priceIsEstimated: boolean;
}

export interface ChartPointsQuery {
  priceMin?: number;
  priceMax?: number;
  bodyStyles?: string[];
  yearMin?: number;
  yearMax?: number;
  limit?: number;
}

/** Shared filters for value-matrix chart endpoints. */
function filterChartCars(query: ChartPointsQuery = {}): Array<{
  car: Car;
  price: number;
  mpg: number;
  displacement: number;
  co2: number;
}> {
  ensureDatabase();
  const priceMin = query.priceMin ?? 0;
  const priceMax = query.priceMax ?? Infinity;
  const bodySet = query.bodyStyles?.length ? new Set(query.bodyStyles) : null;
  const yearMin = query.yearMin;
  const yearMax = query.yearMax;

  const rows: Array<{
    car: Car;
    price: number;
    mpg: number;
    displacement: number;
    co2: number;
  }> = [];

  for (const car of cachedCars) {
    const price = car.price?.msrp;
    if (price == null || price <= 0 || price < priceMin || price > priceMax) continue;
    if (bodySet && !bodySet.has(car.bodyStyle)) continue;
    if (yearMin != null && car.year < yearMin) continue;
    if (yearMax != null && car.year > yearMax) continue;

    rows.push({
      car,
      price,
      mpg: car.fuelEconomy.combined ?? 0,
      displacement: car.engine.displacement ?? 0,
      co2: car.epa?.co2 ?? 0,
    });
  }

  return rows;
}

export type ChartMetric = 'mpg' | 'displacement' | 'co2';

export interface ChartDensityCell {
  priceMin: number;
  priceMax: number;
  yMin: number;
  yMax: number;
  count: number;
  dominantBodyStyle: string;
}

export interface ChartDensityResult {
  total: number;
  metric: ChartMetric;
  priceMin: number;
  priceMax: number;
  yMin: number;
  yMax: number;
  priceBins: number;
  yBins: number;
  cells: ChartDensityCell[];
}

function yValueForMetric(
  row: { mpg: number; displacement: number; co2: number },
  metric: ChartMetric,
): number {
  if (metric === 'mpg') return row.mpg;
  if (metric === 'displacement') return row.displacement;
  return row.co2;
}

/** 2D histogram for the full filtered fleet (handles 20k+ cars in ~400 bins). */
export function getChartDensity(
  query: ChartPointsQuery & { metric?: ChartMetric; priceBins?: number; yBins?: number } = {},
): ChartDensityResult {
  const metric = query.metric ?? 'mpg';
  const priceBinCount = Math.min(Math.max(query.priceBins ?? 32, 8), 48);
  const yBinCount = Math.min(Math.max(query.yBins ?? 20, 8), 32);

  const rows = filterChartCars(query).filter((row) => yValueForMetric(row, metric) > 0);
  const total = rows.length;

  if (total === 0) {
    return {
      total: 0,
      metric,
      priceMin: query.priceMin ?? 0,
      priceMax: query.priceMax ?? 0,
      yMin: 0,
      yMax: 0,
      priceBins: priceBinCount,
      yBins: yBinCount,
      cells: [],
    };
  }

  let priceMin = Infinity;
  let priceMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const row of rows) {
    const y = yValueForMetric(row, metric);
    if (row.price < priceMin) priceMin = row.price;
    if (row.price > priceMax) priceMax = row.price;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }

  const priceSpan = Math.max(priceMax - priceMin, 1);
  const ySpan = Math.max(yMax - yMin, 0.01);
  const grid = new Map<
    string,
    {
      count: number;
      priceMin: number;
      priceMax: number;
      yMin: number;
      yMax: number;
      bodyStyles: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const y = yValueForMetric(row, metric);
    const pi = Math.min(
      priceBinCount - 1,
      Math.floor(((row.price - priceMin) / priceSpan) * priceBinCount),
    );
    const yi = Math.min(yBinCount - 1, Math.floor(((y - yMin) / ySpan) * yBinCount));
    const key = `${pi}:${yi}`;
    const cellPriceMin = priceMin + (pi / priceBinCount) * priceSpan;
    const cellPriceMax = priceMin + ((pi + 1) / priceBinCount) * priceSpan;
    const cellYMin = yMin + (yi / yBinCount) * ySpan;
    const cellYMax = yMin + ((yi + 1) / yBinCount) * ySpan;

    const existing = grid.get(key);
    if (existing) {
      existing.count += 1;
      existing.bodyStyles.set(
        row.car.bodyStyle,
        (existing.bodyStyles.get(row.car.bodyStyle) ?? 0) + 1,
      );
    } else {
      const bodyStyles = new Map<string, number>();
      bodyStyles.set(row.car.bodyStyle, 1);
      grid.set(key, {
        count: 1,
        priceMin: cellPriceMin,
        priceMax: cellPriceMax,
        yMin: cellYMin,
        yMax: cellYMax,
        bodyStyles,
      });
    }
  }

  const cells: ChartDensityCell[] = [];
  for (const cell of grid.values()) {
    let dominantBodyStyle = 'sedan';
    let maxStyle = 0;
    for (const [style, n] of cell.bodyStyles) {
      if (n > maxStyle) {
        maxStyle = n;
        dominantBodyStyle = style;
      }
    }
    cells.push({
      priceMin: cell.priceMin,
      priceMax: cell.priceMax,
      yMin: cell.yMin,
      yMax: cell.yMax,
      count: cell.count,
      dominantBodyStyle,
    });
  }

  cells.sort((a, b) => b.count - a.count);

  return {
    total,
    metric,
    priceMin,
    priceMax,
    yMin,
    yMax,
    priceBins: priceBinCount,
    yBins: yBinCount,
    cells,
  };
}

/** Lightweight scatter-plot points computed server-side (avoids shipping full DB to browser). */
export function getChartPoints(query: ChartPointsQuery = {}): {
  points: ChartPoint[];
  total: number;
  returned: number;
} {
  const limit = Math.min(Math.max(query.limit ?? 3000, 1), 5000);
  const rows = filterChartCars(query);

  const points: ChartPoint[] = rows.map(({ car, price, mpg, displacement, co2 }) => ({
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    price,
    mpg,
    displacement,
    co2,
    bodyStyle: car.bodyStyle,
    ySource: 'epa' as const,
    priceIsEstimated: car.price?.isEstimated !== false,
  }));

  const total = points.length;
  if (total <= limit) {
    return { points, total, returned: total };
  }

  const sampled: ChartPoint[] = [];
  const step = total / limit;
  for (let i = 0; i < limit; i++) {
    sampled.push(points[Math.floor(i * step)]);
  }
  return { points: sampled, total, returned: sampled.length };
}
