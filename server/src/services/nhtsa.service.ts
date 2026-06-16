import axios from 'axios';
import type { CarSpecs } from '../types/car.types.js';

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

export interface NHTSAMake {
  Make_ID: number;
  Make_Name: string;
}

export interface NHTSAModel {
  Model_ID: number;
  Model_Name: string;
}

export interface NHTSAVehicle {
  Make: string;
  Model: string;
  ModelYear: string;
  VehicleType: string;
}

/**
 * Fetch all vehicle makes from NHTSA API
 */
export async function fetchAllMakes(): Promise<NHTSAMake[]> {
  try {
    const response = await axios.get(`${NHTSA_BASE_URL}/GetAllMakes?format=json`);
    return response.data.Results || [];
  } catch (error) {
    console.error('Error fetching makes from NHTSA:', error);
    return [];
  }
}

/**
 * Fetch models for a specific make from NHTSA API
 */
export async function fetchModelsForMake(make: string): Promise<NHTSAModel[]> {
  try {
    const response = await axios.get(
      `${NHTSA_BASE_URL}/GetModelsForMake/${encodeURIComponent(make)}?format=json`
    );
    return response.data.Results || [];
  } catch (error) {
    console.error(`Error fetching models for ${make}:`, error);
    return [];
  }
}

/**
 * Fetch vehicle details by VIN
 */
export async function fetchVehicleByVIN(vin: string): Promise<any> {
  try {
    const response = await axios.get(
      `${NHTSA_BASE_URL}/DecodeVin/${vin}?format=json`
    );
    return response.data.Results || [];
  } catch (error) {
    console.error(`Error fetching vehicle with VIN ${vin}:`, error);
    return null;
  }
}

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

// Decoded VIN specs are static, so a simple bounded in-memory cache is plenty
// (and keeps us from re-hitting vPIC for the same VIN).
const vinCache = new Map<string, VinDecodeResult>();
const VIN_CACHE_MAX = 500;

/**
 * Decode a VIN against NHTSA's free vPIC database (no key required).
 * Returns curated fields incl. engine horsepower when NHTSA has it.
 */
export async function decodeVin(vinRaw: string, modelYear?: number): Promise<VinDecodeResult> {
  const vin = vinRaw.trim().toUpperCase();
  const cacheKey = `${vin}|${modelYear ?? ''}`;
  const cached = vinCache.get(cacheKey);
  if (cached) return cached;

  const url = `${NHTSA_BASE_URL}/DecodeVinValues/${encodeURIComponent(vin)}?format=json${
    modelYear ? `&modelyear=${modelYear}` : ''
  }`;
  const response = await axios.get(url, { timeout: 12000 });
  const r = (response.data?.Results || [])[0] || {};

  const errorCodes = String(r.ErrorCode ?? '').split(',').map((s: string) => s.trim());
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

  const result: VinDecodeResult = {
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

  if (vinCache.size >= VIN_CACHE_MAX) {
    const first = vinCache.keys().next().value;
    if (first !== undefined) vinCache.delete(first);
  }
  vinCache.set(cacheKey, result);
  return result;
}

/**
 * Fetch vehicles for a specific make/model/year
 */
export async function fetchVehiclesByMakeModelYear(
  make: string,
  model: string,
  year: number
): Promise<any> {
  try {
    const response = await axios.get(
      `${NHTSA_BASE_URL}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
    );
    return response.data.Results || [];
  } catch (error) {
    console.error(`Error fetching vehicles for ${make} ${model} ${year}:`, error);
    return [];
  }
}

/**
 * Fetch all models for a specific make and year
 */
export async function fetchModelsForMakeYear(make: string, year: number): Promise<NHTSAModel[]> {
  try {
    const response = await axios.get(
      `${NHTSA_BASE_URL}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
    );
    return response.data.Results || [];
  } catch (error) {
    console.error(`Error fetching models for ${make} ${year}:`, error);
    return [];
  }
}

/**
 * Fetch safety ratings for a specific make/model/year
 */
export async function fetchSafetyRatings(make: string, model: string, year: number): Promise<any> {
  try {
    const response = await axios.get(
      `https://api.nhtsa.gov/SafetyRatings/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}?format=json`
    );
    return response.data.Results || [];
  } catch (error) {
    console.error(`Error fetching safety ratings for ${make} ${model} ${year}:`, error);
    return [];
  }
}

/**
 * Fetch detailed vehicle specifications using WMI (World Manufacturer Identifier)
 */
export async function fetchVehicleSpecifications(make: string, model: string, year: number): Promise<any> {
  try {
    const response = await axios.get(
      `${NHTSA_BASE_URL}/GetVehicleVariableValuesList/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}/year/${year}?format=json`
    );
    return response.data.Results || [];
  } catch (error) {
    console.error(`Error fetching specifications for ${make} ${model} ${year}:`, error);
    return [];
  }
}

/**
 * Fetch all makes for a specific year
 */
export async function fetchMakesForYear(year: number): Promise<NHTSAMake[]> {
  try {
    const response = await axios.get(
      `${NHTSA_BASE_URL}/GetMakesForVehicleType/car?year=${year}&format=json`
    );
    return response.data.Results || [];
  } catch (error) {
    console.error(`Error fetching makes for year ${year}:`, error);
    return [];
  }
}
