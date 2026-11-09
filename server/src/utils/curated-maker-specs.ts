import { readFileSync } from 'fs';
import type { Aspiration, Car, FuelType, Provenance } from '../types/car.types.js';
import { resolveDataFile } from './data-paths.js';
import { modelFamilyName } from './fuzzy-search.js';

/**
 * Manufacturer figures EPA does not publish: torque, seating and maximum
 * towing. Matched by make, model family, year and engine fingerprint
 * (displacement, cylinders, fuel, forced induction), not by EPA id — one
 * maker rating covers every gearbox of that engine.
 *
 * File: data/curated-maker-specs.json. Each entry names its source URL; the
 * figures carry provenance `curated`. Edit the file when adding models;
 * `validate:data` checks the shape.
 */

export interface CuratedEngineSpec {
  /** Litres, as EPA files displacement (2.5, 3.5). */
  displacementL?: number;
  cylinders?: number;
  fuel?: FuelType;
  /** True for turbo or supercharged; false or absent for naturally aspirated. */
  forcedInduction?: boolean;
  /** Engine (or combined hybrid) torque, lb-ft, as the maker publishes it. */
  torqueLbFt?: number;
  /** Maximum conventional towing when properly equipped, lb. */
  maxTowingLb?: number;
  /** The maker page the figures were read from. */
  source: string;
}

export interface CuratedModelSpec {
  make: string;
  /** Family name as shoppers know it ("RAV4", "F-150"), not the EPA carline. */
  model: string;
  /** Inclusive model years this entry covers. */
  years: [number, number];
  /** Standard seating; with seatsMax when a third row is optional. */
  seats?: number;
  seatsMax?: number;
  seatsSource?: string;
  engines?: CuratedEngineSpec[];
}

export interface CuratedMakerSpecsFile {
  source: string;
  updatedAt: string;
  models: CuratedModelSpec[];
}

export interface CuratedMatch {
  seats?: number;
  seatsMax?: number;
  torqueLbFt?: number;
  maxTowingLb?: number;
  provenance: Provenance;
  sources: string[];
}

function familyKey(make: string, model: string): string {
  return `${make}|${modelFamilyName(model)}`.toLowerCase();
}

function forced(aspiration: Aspiration | undefined): boolean {
  return (
    aspiration === 'turbocharged' ||
    aspiration === 'supercharged' ||
    aspiration === 'turbocharged and supercharged'
  );
}

function close(a: number, b: number, tol = 0.05): boolean {
  return Math.abs(a - b) <= tol;
}

function engineMatches(car: Car, engine: CuratedEngineSpec): boolean {
  if (engine.fuel && engine.fuel !== car.engine.fuelType) return false;
  if (
    engine.cylinders != null &&
    car.engine.cylinders != null &&
    engine.cylinders !== car.engine.cylinders
  ) {
    return false;
  }
  if (
    engine.displacementL != null &&
    car.engine.displacement != null &&
    !close(engine.displacementL, car.engine.displacement)
  ) {
    return false;
  }
  if (engine.forcedInduction != null && forced(car.engine.aspiration) !== engine.forcedInduction) {
    return false;
  }
  return true;
}

let file: CuratedMakerSpecsFile | null | undefined;
let byFamily: Map<string, CuratedModelSpec[]> | null = null;

function load(): CuratedMakerSpecsFile | null {
  if (file !== undefined) return file;
  const path = resolveDataFile('curated-maker-specs.json');
  if (!path) {
    file = null;
    return null;
  }
  try {
    file = JSON.parse(readFileSync(path, 'utf8')) as CuratedMakerSpecsFile;
  } catch (err) {
    console.warn('[curated-maker-specs] Failed to parse:', (err as Error).message);
    file = null;
  }
  return file;
}

function index(): Map<string, CuratedModelSpec[]> {
  if (byFamily) return byFamily;
  byFamily = new Map();
  for (const model of load()?.models ?? []) {
    const key = familyKey(model.make, model.model);
    const list = byFamily.get(key) ?? [];
    list.push(model);
    byFamily.set(key, list);
  }
  return byFamily;
}

/**
 * Test seam: load a fixture instead of the data file. Pass `undefined` to
 * clear the seam and read the shipped file again on the next call.
 */
export function __setCuratedMakerSpecsForTests(
  next: CuratedMakerSpecsFile | null | undefined,
): void {
  file = next;
  byFamily = null;
}

/**
 * The curated figures that describe this car, if any. Seats come from the
 * model entry; torque and towing from the engine that matches it.
 */
export function curatedMakerSpecsFor(car: Car): CuratedMatch | null {
  const candidates = (index().get(familyKey(car.make, car.model)) ?? []).filter(
    (entry) => car.year >= entry.years[0] && car.year <= entry.years[1],
  );
  if (!candidates.length) return null;

  const provenance: Provenance = {};
  const sources = new Set<string>();
  let seats: number | undefined;
  let seatsMax: number | undefined;
  let torqueLbFt: number | undefined;
  let maxTowingLb: number | undefined;

  for (const entry of candidates) {
    if (entry.seats != null && seats == null) {
      seats = entry.seats;
      seatsMax = entry.seatsMax;
      provenance.seats = 'curated';
      if (entry.seatsSource) sources.add(entry.seatsSource);
    }
    for (const engine of entry.engines ?? []) {
      if (!engineMatches(car, engine)) continue;
      if (engine.torqueLbFt != null && torqueLbFt == null) {
        torqueLbFt = engine.torqueLbFt;
        provenance['engine.torque'] = 'curated';
        sources.add(engine.source);
      }
      if (engine.maxTowingLb != null && maxTowingLb == null) {
        maxTowingLb = engine.maxTowingLb;
        provenance.towingCapacityLb = 'curated';
        sources.add(engine.source);
      }
    }
  }

  if (seats == null && torqueLbFt == null && maxTowingLb == null) return null;
  return {
    ...(seats != null ? { seats } : {}),
    ...(seatsMax != null ? { seatsMax } : {}),
    ...(torqueLbFt != null ? { torqueLbFt } : {}),
    ...(maxTowingLb != null ? { maxTowingLb } : {}),
    provenance,
    sources: [...sources],
  };
}

/** Apply curated maker specs onto a car; returns the same object when nothing matches. */
export function withCuratedMakerSpecs(car: Car): Car {
  const match = curatedMakerSpecsFor(car);
  if (!match) return car;
  const next: Car = { ...car, provenance: { ...car.provenance, ...match.provenance } };
  if (match.torqueLbFt != null && car.engine.torque == null) {
    next.engine = { ...next.engine, torque: match.torqueLbFt };
  }
  if (match.seats != null && car.seats == null) {
    next.seats = match.seats;
    if (match.seatsMax != null) next.seatsMax = match.seatsMax;
  }
  if (match.maxTowingLb != null && car.towingCapacityLb == null) {
    next.towingCapacityLb = match.maxTowingLb;
  }
  return next;
}
