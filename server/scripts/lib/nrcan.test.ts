import { describe, expect, it } from 'vitest';
import {
  assignNrcanIds,
  canadianModelOf,
  cleanModel,
  driveFromName,
  engineListedByEpa,
  epaSpelling,
  listedByEpa,
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
    expect(cleanModel('iX xDrive40 (20" Wheels)')).toBe('iX xDrive40 (20 inch Wheels)');
    expect(cleanModel('AMG S 63 E PERFORMANCE Sedan')).toBe('AMG S 63 E Performance Sedan');
  });

  it('imports only the listed models, in their Canadian years', () => {
    expect(canadianModelOf(row({}))?.why).toBe('Canada-only Acura');
    expect(canadianModelOf(row({ 'Model year': '2012' }))).toBeUndefined();
    // A flex-fuel car's E85 rating: the site lists it by its gasoline one.
    const montana = { 'Model year': '2007', Make: 'Pontiac', Model: 'Montana SV6 FFV' };
    expect(canadianModelOf(row({ ...montana, 'Fuel type': 'X' }))).toBeDefined();
    expect(canadianModelOf(row({ ...montana, 'Fuel type': 'E' }))).toBeUndefined();
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

  it("reads a plug-in hybrid's gas and electric modes, as EPA's enrichment gives them", () => {
    const gle: NrcanRow = {
      'Model year': '2024',
      Make: 'Mercedes-Benz',
      Model: 'GLE 450e 4MATIC SUV ',
      'Vehicle class': 'Sport utility vehicle: Standard',
      'Motor (kW)': '100',
      'Engine size (L)': '2.0',
      Cylinders: '4',
      Transmission: 'A9',
      'Fuel type 1': 'B/Z*',
      'Combined Le/100 km': '4.1 ([36.4 kWh + 0.0 L]/100 km)',
      'Range 1 (km)': '77',
      'Recharge time (h)': '2.75',
      'Fuel type 2': 'Z',
      'City (L/100 km)': '10.5',
      'Highway (L/100 km)': '9.1',
      'Combined (L/100 km)': '9.9',
      'Range 2 (km)': '663',
      'CO2 emissions (g/km)': '63',
    };
    const car = mapNrcanRow(gle, canadianModelOf(gle)!);
    expect(car.engine).toMatchObject({ fuelType: 'plug-in hybrid', displacement: 2, cylinders: 4 });
    expect(car.fuelEconomy.combined).toBe(23.8); // gas mode: 235.215 / 9.9
    expect(car.epa).toMatchObject({
      rangeMiles: 48,
      charge240Hours: 2.75,
      phev: { gasMpg: 24, electricMpge: 57, electricRangeMi: 48, chargeL2Hours: 2.75 },
    });
    expect(car.driveType).toBe('AWD');
  });

  it("takes NRCan's spelling of a make and gives the car EPA's", () => {
    const ineos = row({
      'Model year': '2026',
      Make: 'INEOS',
      Model: 'Grenadier Station Wagon',
      'Vehicle class': 'Sport utility vehicle: Standard',
    });
    const entry = canadianModelOf(ineos)!;
    expect(mapNrcanRow(ineos, entry)).toMatchObject({ make: 'INEOS Automotive', driveType: '4WD' });
  });

  it('stops taking a year once EPA lists the model', () => {
    const gr86 = row({ 'Model year': '2026', Make: 'Toyota', Model: 'GR86' });
    const entry = canadianModelOf(gr86)!;
    expect(listedByEpa(entry, 'GR86', ['GR Corolla', 'Camry'])).toBe(false);
    expect(listedByEpa(entry, 'GR86', ['GR 86'])).toBe(true);
    // Without EPA's spelling, a model of the same first word: "B 250" is not EPA's "B250e".
    const b250 = row({ 'Model year': '2016', Make: 'Mercedes-Benz', Model: 'B 250' });
    expect(listedByEpa(canadianModelOf(b250)!, 'B 250', ['B250e'])).toBe(false);
    expect(listedByEpa(canadianModelOf(b250)!, 'B 250', ['B250 4matic'])).toBe(true);
  });

  it("names a year from NRCan as EPA names the model's other years", () => {
    expect(epaSpelling('GR86', ['GR 86', 'GR Corolla'])).toBe('GR 86');
    expect(epaSpelling('S 580e 4MATIC Sedan', ['S580 4matic', 'S580e 4matic'])).toBe(
      'S580e 4matic',
    );
    // The SUV keeps EPA's "(SUV)" where EPA has one, rather than the sedan's name.
    expect(epaSpelling('EQE 350 4MATIC SUV', ['EQE 350 4matic', 'EQE 350 4matic (SUV)'])).toBe(
      'EQE 350 4matic (SUV)',
    );
    expect(epaSpelling('Qashqai', ['Rogue Sport'])).toBeUndefined();
  });

  it('takes an engine EPA lacks for a model it lists, not one it has', () => {
    const g70 = (litres: string, cylinders: string) =>
      row({
        'Model year': '2024',
        Make: 'Genesis',
        Model: 'G70 AWD',
        'Vehicle class': 'Compact',
        'Engine size (L)': litres,
        Cylinders: cylinders,
        Transmission: 'AS8',
      });
    const entry = canadianModelOf(g70('3.3', '6'))!;
    expect(entry.sameEngineOnly).toBe(true);
    // EPA's 2024 file has the 2.5T G70 only.
    const epa = [mapNrcanRow(g70('2.5', '4'), entry, 'G70 AWD')];
    expect(engineListedByEpa(entry, mapNrcanRow(g70('3.3', '6'), entry), epa)).toBe(false);
    expect(engineListedByEpa(entry, mapNrcanRow(g70('2.5', '4'), entry), epa)).toBe(true);
    // A plug-in is another engine than the gasoline car of the same size.
    const x3 = {
      'Model year': '2024',
      Make: 'BMW',
      Model: 'X3 xDrive30e',
      'Vehicle class': 'Sport utility vehicle: Small',
      'Engine size (L)': '2.0',
      Cylinders: '4',
      Transmission: 'AS8',
      'Fuel type 1': 'B/Z*',
      'Combined Le/100 km': '3.9 ([22.0 kWh + 1.5 L]/100 km)',
      'Range 1 (km)': '29',
      'Fuel type 2': 'Z',
      'Combined (L/100 km)': '9.2',
      'CO2 emissions (g/km)': '120',
    };
    const plugIn = mapNrcanRow(x3, canadianModelOf(x3)!);
    const gasX3 = { ...mapNrcanRow(g70('2.0', '4'), entry), make: 'BMW', model: 'X3 xDrive30i' };
    expect(engineListedByEpa(canadianModelOf(x3)!, plugIn, [gasX3])).toBe(false);
  });
});
