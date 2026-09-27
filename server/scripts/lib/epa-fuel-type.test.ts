import { describe, expect, it } from 'vitest';
import { isEpaMildHybrid, mapEpaFuelType } from './epa-fuel-type.js';

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

describe('isEpaMildHybrid', () => {
  // Real EPA rows: atvType "Hybrid" for all four.
  const s8 = {
    fuelType: 'Premium',
    atvType: 'Hybrid',
    eng_dscr: 'SIDI; Mild Hybrid',
    evMotor: '48V Li-Ion',
  };
  const ram = {
    fuelType: 'Regular',
    atvType: 'Hybrid',
    eng_dscr: 'Mild Hybrid; eTorque',
    evMotor: '48V Li-Ion',
  };
  const ux = {
    fuelType: 'Regular',
    atvType: 'Hybrid',
    eng_dscr: 'SIDI & PFI; Mild Hybrid',
    evMotor: '216V Ni-MH',
  };
  const maverick = {
    fuelType: 'Regular',
    atvType: 'Hybrid',
    eng_dscr: 'Hybrid',
    evMotor: '48V Li-Ion',
  };

  it('lists a mild hybrid by its fuel', () => {
    // An Audi S8 at 16 MPG and a Ram eTorque were "hybrids".
    expect(isEpaMildHybrid(s8)).toBe(true);
    expect(mapEpaFuelType(s8)).toBe('gasoline');
    expect(mapEpaFuelType(ram)).toBe('gasoline');
    expect(mapEpaFuelType({ ...ram, fuelType: 'Diesel' })).toBe('diesel');
  });

  it('keeps full hybrids EPA mislabels or gives a small motor', () => {
    // The UX 250h's Ni-MH pack is a full hybrid's, whatever the notes say.
    expect(isEpaMildHybrid(ux)).toBe(false);
    expect(mapEpaFuelType(ux)).toBe('hybrid');
    expect(mapEpaFuelType(maverick)).toBe('hybrid');
    expect(isEpaMildHybrid({ ...s8, atvType: 'Plug-in Hybrid' })).toBe(false);
  });
});
