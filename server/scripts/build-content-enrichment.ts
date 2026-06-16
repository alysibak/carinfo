/**
 * Build companion enrichment files from already-local sources (no network calls):
 *   - data/epa-enrichment.json   keyed by epaId  → high-value EPA fields not in cars.json
 *   - data/nhtsa-safety.json     keyed by make|model|year → real star ratings already
 *                                 present in the NHTSA enrichment cache
 *
 * These are merged into records at load time (see services/content-enrichment.ts),
 * consistent with the static-JSON architecture. Re-run after refreshing vehicles.csv
 * or the NHTSA cache:  npm run build-enrichment
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import type { Car } from '../src/types/car.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const CSV_PATH = join(DATA_DIR, 'raw', 'vehicles.csv');
const CACHE_PATH = join(DATA_DIR, 'raw', 'nhtsa-enrichment-cache.json');
const CARS_PATH = join(DATA_DIR, 'cars.json');
const EPA_OUT = join(DATA_DIR, 'epa-enrichment.json');
const NHTSA_OUT = join(DATA_DIR, 'nhtsa-safety.json');

export interface PhevDualMode {
  gasMpg?: number;
  electricMpge?: number;
  electricRangeMi?: number;
  chargeL2Hours?: number;
  blendedMpge?: number;
}

/**
 * Authoritative EV/PHEV headline economy from the EPA source. cars.json stored
 * EPA's `combE` (kWh/100mi consumption) in the `combined` slot for these records,
 * which is wrong — these supply the correct figures applied at load time.
 */
export interface EconomyOverride {
  combined?: number;
  city?: number;
  highway?: number;
}

export interface EpaEnrichmentEntry {
  ghgScore?: number;
  /** EPA "you save/spend" over 5 yr vs. the average new vehicle, in USD (signed: + = saves). */
  fuelSavings5yrUsd?: number;
  barrelsPerYear?: number;
  phev?: PhevDualMode;
  /** For EV: MPGe headline. For PHEV: gas-mode MPG headline. */
  economy?: EconomyOverride;
  /** Battery-electric extras (true kWh/100mi consumption + total range). */
  ev?: { kwhPer100Mi?: number; rangeMi?: number };
}

/** Parse a non-negative numeric EPA cell. Empty / -1 / 0 → undefined. */
function pos(v: string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = parseFloat(v);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

/** Parse a signed numeric EPA cell (e.g. youSaveSpend can be negative). 0 → undefined. */
function signed(v: string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = parseFloat(v);
  if (Number.isNaN(n) || n === 0) return undefined;
  return n;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildEpaEnrichment(usedEpaIds: Set<number>): Record<string, EpaEnrichmentEntry> {
  const rows = parse(readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const out: Record<string, EpaEnrichmentEntry> = {};
  let phevCount = 0;

  for (const row of rows) {
    const id = parseInt(row.id, 10);
    if (Number.isNaN(id) || !usedEpaIds.has(id)) continue;

    const entry: EpaEnrichmentEntry = {};
    const ghg = pos(row.ghgScore);
    if (ghg) entry.ghgScore = Math.round(ghg);
    const save = signed(row.youSaveSpend);
    if (save != null) entry.fuelSavings5yrUsd = Math.round(save);
    const barrels = pos(row.barrels08);
    if (barrels) entry.barrelsPerYear = round1(barrels);

    const atv = (row.atvType || '').toLowerCase();
    const ft1 = (row.fuelType1 || '').toLowerCase();
    const isPhev = atv.includes('plug-in') || atv.includes('phev');
    const isEv = !isPhev && (atv === 'ev' || ft1.includes('electric'));

    if (isPhev) {
      // For PHEVs EPA stores two operating modes. fuelType1/2 tell us which
      // of comb08 / combA08 is the gasoline vs electricity figure.
      const comb = pos(row.comb08);
      const combA = pos(row.combA08);
      const gasMpg = ft1.includes('elect') ? combA : comb;
      const electricMpge = ft1.includes('elect') ? comb : combA;
      const gasCity = ft1.includes('elect') ? pos(row.cityA08) : pos(row.city08);
      const gasHwy = ft1.includes('elect') ? pos(row.highwayA08) : pos(row.highway08);
      const phev: PhevDualMode = {};
      if (gasMpg) phev.gasMpg = Math.round(gasMpg);
      if (electricMpge) phev.electricMpge = Math.round(electricMpge);
      const rangeA = pos(row.rangeA);
      if (rangeA) phev.electricRangeMi = Math.round(rangeA);
      const charge = pos(row.charge240);
      if (charge) phev.chargeL2Hours = round1(charge);
      const blended = pos(row.phevComb);
      if (blended) phev.blendedMpge = Math.round(blended);
      if (Object.keys(phev).length > 0) {
        entry.phev = phev;
        phevCount++;
      }
      // Headline economy for a PHEV = honest gas-mode MPG (not the blended MPGe).
      const econ: EconomyOverride = {};
      if (gasMpg) econ.combined = Math.round(gasMpg);
      if (gasCity) econ.city = Math.round(gasCity);
      if (gasHwy) econ.highway = Math.round(gasHwy);
      if (Object.keys(econ).length > 0) entry.economy = econ;
    } else if (isEv) {
      // EV headline = MPGe (comb08/city08/highway08); kWh/100mi = combE; range = range.
      const econ: EconomyOverride = {};
      const comb = pos(row.comb08);
      const city = pos(row.city08);
      const hwy = pos(row.highway08);
      if (comb) econ.combined = Math.round(comb);
      if (city) econ.city = Math.round(city);
      if (hwy) econ.highway = Math.round(hwy);
      if (Object.keys(econ).length > 0) entry.economy = econ;
      const ev: { kwhPer100Mi?: number; rangeMi?: number } = {};
      const kwh = pos(row.combE);
      if (kwh) ev.kwhPer100Mi = round1(kwh);
      const range = pos(row.range);
      if (range) ev.rangeMi = Math.round(range);
      if (Object.keys(ev).length > 0) entry.ev = ev;
    }

    if (Object.keys(entry).length > 0) out[String(id)] = entry;
  }

  console.log(`EPA enrichment: ${Object.keys(out).length} records (${phevCount} with PHEV dual-mode)`);
  return out;
}

interface CacheEntry {
  safetyRating?: { overall?: number; frontal?: number; side?: number; rollover?: number };
}

export interface SafetyEntry {
  overall: number;
  frontal?: number;
  side?: number;
  rollover?: number;
}

function buildNhtsaSafety(): Record<string, SafetyEntry> {
  if (!existsSync(CACHE_PATH)) {
    console.warn('No NHTSA cache found — skipping safety enrichment.');
    return {};
  }
  const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as Record<string, CacheEntry>;
  const out: Record<string, SafetyEntry> = {};
  for (const [key, entry] of Object.entries(cache)) {
    const s = entry.safetyRating;
    if (!s || s.overall == null || s.overall <= 0) continue;
    const safety: SafetyEntry = { overall: s.overall };
    if (s.frontal && s.frontal > 0) safety.frontal = s.frontal;
    if (s.side && s.side > 0) safety.side = s.side;
    if (s.rollover && s.rollover > 0) safety.rollover = s.rollover;
    out[key] = safety;
  }
  console.log(`NHTSA safety: ${Object.keys(out).length} make|model|year combos with real ratings`);
  return out;
}

function main(): void {
  const db = JSON.parse(readFileSync(CARS_PATH, 'utf8')) as { cars: Car[] };
  const usedEpaIds = new Set<number>();
  for (const car of db.cars) if (car.epaId != null) usedEpaIds.add(car.epaId);

  const epa = buildEpaEnrichment(usedEpaIds);
  const safety = buildNhtsaSafety();

  writeFileSync(EPA_OUT, JSON.stringify(epa));
  writeFileSync(NHTSA_OUT, JSON.stringify(safety));
  console.log(`\nWrote ${EPA_OUT}`);
  console.log(`Wrote ${NHTSA_OUT}`);
}

main();
