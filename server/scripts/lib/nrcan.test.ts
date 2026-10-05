import { describe, expect, it } from 'vitest';
import {
  assignNrcanIds,
  canadianModelOf,
  cleanModel,
  driveFromName,
  mapNrcanRow,
  type NrcanRow,
  transmissionDescription,
} from './nrcan.js';

function row(overrides: NrcanRow): NrcanRow {
  return {
    'Model year': '2006',
    Make: 'Acura',
    Model: 'CSX',
    'Vehicle class': 'Compact',
    'Engine size (L)': '2.0',
    Cylinders: '4',
    Transmission: 'AS5',
    'Fuel type': 'Z',
    'City (L/100 km)': '10.9',
    'Highway (L/100 km)': '7.8',
    'Combined (L/100 km)': '9.5',
    'CO2 emissions (g/km)': '219',
    ...overrides,
  };
}

describe('NRCan rows', () => {
  it('reads gearbox codes as EPA writes them', () => {
    expect(transmissionDescription('M5')).toBe('Manual 5-spd');
    expect(transmissionDescription('A4')).toBe('Automatic 4-spd');
    expect(transmissionDescription('AS6')).toBe('Automatic (S6)');
    expect(transmissionDescription('AM7')).toBe('Automatic (AM7)');
    expect(transmissionDescription('AV')).toBe('Automatic (variable gear ratios)');
    expect(transmissionDescription('AV8')).toBe('Automatic (AV-S8)');
    expect(transmissionDescription('A1')).toBe('Automatic (A1)');
  });

  it('takes the drive from the name, else the model', () => {
    expect(driveFromName('Qashqai AWD', 'FWD')).toEqual({ drive: 'AWD', named: true });
    expect(driveFromName('C 230 4MATIC', 'FWD')).toEqual({ drive: 'AWD', named: true });
    expect(driveFromName('RVR 4WD', 'FWD')).toEqual({ drive: '4WD', named: true });
    expect(driveFromName('Sunrunner Convertible', 'RWD')).toEqual({ drive: 'RWD', named: false });
  });

  it('keeps footnotes and gearbox notes out of the name', () => {
    expect(cleanModel('Pursuit #')).toBe('Pursuit');
    expect(cleanModel('Intrepid ES (Autostick)')).toBe('Intrepid ES');
    expect(cleanModel('CX-3 (SIL)')).toBe('CX-3');
  });

  it('imports only the listed models, in their Canadian years', () => {
    expect(canadianModelOf(row({}))?.why).toBe('Canada-only Acura');
    expect(canadianModelOf(row({ 'Model year': '2012' }))).toBeUndefined();
    // NRCan's spellings of cars EPA lists are not imported.
    expect(canadianModelOf(row({ Make: 'Audi', Model: 'A8L' }))).toBeUndefined();
    expect(
      canadianModelOf(row({ Make: 'Pontiac', Model: 'Pursuit #', 'Model year': '2005' })),
    ).toBeDefined();
  });

  it("stores NRCan's litres in EPA's units, credited to NRCan", () => {
    const entry = canadianModelOf(row({}))!;
    const car = mapNrcanRow(row({}), entry);
    expect(car.fuelEconomy.combined).toBe(24.8); // 235.215 / 9.5
    expect(235.215 / car.fuelEconomy.combined!).toBeCloseTo(9.5, 1);
    expect(car.epa?.co2).toBe(352); // 219 g/km in g/mi
    expect(car.transmission).toMatchObject({ type: 'automatic', speeds: 5 });
    expect(car).toMatchObject({ make: 'Acura', model: 'CSX', year: 2006, driveType: 'FWD' });
    expect(car.bodyStyle).toBe('sedan');
    expect(car.epaId).toBeUndefined();
    expect(car.provenance).toMatchObject({
      make: 'nrcan',
      'fuelEconomy.combined': 'nrcan',
      driveType: 'estimated',
      countryOfOrigin: 'estimated',
    });
  });

  it('reads a battery-electric row from its own columns', () => {
    const ev: NrcanRow = {
      'Model year': '2026',
      Make: 'Kia',
      Model: 'EV4 Wind',
      'Vehicle class': 'Mid-size',
      'Motor (kW)': '150',
      Transmission: 'A1',
      'Fuel type': 'B',
      'City (Le/100 km)': '1.8',
      'Highway (Le/100 km)': '2.0',
      'Combined (Le/100 km)': '1.9',
      'Combined (kWh/100 km)': '16.8',
      'Range (km)': '552',
      'CO2 emissions (g/km)': '0',
      'Recharge time (h)': '8.1',
    };
    const car = mapNrcanRow(ev, canadianModelOf(ev)!);
    expect(car.engine).toEqual({ fuelType: 'electric' });
    expect(car.fuelEconomy.combined).toBe(123.8); // MPGe
    expect(car.epa).toMatchObject({ kWhPer100Mi: 27.04, rangeMiles: 343, charge240Hours: 8.1 });
    expect(car.provenance['epa.rangeMiles']).toBe('nrcan');
  });

  it('files crossovers NRCan calls wagons as SUVs, as their US twins are', () => {
    const qashqai = row({
      'Model year': '2020',
      Make: 'Nissan',
      Model: 'Qashqai AWD',
      'Vehicle class': 'Station wagon: Small',
    });
    const car = mapNrcanRow(qashqai, canadianModelOf(qashqai)!);
    expect(car.bodyStyle).toBe('suv');
    expect(car.epa?.vClass).toBe('Small Sport Utility Vehicle');
  });

  it('gives an Autostick its select-shift gearbox and SIL its own trim', () => {
    const intrepid = row({
      'Model year': '1997',
      Make: 'Chrysler',
      Model: 'Intrepid (Autostick)',
      Transmission: 'A4',
    });
    expect(mapNrcanRow(intrepid, canadianModelOf(intrepid)!).transmission.description).toBe(
      'Automatic (S4)',
    );
    const sil = row({
      'Model year': '2022',
      Make: 'Mazda',
      Model: 'CX-3 (SIL)',
      Transmission: 'M6',
    });
    expect(mapNrcanRow(sil, canadianModelOf(sil)!).trim).toBe('cx-3-sil-manual-6-spd');
  });

  it('gives every listing its own ID, apart from EPA', () => {
    const entry = canadianModelOf(row({}))!;
    const [a, b, c] = assignNrcanIds([
      mapNrcanRow(row({}), entry),
      mapNrcanRow(row({ 'Engine size (L)': '2.4' }), entry),
      mapNrcanRow(row({ 'Engine size (L)': '2.4', 'Fuel type': 'X' }), entry),
    ]);
    expect(a.id).toBe('acura-csx-2006-csx-automatic-s5-ca');
    expect(b.id).toBe('acura-csx-2006-csx-automatic-s5-ca-2-4l');
    expect(c.id).toBe('acura-csx-2006-csx-automatic-s5-ca-2');
  });
});
