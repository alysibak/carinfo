import { describe, expect, it } from 'vitest';
import {
  aspirationOf,
  baseCarId,
  configurationKey,
  type EpaRow,
  mapEpaRow,
  mapVClassToBodyStyle,
  variantCarId,
} from './epa-row.js';

function row(overrides: Partial<EpaRow>): EpaRow {
  return {
    id: '41747',
    make: 'Honda',
    model: 'Civic 5Dr',
    year: '2020',
    trany: 'Manual 6-spd',
    baseModel: 'Civic',
    drive: 'Front-Wheel Drive',
    cylinders: '4',
    displ: '1.5',
    city08: '28',
    highway08: '37',
    comb08: '32',
    co2: '280',
    fuelCost08: '1500',
    fuelType: 'Regular',
    fuelType1: 'Regular Gasoline',
    atvType: '',
    VClass: 'Large Cars',
    tCharger: 'T',
    sCharger: '',
    eng_dscr: 'SIDI',
    ...overrides,
  };
}

describe('EPA row mapping', () => {
  it('tells a second engine with the same gearbox apart from the first', () => {
    // The 2020 Civic hatch 1.5T manual and the Type R (2.0T manual) share
    // model, year and transmission; the old importer kept only one.
    const sport = row({});
    const typeR = row({ id: '42501', displ: '2.0', comb08: '25', fuelType1: 'Premium Gasoline' });
    expect(configurationKey(sport)).not.toBe(configurationKey(typeR));
    expect(baseCarId(sport)).toBe(baseCarId(typeR));
    expect(variantCarId(typeR)).toBe(`${baseCarId(typeR)}-epa42501`);
  });

  it('treats emissions variants of one configuration as the same listing', () => {
    const federal = row({ eng_dscr: 'SIDI' });
    const california = row({ id: '41748', eng_dscr: 'SIDI; PZEV', comb08: '31' });
    expect(configurationKey(california)).toBe(configurationKey(federal));
  });

  it('keeps engine codes that name a different engine', () => {
    const sohc = row({ displ: '3.0', cylinders: '6', tCharger: '', eng_dscr: 'SOHC (FFS)' });
    const dohc = row({ displ: '3.0', cylinders: '6', tCharger: '', eng_dscr: 'DOHC (FFS)' });
    expect(configurationKey(sohc)).not.toBe(configurationKey(dohc));
  });

  it('reads forced induction', () => {
    expect(aspirationOf(row({ tCharger: 'T' }))).toBe('turbocharged');
    expect(aspirationOf(row({ tCharger: '', sCharger: 'S' }))).toBe('supercharged');
    expect(aspirationOf(row({ tCharger: 'T', sCharger: 'S' }))).toBe(
      'turbocharged and supercharged',
    );
    expect(aspirationOf(row({ tCharger: '', sCharger: '' }))).toBeUndefined();
    expect(mapEpaRow(row({}), 2027)?.engine.aspiration).toBe('turbocharged');
  });

  it('reads the body of a "Special Purpose Vehicle" from its name', () => {
    const sp = 'Special Purpose Vehicle 2WD';
    expect(mapVClassToBodyStyle(sp, 'Ford Explorer 2WD')).toBe('suv');
    expect(mapVClassToBodyStyle(sp, 'Dodge Caravan/Grand Caravan 2WD')).toBe('minivan');
    expect(mapVClassToBodyStyle(sp, 'Ford Transit Connect Wagon FWD')).toBe('van');
    expect(mapVClassToBodyStyle(sp, 'Chevrolet Silverado Cab Chassis 2WD')).toBe('truck');
    for (const specialty of [
      'Cadillac XTS Hearse',
      'Lincoln MKT Livery AWD',
      'Nissan NV200 NYC Taxi',
    ]) {
      expect(mapVClassToBodyStyle(sp, specialty), specialty).toBeNull();
    }
  });

  it("imports next year's early certifications but nothing further out", () => {
    expect(mapEpaRow(row({ year: '2027' }), 2027)).not.toBeNull();
    expect(mapEpaRow(row({ year: '2028' }), 2027)).toBeNull();
    expect(mapEpaRow(row({ year: '1994' }), 2027)).toBeNull();
  });
});
