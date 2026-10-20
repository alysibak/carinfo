import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import {
  measured,
  sizeOf,
  specConfiguration,
  specModelName,
  withSizes,
  type CanadianSpecRow,
} from './canadian-specs.js';

const row = (Model: string, over: Partial<CanadianSpecRow> = {}): CanadianSpecRow => ({
  year: 2017,
  Make: 'HONDA',
  Model,
  MYR: '17',
  OL: '459',
  OW: '185',
  OH: '168',
  WB: '266',
  CW: '1502',
  ...over,
});

describe('Transport Canada’s names', () => {
  it('reads the model out from the body, cab, box and drive', () => {
    expect(specModelName('F-150 P/U SUPERCREW 5.5-FT BOX 4X4')).toBe('F-150');
    expect(specModelName('INTEGRA 2DR COUPE RS/LS/GS-R')).toBe('INTEGRA RS/LS/GS-R');
    expect(specModelName('S-10 F/SIDE REG CAB 2WD')).toBe('S-10');
    expect(specModelName('CR-V 4DR SUV AWD')).toBe('CR-V');
  });

  it('reads the body and drive, and leaves the make out of the version', () => {
    expect(specConfiguration('F-150 P/U SUPERCREW 5.5-FT BOX 4X4')).toMatchObject({
      body: 'truck',
      drive: '4wd',
    });
    expect(specConfiguration('MX-5 MIATA CONVERTIBLE').body).toBe('convertible');
    expect(specConfiguration('3 SERIES CABRIOLET 328i RWD')).toMatchObject({
      body: 'convertible',
      drive: 'rwd',
    });
    expect(specConfiguration('BMW 328i 4DR SEDAN', 'BMW').name).toEqual(['328i']);
  });
});

describe('measurements', () => {
  it('takes a row in centimetres and kilograms, and none with a measure missing', () => {
    expect(measured(row('CR-V 4DR SUV FWD'))).toMatchObject({
      lengthCm: 459,
      widthCm: 185,
      curbWeightKg: 1502,
    });
    expect(measured(row('CR-V 4DR SUV FWD', { CW: '' }))).toBeNull();
    // A metre-long "car" is a typing error, not a car.
    expect(measured(row('CR-V 4DR SUV FWD', { OL: '100' }))).toBeNull();
  });

  it('gives one figure where versions agree and a span where they differ', () => {
    const size = sizeOf([measured(row('A'))!, measured(row('B', { OL: '480', CW: '1580' }))!]);
    expect(size.lengthCm).toEqual([459, 480]);
    expect(size.widthCm).toEqual([185, 185]);
    expect(size.curbWeightKg).toEqual([1502, 1580]);
    expect(size.measured).toEqual(['A', 'B']);
  });

  it('sizes a car from its own year’s rows, by drive', () => {
    const rows = [
      measured(row('CR-V 4DR SUV FWD'))!,
      measured(row('CR-V 4DR SUV AWD', { CW: '1580' }))!,
      // Another year's design is not this car's.
      measured(row('CR-V 4DR SUV AWD', { year: 2016, OL: '455', CW: '1550' }))!,
    ];
    const car = {
      id: 'crv',
      make: 'Honda',
      model: 'CR-V AWD',
      year: 2017,
      bodyStyle: 'suv',
      driveType: 'AWD',
      engine: { fuelType: 'gasoline' },
    } as Car;
    const { cars, sized } = withSizes(
      [car],
      rows,
      () => 'honda|cr-v',
      (_make, model) => (model === 'CR-V' ? 'honda|cr-v' : null),
    );
    expect(sized).toBe(1);
    expect(cars[0].size).toMatchObject({ lengthCm: [459, 459], curbWeightKg: [1580, 1580] });
  });
});
