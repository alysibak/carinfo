import { readFileSync } from 'fs';
import type { Car } from '../types/car.types.js';
import { resolveDataFile } from '../utils/data-paths.js';
import { estimateEvHorsepower } from '../utils/ev-power-estimates.js';
import { canonicalizeDisplayModel, resolveNhtsaCountry, resolveNhtsaSafety } from '../utils/vehicle-taxonomy.js';

/**
 * Load-time enrichment from offline companion files (no network calls):
 *   - epa-enrichment.json         keyed by epaId  → GHG score, 5-yr fuel savings,
 *     barrels/yr, PHEV dual-mode economy (fields not stored in cars.json).
 *   - nhtsa-safety.json           keyed by make|model|year → real NHTSA star ratings
 *     previously fetched into the enrichment cache.
 *   - horsepower-enrichment.json  keyed by epaId  → real EPA "Rated Horsepower"
 *     matched per engine config (cars.json itself has no HP — EPA fuel-economy
 *     data does not carry it). See scripts/build-horsepower-enrichment.ts.
 *
 * Regenerate with `npm run build-enrichment` (+ `npm run build-horsepower`).
 */

interface EpaEnrichmentEntry {
  ghgScore?: number;
  fuelSavings5yrUsd?: number;
  barrelsPerYear?: number;
  phev?: {
    gasMpg?: number;
    electricMpge?: number;
    electricRangeMi?: number;
    chargeL2Hours?: number;
    blendedMpge?: number;
  };
  economy?: { combined?: number; city?: number; highway?: number };
  ev?: { kwhPer100Mi?: number; rangeMi?: number };
  charge120Hours?: number;
  charge240Hours?: number;
}

interface SafetyEntry {
  overall: number;
  frontal?: number;
  side?: number;
  rollover?: number;
}

function loadJson<T>(fileName: string): T | null {
  const path = resolveDataFile(fileName);
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch (err) {
    console.warn(`[content-enrichment] Failed to parse ${path}:`, (err as Error).message);
    return null;
  }
}

interface NhtsaCacheEntry {
  countryOfOrigin?: string;
  safetyRating?: SafetyEntry;
}

let epaEnrichment: Record<string, EpaEnrichmentEntry> = {};
let nhtsaSafety: Record<string, SafetyEntry> = {};
let nhtsaByCarId: Record<string, SafetyEntry> = {};
let nhtsaCountryIndex: Record<string, string> = {};
let horsepower: Record<string, number> = {};
let loaded = false;

function buildNhtsaCountryIndex(cache: Record<string, NhtsaCacheEntry>): Record<string, string> {
  const index: Record<string, string> = {};
  for (const [key, entry] of Object.entries(cache)) {
    if (entry.countryOfOrigin) index[key] = entry.countryOfOrigin;
  }
  return index;
}

function ensureLoaded(): void {
  if (loaded) return;
  epaEnrichment = loadJson<Record<string, EpaEnrichmentEntry>>('epa-enrichment.json') ?? {};
  nhtsaSafety = loadJson<Record<string, SafetyEntry>>('nhtsa-safety.json') ?? {};
  nhtsaByCarId = loadJson<Record<string, SafetyEntry>>('nhtsa-by-car-id.json') ?? {};
  const nhtsaCache =
    loadJson<Record<string, NhtsaCacheEntry>>('raw/nhtsa-enrichment-cache.json') ?? {};
  nhtsaCountryIndex = buildNhtsaCountryIndex(nhtsaCache);
  horsepower = loadJson<Record<string, number>>('horsepower-enrichment.json') ?? {};
  loaded = true;
  console.log(
    `[content-enrichment] Loaded ${Object.keys(epaEnrichment).length} EPA + ${Object.keys(nhtsaSafety).length} NHTSA combos + ${Object.keys(nhtsaByCarId).length} per-car NHTSA + ${Object.keys(nhtsaCountryIndex).length} NHTSA country entries + ${Object.keys(horsepower).length} horsepower entries.`,
  );
}

/** Attach offline EPA/NHTSA enrichment to a record. Returns a new object when changed. */
export function enrichCar(car: Car): Car {
  ensureLoaded();

  const epaEntry = car.epaId != null ? epaEnrichment[String(car.epaId)] : undefined;
  const displayModel = canonicalizeDisplayModel(car);
  const safety =
    nhtsaByCarId[car.id] ?? resolveNhtsaSafety(car, nhtsaSafety, displayModel);
  const hp = car.epaId != null ? horsepower[String(car.epaId)] : undefined;
  const evHpCandidate = estimateEvHorsepower(car);
  const nhtsaCountry = car.countryOfOrigin
    ? resolveNhtsaCountry(car, nhtsaCountryIndex, displayModel)
    : undefined;

  if (!epaEntry && !safety && hp == null && evHpCandidate == null && !nhtsaCountry) return car;

  const next: Car = { ...car };

  if (epaEntry) {
    next.epa = {
      ...(car.epa ?? {}),
      ...(epaEntry.ghgScore != null ? { ghgScore: epaEntry.ghgScore } : {}),
      ...(epaEntry.fuelSavings5yrUsd != null ? { fuelSavings5yrUsd: epaEntry.fuelSavings5yrUsd } : {}),
      ...(epaEntry.barrelsPerYear != null ? { barrelsPerYear: epaEntry.barrelsPerYear } : {}),
      ...(epaEntry.phev ? { phev: epaEntry.phev } : {}),
    };

    // EV/PHEV economy correction: cars.json stored EPA's electricity-consumption
    // figure (kWh/100mi) in the `combined` MPG slot. Replace with authoritative
    // EPA headline economy (EV → MPGe, PHEV → gas-mode MPG) and real EV kWh/range.
    if (epaEntry.economy) {
      next.fuelEconomy = {
        combined: epaEntry.economy.combined ?? car.fuelEconomy.combined,
        city: epaEntry.economy.city ?? car.fuelEconomy.city,
        highway: epaEntry.economy.highway ?? car.fuelEconomy.highway,
      };
    }
    if (epaEntry.ev) {
      next.epa = {
        ...next.epa,
        ...(epaEntry.ev.kwhPer100Mi != null ? { kWhPer100Mi: epaEntry.ev.kwhPer100Mi } : {}),
        ...(epaEntry.ev.rangeMi != null ? { rangeMiles: epaEntry.ev.rangeMi } : {}),
      };
    }
    if (epaEntry.charge120Hours != null) {
      next.epa = { ...next.epa, charge120Hours: epaEntry.charge120Hours };
    }
    if (epaEntry.charge240Hours != null) {
      next.epa = { ...next.epa, charge240Hours: epaEntry.charge240Hours };
    }
  }

  // Only set safety from NHTSA when the record doesn't already carry a curated/stored rating.
  if (safety && !car.safetyRating?.overall) {
    next.safetyRating = {
      overall: safety.overall,
      ...(safety.frontal != null ? { frontal: safety.frontal } : {}),
      ...(safety.side != null ? { side: safety.side } : {}),
      ...(safety.rollover != null ? { rollover: safety.rollover } : {}),
    };
    next.provenance = { ...car.provenance, safetyRating: 'nhtsa' };
  }

  // EPA Test Car List "Rated Horsepower" — a separate EPA dataset from FuelEconomy.gov.
  // Provenance 'curated' keeps the FuelEconomy.gov "EPA" badge off this field (see ProvenanceChip).
  if (hp != null && car.engine.horsepower == null) {
    next.engine = { ...next.engine, horsepower: hp };
    next.provenance = { ...next.provenance, 'engine.horsepower': 'curated' };
  }

  const evHp = estimateEvHorsepower(next);
  if (evHp != null && next.engine.horsepower == null) {
    next.engine = { ...next.engine, horsepower: evHp };
    next.provenance = { ...next.provenance, 'engine.horsepower': 'estimated' };
  }

  if (nhtsaCountry) {
    next.provenance = { ...next.provenance, countryOfOrigin: 'nhtsa' };
  }

  return next;
}
