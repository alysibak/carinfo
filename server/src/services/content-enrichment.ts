import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { Car } from '../types/car.types.js';
import { estimateEvHorsepower } from '../utils/ev-power-estimates.js';
import { nhtsaLookupKeys, canonicalizeDisplayModel } from '../utils/vehicle-taxonomy.js';

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
}

interface SafetyEntry {
  overall: number;
  frontal?: number;
  side?: number;
  rollover?: number;
}

function loadJson<T>(fileName: string): T | null {
  const candidates = [
    resolve(process.cwd(), 'server', 'data', fileName),
    resolve(process.cwd(), 'data', fileName),
    join(__dirname, '../../data', fileName),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, 'utf-8')) as T;
      } catch (err) {
        console.warn(`[content-enrichment] Failed to parse ${p}:`, (err as Error).message);
        return null;
      }
    }
  }
  return null;
}

let epaEnrichment: Record<string, EpaEnrichmentEntry> = {};
let nhtsaSafety: Record<string, SafetyEntry> = {};
let horsepower: Record<string, number> = {};
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  epaEnrichment = loadJson<Record<string, EpaEnrichmentEntry>>('epa-enrichment.json') ?? {};
  nhtsaSafety = loadJson<Record<string, SafetyEntry>>('nhtsa-safety.json') ?? {};
  horsepower = loadJson<Record<string, number>>('horsepower-enrichment.json') ?? {};
  loaded = true;
  console.log(
    `[content-enrichment] Loaded ${Object.keys(epaEnrichment).length} EPA + ${Object.keys(nhtsaSafety).length} NHTSA-safety + ${Object.keys(horsepower).length} horsepower entries.`,
  );
}

/** Attach offline EPA/NHTSA enrichment to a record. Returns a new object when changed. */
export function enrichCar(car: Car): Car {
  ensureLoaded();

  const epaEntry = car.epaId != null ? epaEnrichment[String(car.epaId)] : undefined;
  const displayModel = canonicalizeDisplayModel(car);
  const safety = nhtsaLookupKeys(car, displayModel)
    .map((key) => nhtsaSafety[key])
    .find(Boolean);
  const hp = car.epaId != null ? horsepower[String(car.epaId)] : undefined;
  const evHpCandidate = estimateEvHorsepower(car);

  if (!epaEntry && !safety && hp == null && evHpCandidate == null) return car;

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

  // Real EPA "Rated Horsepower" matched per engine config. cars.json carries no HP
  // (EPA fuel-economy data omits it), so only set it when absent and never clobber a
  // value already stored on the record.
  if (hp != null && car.engine.horsepower == null) {
    next.engine = { ...next.engine, horsepower: hp };
    next.provenance = { ...next.provenance, 'engine.horsepower': 'epa' };
  }

  const evHp = estimateEvHorsepower(next);
  if (evHp != null && next.engine.horsepower == null) {
    next.engine = { ...next.engine, horsepower: evHp };
    next.provenance = { ...next.provenance, 'engine.horsepower': 'estimated' };
  }

  return next;
}
