import { readFileSync } from 'fs';
import type { Car, VehicleSize } from '../types/car.types.js';
import { resolveDataFile } from './data-paths.js';
import { testsDescribing, type TestedConfiguration } from './nhtsa-ratings.js';

/**
 * Transport Canada's Canadian Vehicle Specifications, through NHTSA's vPIC
 * (GetCanadianVehicleSpecifications): each vehicle's overall length, width
 * and height, wheelbase and curb weight, measured for collision
 * reconstruction. Its model names carry the body, cab, box and drive ("F-150
 * P/U SUPERCREW 5.5-FT BOX 4X4", "INTEGRA 2DR COUPE RS/LS/GS-R"); this reads
 * them and picks, for one of the site's cars, the rows that describe it.
 */

/** A row as fetch-public-data.ts keeps it: centimetres and kilograms, as text. */
export interface CanadianSpecRow {
  /** The model year asked for, for which the row is valid. */
  year: number;
  Make: string;
  Model: string;
  /** The year the design was first measured: "94". */
  MYR: string;
  OL: string;
  OW: string;
  OH: string;
  WB: string;
  CW: string;
}

/** One measured vehicle, as data/canadian-specs.json keeps it. */
export interface MeasuredVehicle {
  year: number;
  make: string;
  /** Transport Canada's name: "F-150 P/U SUPERCREW 5.5-FT BOX 4X4". */
  model: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  wheelbaseCm: number;
  curbWeightKg: number;
}

const DRIVE: Array<[RegExp, NonNullable<TestedConfiguration['drive']>]> = [
  [/\bAWD\b/, 'awd'],
  [/\b(?:4X4|4WD)\b/, '4wd'],
  [/\b(?:2WD|4X2)\b/, '2wd'],
  [/\bFWD\b/, 'fwd'],
  [/\bRWD\b/, 'rwd'],
];

const BODY: Array<[RegExp, NonNullable<TestedConfiguration['body']>]> = [
  [
    /\bP\/U\b|\bPICKUP\b|\b(?:REG|EXT|CREW|SUPER|QUAD|DOUBLE|ACCESS|KING|MEGA) ?CAB\b|\bSUPERCREW\b|\bBOX\b|SIDE\b/,
    'truck',
  ],
  [/\bCONVERTIBLE\b|\bCABRIOLET\b|\bROADSTER\b|\bSPYDER\b|\bSPIDER\b/, 'convertible'],
  [/\bCOUPE\b/, 'coupe'],
  [/\bHATCH(?:BACK)?\b|\b[35]DR\b/, 'hatchback'],
  [/\bWAGON\b/, 'wagon'],
  [/\bSUV\b/, 'suv'],
  [/\bVAN\b|\bMINIVAN\b/, 'van'],
  [/\bSEDAN\b|\b4DR\b/, 'sedan'],
  [/\b2DR\b/, 'coupe'],
];

/** Words in Transport Canada's names that are not the model's: body, cab, box, drive. */
const DESCRIPTORS =
  /\b(?:[2-5]DR|SEDAN|COUPE|CONVERTIBLE|CABRIOLET|HATCHBACK|HATCH|WAGON|SUV|VAN|MINIVAN|P\/U|PICKUP|(?:REG|EXT|CREW|SUPER|QUAD|DOUBLE|ACCESS|KING|MEGA) ?CAB|SUPERCREW|[SML]\/BOX|\d+(?:\.\d+)?-FT BOX|BOX|STYLESIDE|FLARESIDE|FLEETSIDE|STEPSIDE|[FS]\/SIDE|AWD|4X4|4WD|2WD|4X2|FWD|RWD|DRW|SRW)(?=\s|$)/g;

/** "F-150 P/U SUPERCREW 5.5-FT BOX 4X4" → "F-150": the name to match to the site's model. */
export function specModelName(model: string): string {
  return model.replace(DESCRIPTORS, ' ').replace(/\s+/g, ' ').trim() || model;
}

export function specConfiguration(model: string, make = ''): TestedConfiguration {
  const upper = model.toUpperCase();
  const makeWord = make.toLowerCase().replace(/[^a-z0-9]/g, '');
  const body = BODY.find(([re]) => re.test(upper))?.[1];
  const drive = DRIVE.find(([re]) => re.test(upper))?.[1];
  const words = specModelName(upper)
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean);
  return {
    ...(body ? { body } : {}),
    ...(drive ? { drive } : {}),
    electrified: words.some((w) => /^(?:hybrid|hev|phev|ev|electric|plug-in)$/.test(w)),
    // "BMW 328i": the make written into the name is not a version.
    name: words.map((w) => w.replace(/[^a-z0-9]/g, '')).filter((w) => w && w !== makeWord),
  };
}

const num = (text: string) => {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** A row's measurements, or null where any is missing or implausible for a passenger vehicle. */
export function measured(row: CanadianSpecRow): MeasuredVehicle | null {
  const lengthCm = num(row.OL);
  const widthCm = num(row.OW);
  const heightCm = num(row.OH);
  const wheelbaseCm = num(row.WB);
  const curbWeightKg = num(row.CW);
  if (
    !(lengthCm >= 250 && lengthCm <= 700) ||
    !(widthCm >= 130 && widthCm <= 260) ||
    !(heightCm >= 90 && heightCm <= 300) ||
    !(wheelbaseCm >= 150 && wheelbaseCm <= 450) ||
    !(curbWeightKg >= 450 && curbWeightKg <= 4500)
  ) {
    return null;
  }
  return {
    year: row.year,
    make: row.Make.trim(),
    model: row.Model.trim(),
    lengthCm,
    widthCm,
    heightCm,
    wheelbaseCm,
    curbWeightKg,
  };
}

const span = (values: number[]): [number, number] => [Math.min(...values), Math.max(...values)];

/**
 * The size the rows describing a car give it: one figure where they agree,
 * the span where they differ (a pickup's cabs and boxes).
 */
export function sizeOf(rows: MeasuredVehicle[]): VehicleSize {
  return {
    lengthCm: span(rows.map((r) => r.lengthCm)),
    widthCm: span(rows.map((r) => r.widthCm)),
    heightCm: span(rows.map((r) => r.heightCm)),
    wheelbaseCm: span(rows.map((r) => r.wheelbaseCm)),
    curbWeightKg: span(rows.map((r) => r.curbWeightKg)),
    measured: [...new Set(rows.map((r) => r.model))].slice(0, 6),
  };
}

/**
 * Every car's size from Transport Canada's rows for its model line that
 * year, by body, drivetrain and the version named (`lineOf` the site's line
 * key, `match` government names to it).
 */
export function withSizes(
  cars: Car[],
  rows: MeasuredVehicle[],
  lineOf: (car: Car) => string,
  match: (make: string, model: string, year: number) => string | null,
): { cars: Car[]; sized: number } {
  const byLine = new Map<string, Array<{ config: TestedConfiguration; row: MeasuredVehicle }>>();
  for (const row of rows) {
    const line = match(row.make, specModelName(row.model), row.year);
    if (!line) continue;
    const key = `${line}|${row.year}`;
    const list = byLine.get(key) ?? [];
    list.push({ config: specConfiguration(row.model, row.make), row });
    byLine.set(key, list);
  }
  let sized = 0;
  const out = cars.map((car) => {
    const candidates = byLine.get(`${lineOf(car)}|${car.year}`);
    if (!candidates) return car;
    const chosen = testsDescribing(car, candidates, { loose: true }).map((c) => c.row);
    if (!chosen.length) return car;
    sized++;
    return { ...car, size: sizeOf(chosen) };
  });
  return { cars: out, sized };
}

/** data/canadian-specs.json's vehicles (scripts/build-canadian-specs.ts), or none before it is built. */
export function loadMeasuredVehicles(): MeasuredVehicle[] {
  const path = resolveDataFile('canadian-specs.json');
  if (!path) return [];
  try {
    return (JSON.parse(readFileSync(path, 'utf8')) as { vehicles: MeasuredVehicle[] }).vehicles;
  } catch (err) {
    console.warn(`[canadian-specs] Failed to parse ${path}:`, (err as Error).message);
    return [];
  }
}
