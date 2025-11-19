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
