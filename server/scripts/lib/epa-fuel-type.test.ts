import { describe, expect, it } from 'vitest';
import { mapEpaFuelType } from './epa-fuel-type.js';

describe('mapEpaFuelType', () => {
  it.each([
    // [fuelType, atvType, expected] — real EPA vehicles.csv values
    ['Regular', '', 'gasoline'],
    ['Premium', '', 'gasoline'],
    ['Diesel', 'Diesel', 'diesel'],
    ['Regular', 'Hybrid', 'hybrid'],
    ['Electricity', 'EV', 'electric'],
    ['Hydrogen', 'FCV', 'hydrogen'],
    ['Electricity and Hydrogen', 'eFCV', 'hydrogen'],
    // The combined string names both fuels; atvType decides.
    ['Premium Gas or Electricity', 'Plug-in Hybrid', 'plug-in hybrid'],
    ['Regular Gas and Electricity', 'Plug-in Hybrid', 'plug-in hybrid'],
    // Dedicated natural gas used to fall through to gasoline.
    ['CNG', 'CNG', 'natural gas'],
    ['CNG', '', 'natural gas'],
    // Bi-fuel and flex-fuel figures are gasoline figures.
    ['Gasoline or natural gas', 'Bifuel (CNG)', 'gasoline'],
    ['Gasoline or propane', 'Bifuel (LPG)', 'gasoline'],
    ['Gasoline or E85', 'FFV', 'gasoline'],
  ])('maps fuelType %j / atvType %j to %s', (fuelType, atvType, expected) => {
    expect(mapEpaFuelType({ fuelType, atvType })).toBe(expected);
  });

  it('recognizes fuel-cell models by name when EPA leaves the type blank', () => {
    expect(mapEpaFuelType({ fuelType: '', model: 'Mirai' })).toBe('hydrogen');
  });
});
