import { fetchJson } from './fetch.js';

/**
 * NHTSA 5-Star Safety Ratings for one model year, make and model: the first
 * rated variant's overall, frontal, side and rollover stars. Undefined when
 * NHTSA has not rated it.
 *
 * Shared by build-verified-database and build-nhtsa-backfill, which each used
 * to carry their own copy.
 */

export interface NhtsaSafety {
  overall?: number;
  frontal?: number;
  side?: number;
  rollover?: number;
}

interface NhtsaResults<T> {
  Results?: T[];
}

interface RatedVehicle {
  VehicleId?: number;
}

interface RatingDetail {
  OverallRating?: string;
  OverallFrontCrashRating?: string;
  OverallSideCrashRating?: string;
  RolloverRating?: string;
}

const TIMEOUT_MS = 15_000;

export function parseStar(value: string | undefined): number | undefined {
  if (!value || value === 'Not Rated' || value === 'N/A') return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

export async function fetchNhtsaSafety(
  make: string,
  model: string,
  year: number,
): Promise<NhtsaSafety | undefined> {
  const list = await fetchJson<NhtsaResults<RatedVehicle>>(
    `https://api.nhtsa.gov/SafetyRatings/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}`,
    TIMEOUT_MS,
  );
  const results = list?.Results;
  if (!Array.isArray(results) || results.length === 0) return undefined;

  const vehicleId = results[0].VehicleId;
  if (!vehicleId) return undefined;

  const details = await fetchJson<NhtsaResults<RatingDetail>>(
    `https://api.nhtsa.gov/SafetyRatings/VehicleId/${vehicleId}`,
    TIMEOUT_MS,
  );
  const detail = details?.Results?.[0];
  if (!detail) return undefined;

  const safety: NhtsaSafety = {
    overall: parseStar(detail.OverallRating),
    frontal: parseStar(detail.OverallFrontCrashRating),
    side: parseStar(detail.OverallSideCrashRating),
    rollover: parseStar(detail.RolloverRating),
  };

  if (!safety.overall && !safety.frontal && !safety.side && !safety.rollover) return undefined;
  return safety;
}
