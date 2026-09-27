import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types.js';
import { isThreeRow } from './three-row.js';

const car = (make: string, model: string, bodyStyle: CarSpecs['bodyStyle'] = 'suv', year = 2020) =>
  ({ make, model, bodyStyle, year }) as CarSpecs;

describe('isThreeRow', () => {
  it('knows the three-row SUVs, minivans and passenger vans', () => {
    for (const [make, model] of [
      ['Kia', 'Telluride AWD'],
      ['Toyota', 'Grand Highlander Hybrid'],
      ['Volkswagen', 'Atlas 4motion'],
      ['Mercedes-Benz', 'GLS450 4matic'],
      ['Tesla', 'Model X Long Range'],
    ]) {
      expect(isThreeRow(car(make, model)), model).toBe(true);
    }
    expect(isThreeRow(car('Honda', 'Odyssey', 'minivan'))).toBe(true);
    expect(isThreeRow(car('Ford', 'Transit T150 Wagon', 'van'))).toBe(true);
  });

  it('leaves out two-row models that share a name', () => {
    expect(isThreeRow(car('Volkswagen', 'Atlas Cross Sport'))).toBe(false);
    expect(isThreeRow(car('Land Rover', 'Discovery Sport'))).toBe(false);
    expect(isThreeRow(car('Toyota', 'RAV4'))).toBe(false);
    expect(isThreeRow(car('Ford', 'Transit Connect Van', 'van'))).toBe(false);
    expect(isThreeRow(car('Jeep', 'Wagoneer S AWD (Falken tire)'))).toBe(false);
    expect(isThreeRow(car('Mercedes-Benz', 'GLS600 4matic Maybach'))).toBe(false);
    expect(isThreeRow(car('Ford', 'Explorer Sport 4WD', 'suv', 2002))).toBe(false);
    expect(isThreeRow(car('Isuzu', 'Ascender 5-passenger 4WD', 'suv', 2006))).toBe(false);
  });

  it('knows the pickups EPA filed as SUVs have two rows', () => {
    expect(isThreeRow(car('Cadillac', 'Escalade Ext AWD', 'truck', 2010))).toBe(false);
    expect(isThreeRow(car('Cadillac', 'Escalade ESV AWD', 'suv', 2010))).toBe(true);
  });

  it('reads the rows Lucid puts in the name', () => {
    expect(isThreeRow(car('Lucid', 'Gravity GT w/21F22R wheels (3R)', 'suv', 2026))).toBe(true);
    expect(isThreeRow(car('Lucid', 'Gravity GT w/21F22R wheels (2R)', 'suv', 2026))).toBe(false);
  });

  it('knows the years a line had a third row', () => {
    // The 2024 Land Cruiser is a two-row SUV in North America.
    expect(isThreeRow(car('Toyota', 'Land Cruiser Wagon 4WD', 'suv', 2021))).toBe(true);
    expect(isThreeRow(car('Toyota', 'Land Cruiser', 'suv', 2025))).toBe(false);
    // Lines that began with two rows.
    expect(isThreeRow(car('Toyota', 'Highlander 4WD', 'suv', 2002))).toBe(false);
    expect(isThreeRow(car('Toyota', 'Highlander 4WD', 'suv', 2008))).toBe(true);
    expect(isThreeRow(car('Kia', 'Sorento 4WD', 'suv', 2008))).toBe(false);
    expect(isThreeRow(car('Nissan', 'Pathfinder Armada 4WD', 'suv', 2004))).toBe(true);
    expect(isThreeRow(car('Nissan', 'Pathfinder 4WD', 'suv', 2004))).toBe(false);
    expect(isThreeRow(car('Mitsubishi', 'Outlander PHEV', 'suv', 2020))).toBe(false);
    expect(isThreeRow(car('Mitsubishi', 'Outlander PHEV', 'suv', 2024))).toBe(true);
    expect(isThreeRow(car('Chevrolet', 'Tahoe 1500 4WD', 'suv', 1997))).toBe(false);
    // Lines that had one for a while: the Santa Fe from 2024, the 2018-24 Tiguan.
    expect(isThreeRow(car('Hyundai', 'Santa Fe AWD', 'suv', 2022))).toBe(false);
    expect(isThreeRow(car('Hyundai', 'Santa Fe Hybrid AWD', 'suv', 2025))).toBe(true);
    expect(isThreeRow(car('Volkswagen', 'Tiguan', 'suv', 2019))).toBe(true);
    expect(isThreeRow(car('Volkswagen', 'Tiguan Limited', 'suv', 2018))).toBe(false);
    expect(isThreeRow(car('Volkswagen', 'Tiguan', 'suv', 2025))).toBe(false);
  });
});
