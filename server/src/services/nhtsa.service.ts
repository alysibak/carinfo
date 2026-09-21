import axios from 'axios';

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

export interface VinEngine {
  /** Horsepower as published by NHTSA, or converted from NHTSA's kW figure. */
  hp?: number;
  /** True when hp was derived from NHTSA's EngineKW (kW × 1.34102) rather than EngineHP. */
  hpFromKw?: boolean;
  kw?: number;
  cylinders?: number;
  displacementL?: number;
  configuration?: string;
  turbo?: boolean;
  fuelPrimary?: string;
  fuelSecondary?: string;
  electrification?: string;
  model?: string;
}

export interface VinDecodeResult {
  vin: string;
  /** NHTSA decoded the VIN with no structural error (ErrorCode includes 0). */
  decodedClean: boolean;
  errorText?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  series?: string;
  bodyClass?: string;
  vehicleType?: string;
  driveType?: string;
  doors?: number;
  engine: VinEngine;
  transmission?: string;
  transmissionSpeeds?: string;
  plantCountry?: string;
  plantCity?: string;
  manufacturer?: string;
}

const HP_PER_KW = 1.34102;

/** vPIC returns "" / "Not Applicable" / "0" for absent fields — normalize to undefined. */
function cleanStr(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t || /^(not applicable|not available|n\/?a)$/i.test(t)) return undefined;
  return t;
}

function cleanNum(v: unknown): number | undefined {
  const s = cleanStr(v);
  if (s == null) return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

// Decoded VIN specs are static, so a bounded LRU is plenty (and keeps us from
// re-hitting vPIC for the same VIN). Re-inserting on hit makes eviction LRU
// rather than insertion-order, so hot VINs survive a burst of cold ones.
const vinCache = new Map<string, VinDecodeResult>();
const VIN_CACHE_MAX = 500;

// Coalesce concurrent decodes of the same VIN into one upstream request, so a
// burst of identical lookups costs vPIC exactly one call.
const inFlight = new Map<string, Promise<VinDecodeResult>>();

function cacheGet(key: string): VinDecodeResult | undefined {
  const hit = vinCache.get(key);
  if (hit === undefined) return undefined;
  vinCache.delete(key);
  vinCache.set(key, hit);
  return hit;
}

function cacheSet(key: string, value: VinDecodeResult): void {
  if (vinCache.size >= VIN_CACHE_MAX) {
    const oldest = vinCache.keys().next().value;
    if (oldest !== undefined) vinCache.delete(oldest);
  }
  vinCache.set(key, value);
}

function mapVinResponse(vin: string, r: Record<string, unknown>): VinDecodeResult {
  const errorCodes = String(r.ErrorCode ?? '')
    .split(',')
    .map((s) => s.trim());
  const hp = cleanNum(r.EngineHP);
  const kw = cleanNum(r.EngineKW);
  const engine: VinEngine = {
    hp: hp ?? (kw != null ? Math.round(kw * HP_PER_KW) : undefined),
    hpFromKw: hp == null && kw != null,
    kw,
    cylinders: cleanNum(r.EngineCylinders),
    displacementL: cleanNum(r.DisplacementL),
    configuration: cleanStr(r.EngineConfiguration),
    turbo: cleanStr(r.Turbo) ? /yes|true/i.test(String(r.Turbo)) : undefined,
    fuelPrimary: cleanStr(r.FuelTypePrimary),
    fuelSecondary: cleanStr(r.FuelTypeSecondary),
    electrification: cleanStr(r.ElectrificationLevel),
    model: cleanStr(r.EngineModel),
  };

  return {
    vin,
    decodedClean: errorCodes.includes('0'),
    errorText: cleanStr(r.ErrorText),
    year: cleanNum(r.ModelYear),
    make: cleanStr(r.Make),
    model: cleanStr(r.Model),
    trim: cleanStr(r.Trim) ?? cleanStr(r.Trim2),
    series: cleanStr(r.Series) ?? cleanStr(r.Series2),
    bodyClass: cleanStr(r.BodyClass),
    vehicleType: cleanStr(r.VehicleType),
    driveType: cleanStr(r.DriveType),
    doors: cleanNum(r.Doors),
    engine,
    transmission: cleanStr(r.TransmissionStyle),
    transmissionSpeeds: cleanStr(r.TransmissionSpeeds),
    plantCountry: cleanStr(r.PlantCountry),
    plantCity: cleanStr(r.PlantCity),
    manufacturer: cleanStr(r.Manufacturer),
  };
}

/**
 * Decode a VIN against NHTSA's free vPIC database (no key required).
 * Returns curated fields incl. engine horsepower when NHTSA has it.
 */
export async function decodeVin(vinRaw: string, modelYear?: number): Promise<VinDecodeResult> {
  const vin = vinRaw.trim().toUpperCase();
  const cacheKey = `${vin}|${modelYear ?? ''}`;

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const url = `${NHTSA_BASE_URL}/DecodeVinValues/${encodeURIComponent(vin)}?format=json${
    modelYear ? `&modelyear=${modelYear}` : ''
  }`;

  const request = axios
    .get(url, { timeout: 12_000 })
    .then((response) => {
      const raw = (response.data?.Results || [])[0] || {};
      const result = mapVinResponse(vin, raw as Record<string, unknown>);
      cacheSet(cacheKey, result);
      return result;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, request);
  return request;
}

/** Test seam — drops cached decodes so suites don't leak state between cases. */
export function __resetVinCache(): void {
  vinCache.clear();
  inFlight.clear();
}
