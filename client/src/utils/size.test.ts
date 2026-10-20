import { describe, expect, it } from 'vitest';
import type { VehicleSize } from '../types/car.types';
import { fitCheck, formatKg, formatMetres } from './size';

const crv: VehicleSize = {
  lengthCm: [459, 459],
  widthCm: [185, 185],
  heightCm: [168, 168],
  wheelbaseCm: [266, 266],
  curbWeightKg: [1502, 1580],
  measured: ['CR-V 4DR SUV FWD', 'CR-V 4DR SUV AWD'],
};

describe('size', () => {
  it('writes metres and kilograms, as a span where versions differ', () => {
    expect(formatMetres(crv.lengthCm)).toBe('4.59 m');
    expect(formatMetres([532, 589])).toBe('5.32–5.89 m');
    expect(formatKg(crv.curbWeightKg)).toBe('1,502–1,580 kg');
  });

  it('checks a measured space against the longest and widest version', () => {
    expect(fitCheck(crv, 550, 250)).toEqual({ fits: true, spareLengthCm: 91, spareWidthCm: 65 });
    expect(fitCheck(crv, 450, 250)).toMatchObject({ fits: false, spareLengthCm: -9 });
  });
});
