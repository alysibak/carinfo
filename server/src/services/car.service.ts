import type { Car, SearchQuery } from '../types/car.types.js';
import { readFileSync } from 'fs';
import { computeEvScore } from '../utils/ev-scoring.js';
import { normalizeCarRecord } from '../utils/car-normalize.js';
import { dataFileCandidates, resolveDataFile } from '../utils/data-paths.js';
import {
  bestFuzzyScore,
  fuzzyTokenMatch,
  modelFamilyName,
  modelPhraseMatches,
  normalizeSearchQuery,
  normalizeSearchToken,
} from '../utils/fuzzy-search.js';
import { enrichCar } from './content-enrichment.js';

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
    const db: CarDatabase = JSON.parse(raw);

    if (db.ready || readyPath) {
      // Pre-built at deploy time — skip enrich/normalize (the cold-start killer).
      cachedCars = db.cars;
      rawIdIndex = new Map(db.cars.map((car) => [car.id, car]));
      console.log(
        `[car.service] Loaded ready DB: ${cachedCars.length.toLocaleString()} cars in ${((Date.now() - started) / 1000).toFixed(1)}s`,
      );
    } else {
      // Dev / missing ready file: enrich + normalize at load (slow on large DBs).
      cachedCars = db.cars.map(enrichCar).map(normalizeCarRecord);
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
  cachedCars = FALLBACK_CARS.map(normalizeCarRecord);
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
    .map(k => {
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

  const models = new Set(cars.map(car => car.model));
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
export function searchCars(query: SearchQuery): {
  results: Car[];
  total: number;
  hasMore: boolean;
} {
  ensureDatabase();
  const originalText = query.query?.trim() ?? '';
  const enriched = enrichSearchQuery(query);
  let candidates = getCandidateSet(enriched);

  // Single-pass filtering for criteria not already handled by index selection
  candidates = singlePassFilter(candidates, enriched);

  const sortField = enriched.sort?.field;
  const sortOrder = enriched.sort?.order ?? 'desc';
  const wantRelevance = !sortField || sortField === 'relevance';

  // Always rank natural-language searches with the *original* query.
  // enrichSearchQuery may clear `query` after parsing make/model/year; using that
  // cleared value made "relevance" a no-op and left oldest EPA rows first.
  if (wantRelevance && originalText) {
    sortByRelevanceInPlace(candidates, originalText);
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

  return {
    results: candidates.slice(offset, offset + limit),
    total,
    hasMore: offset + limit < total,
  };
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
    const base = `${car.make}|${collapseModelKey(car.model)}`.toLowerCase();
    const key = includeYear ? `${base}|${car.year}` : base;
    if (!best.has(key)) best.set(key, car);
  }
  return Array.from(best.values());
}

/** Stable one-per-model key from messy EPA model strings. */
function collapseModelKey(model: string): string {
  const family = modelFamilyName(model);
  const parts = family.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'model') {
    return `${parts[0]} ${parts[1]}`;
  }
  if (parts.length >= 2 && parts[0] === 'range' && parts[1] === 'rover') {
    return parts.slice(0, Math.min(3, parts.length)).join(' ');
  }
  return parts[0] || family;
}

export interface SearchSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  query: string;
}

const POPULAR_SUGGESTIONS: SearchSuggestion[] = [
  { id: 'pop-camry', label: '2024 Toyota Camry', sublabel: 'Sedan · EPA verified', query: '2024 camry' },
  { id: 'pop-civic', label: 'Honda Civic', sublabel: 'Compact · all years', query: 'honda civic' },
  { id: 'pop-f150', label: 'Ford F-150', sublabel: 'Truck · work & haul', query: 'ford f-150' },
  { id: 'pop-rav4', label: 'Toyota RAV4', sublabel: 'SUV · daily driver', query: 'toyota rav4' },
  { id: 'pop-model3', label: 'Tesla Model 3', sublabel: 'Electric', query: 'tesla model 3' },
  { id: 'pop-accord', label: 'Honda Accord', sublabel: 'Sedan · reliable', query: 'honda accord' },
];

/** Autocomplete suggestions for the search bar — includes typo-tolerant matches. */
export function getSearchSuggestions(rawQuery: string, limit = 8): SearchSuggestion[] {
  ensureDatabase();
  const qRaw = rawQuery.trim().toLowerCase();
  const q = normalizeSearchQuery(qRaw);
  if (!q) return POPULAR_SUGGESTIONS.slice(0, limit);

  type Ranked = SearchSuggestion & { score: number };
  const ranked: Ranked[] = [];
  const seen = new Set<string>();

  const add = (s: SearchSuggestion, score: number) => {
    if (seen.has(s.id)) return;
    seen.add(s.id);
    ranked.push({ ...s, score });
  };

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
    let score = -1;
    if (modelKey.startsWith(q) || modelKey.includes(q) || labelLower.includes(q)) {
      score = modelKey.startsWith(q) ? 95 : 75;
    } else {
      const dModel = bestFuzzyScore(q, modelLower);
      const dLabel = bestFuzzyScore(q, labelLower);
      const d = Math.min(dModel, dLabel);
      if (d <= 2) score = 70 - d * 12;
    }
    if (score >= 40) {
      add(
        {
          id: `model-${car.make}-${car.model}`,
          label,
          sublabel: score < 70 ? `Close match · ${car.bodyStyle ?? 'Model'}` : 'Model',
          query: `${car.make.toLowerCase()} ${car.model.toLowerCase()}`,
        },
        score,
      );
    }
  }

  for (const p of POPULAR_SUGGESTIONS) {
    if (p.label.toLowerCase().includes(q) || p.query.includes(q) || bestFuzzyScore(q, p.query) <= 2) {
      add(p, 60);
    }
  }

  ranked.sort((a, b) => b.score - a.score);

  const results: SearchSuggestion[] = ranked.slice(0, Math.max(0, limit - 1)).map(({ score: _s, ...s }) => s);
  results.push({
    id: `raw-${qRaw}`,
    label: `Search “${rawQuery.trim()}”`,
    sublabel: 'All makes, models & years',
    query: rawQuery.trim(),
  });

  return results.slice(0, limit);
}

/**
 * Parse natural queries like "2024 camry", "mazda 3", or "toyota camry 2022"
 * into structured filters. User-provided filters always win — we only fill gaps.
 * Year prefixes: "20" → 2000–2099, "202" → 2020–2029; full years stay exact.
 */
function enrichSearchQuery(query: SearchQuery): SearchQuery {
  const raw = query.query?.trim();
  if (!raw) return query;

  const filters = { ...(query.filters || {}) };
  const tokens = expandGluedMakeTokens(
    normalizeSearchQuery(raw).split(/\s+/).filter(Boolean),
  );
  const textTokens: string[] = [];

  for (const token of tokens) {
    const yearRange = parseYearToken(token);
    if (yearRange && filters.year?.min == null && filters.year?.max == null) {
      filters.year = yearRange;
    } else {
      textTokens.push(token);
    }
  }

  if (!filters.make?.length && textTokens.length > 0) {
    const makeHit = resolveMakeFromTokens(textTokens);
    if (makeHit) {
      filters.make = [makeHit.make];
      textTokens.splice(makeHit.index, makeHit.consumed);
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

  const remainingQuery = textTokens.join(' ').trim() || undefined;

  return {
    ...query,
    query: remainingQuery,
    filters,
  };
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
  const makes = cachedMakes
    .map((m) => m.toLowerCase())
    .sort((a, b) => b.length - a.length);
  const out: string[] = [];

  for (const token of tokens) {
    let split = false;
    const compactToken = token.replace(/[\s\-]/g, '');
    for (const make of makes) {
      const compactMake = make.replace(/[\s\-]/g, '');
      if (
        compactToken.startsWith(compactMake) &&
        compactToken.length > compactMake.length
      ) {
        const rest = compactToken.slice(compactMake.length);
        if (/^[a-z0-9]/i.test(rest)) {
          out.push(make, normalizeSearchToken(rest));
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

  // 3) Unique prefix single token ("chev" → Chevrolet) — not used for multi-word
  for (let i = 0; i < tokens.length; i++) {
    const hit = findPrefixMake(tokens[i]);
    if (hit) return { make: hit, index: i, consumed: 1 };
  }

  // 4) Fuzzy single token for typos: "toyata" → Toyota
  for (let i = 0; i < tokens.length; i++) {
    const hit = findFuzzyMake(tokens[i]);
    if (hit) return { make: hit, index: i, consumed: 1 };
  }

  return null;
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
  const fuzzyMakes = cachedMakes.filter((m) => fuzzyTokenMatch(m.toLowerCase(), lower));
  return fuzzyMakes.length === 1 ? fuzzyMakes[0] : null;
}

/** All EPA model strings for a make that shoppers mean by `phrase` (e.g. "3"). */
function resolveModelsForPhrase(make: string, phrase: string): string[] {
  const models = getModelsByMake(make);
  const matched = models.filter((m) => modelPhraseMatches(m, phrase));
  if (matched.length) return matched;

  // Unique fuzzy fallback for mild typos ("civc" → Civic)
  const fuzzy = models.filter((m) => fuzzyTokenMatch(modelFamilyName(m), phrase));
  return fuzzy.length === 1 ? fuzzy : [];
}

function resolveModelsAcrossMakes(
  phrase: string,
): { models: string[]; makes: string[] } {
  const models = new Set<string>();
  const makes = new Set<string>();

  for (const [modelKey, cars] of modelIndex) {
    if (!cars.length) continue;
    if (!modelPhraseMatches(cars[0].model, phrase) && !modelKey.startsWith(phrase)) {
      continue;
    }
    // Avoid ultra-short phrases matching huge prefixes ("3" → every "3..." globally)
    if (phrase.length <= 2 && modelFamilyName(cars[0].model) !== phrase) continue;
    models.add(cars[0].model);
    makes.add(cars[0].make);
  }

  // If the phrase only matched one family name, expand to every EPA variant.
  if (models.size > 0 && makes.size === 1) {
    const make = Array.from(makes)[0];
    return { models: resolveModelsForPhrase(make, phrase), makes: [make] };
  }

  return {
    models: Array.from(models),
    makes: Array.from(makes),
  };
}

function sortByRelevanceInPlace(cars: Car[], searchText: string): void {
  const normalized = normalizeSearchQuery(searchText);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    cars.sort((a, b) => b.year - a.year);
    return;
  }

  cars.sort((a, b) => {
    const scoreDiff = scoreRelevance(b, tokens) - scoreRelevance(a, tokens);
    if (scoreDiff !== 0) return scoreDiff;
    return b.year - a.year;
  });
}

function scoreRelevance(car: Car, tokens: string[]): number {
  let score = 0;
  const makeLower = car.make.toLowerCase();
  const modelLower = car.model.toLowerCase();
  const family = modelFamilyName(car.model);
  const haystack = `${makeLower} ${modelLower} ${car.year} ${car.trim ?? ''}`.toLowerCase();

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
    else if (family === token || modelLower === token) score += 48;
    else if (modelPhraseMatches(car.model, token)) score += 42;
    else if (modelLower.startsWith(token)) score += 30;
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
        keys: filters.make.map(m => m.toLowerCase()),
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
  let resultSet: Set<Car> = new Set();
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
function singlePassFilter(cars: Car[], query: SearchQuery): Car[] {
  const filters = query.filters;
  const searchTerm = query.query ? normalizeSearchQuery(query.query) : '';
  // Tokenize so multi-word queries like "2024 camry" match across fields
  const searchTokens = searchTerm ? searchTerm.split(/\s+/).filter(Boolean).map(normalizeSearchToken) : [];

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

  const needsFiltering = hasTextSearch || hasModel || hasYearMin || hasYearMax ||
    hasHpMin || hasHpMax || hasDispMin || hasDispMax ||
    hasFuelEcoMin || hasFuelEcoMax || hasPriceMin || hasPriceMax;

  if (!needsFiltering) {
    return cars;
  }

  // Pre-compute lowercase model set for fast lookup
  const modelSet = hasModel
    ? new Set(filters!.model!.map(m => m.toLowerCase()))
    : null;

  const yearMin = filters?.year?.min;
  const yearMax = filters?.year?.max;
  const hpMin = filters?.horsepower?.min;
  const hpMax = filters?.horsepower?.max;
  const dispMin = filters?.displacement?.min;
  const dispMax = filters?.displacement?.max;
  const fuelEcoMin = filters?.fuelEconomy?.min;
  const fuelEcoMax = filters?.fuelEconomy?.max;
  const priceMin = filters?.price?.min;
  const priceMax = filters?.price?.max;

  const result: Car[] = [];

  for (const car of cars) {
    // Text search: every token must match at least one field (exact or fuzzy typo)
    if (hasTextSearch) {
      const haystack = `${car.make} ${car.model} ${car.year} ${car.trim ?? ''}`.toLowerCase();
      let allMatch = true;
      for (const token of searchTokens) {
        if (haystack.includes(token) || fuzzyTokenMatch(haystack, token)) continue;
        allMatch = false;
        break;
      }
      if (!allMatch) continue;
    }

    // Model filter
    if (modelSet && !modelSet.has(car.model.toLowerCase())) {
      continue;
    }

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
      const mpg = car.fuelEconomy.combined;
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
    case 'make': return car.make;
    case 'model': return car.model;
    case 'year': return car.year;
    case 'horsepower':
      return car.engine.horsepower ?? null;
    case 'price':
      return car.price?.msrp ?? null;
    case 'fuelEconomy':
      return car.fuelEconomy?.combined ?? null;
    case 'range':
      return car.epa?.rangeMiles ?? null;
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
  const provenanceCounts = { epa: 0, nhtsa: 0, estimated: 0, curated: 0 };
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
    { count: number; priceMin: number; priceMax: number; yMin: number; yMax: number; bodyStyles: Map<string, number> }
  >();

  for (const row of rows) {
    const y = yValueForMetric(row, metric);
    const pi = Math.min(priceBinCount - 1, Math.floor(((row.price - priceMin) / priceSpan) * priceBinCount));
    const yi = Math.min(yBinCount - 1, Math.floor(((y - yMin) / ySpan) * yBinCount));
    const key = `${pi}:${yi}`;
    const cellPriceMin = priceMin + (pi / priceBinCount) * priceSpan;
    const cellPriceMax = priceMin + ((pi + 1) / priceBinCount) * priceSpan;
    const cellYMin = yMin + (yi / yBinCount) * ySpan;
    const cellYMax = yMin + ((yi + 1) / yBinCount) * ySpan;

    const existing = grid.get(key);
    if (existing) {
      existing.count += 1;
      existing.bodyStyles.set(row.car.bodyStyle, (existing.bodyStyles.get(row.car.bodyStyle) ?? 0) + 1);
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
export function getChartPoints(
  query: ChartPointsQuery = {},
): { points: ChartPoint[]; total: number; returned: number } {
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

