import { describe, expect, it } from 'vitest';
import type { VehicleSize } from '../types/car.types';
import {
  feetAndInches,
  fitCheck,
  formatFeet,
  formatGap,
  formatKg,
  formatLb,
  formatMetres,
  sizeVsClass,
  volumeVsClass,
} from './size';

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

  it('gives feet and inches, and pounds, beside them', () => {
    expect(feetAndInches(459)).toBe('15 ft 1 in');
    expect(feetAndInches(182.88)).toBe('6 ft');
    expect(feetAndInches(20)).toBe('8 in');
    expect(formatFeet(crv.widthCm)).toBe('6 ft 1 in');
    expect(formatFeet([532, 589])).toBe('17 ft 5 in – 19 ft 4 in');
    expect(formatLb(crv.curbWeightKg)).toBe('3,311–3,483 lb');
  });

  it('says how a measurement sits against the class, in words', () => {
    expect(sizeVsClass('length', [477, 477], 459, 'Compact SUV')).toBe(
      '18 cm longer than a typical compact SUV',
    );
    expect(sizeVsClass('height', [150, 150], 168, 'Compact SUV')).toBe(
      '18 cm lower than a typical compact SUV',
    );
    // A few centimetres a parking spot never notices.
    expect(sizeVsClass('length', [461, 461], 459, 'Compact SUV')).toBe(
      'About the same length as a typical compact SUV',
    );
    expect(sizeVsClass('weight', [1620, 1620], 1600, 'Compact SUV')).toBe(
      'About as heavy as a typical compact SUV',
    );
  });

  it('compares a span by its nearer end, or says the class falls inside it', () => {
    expect(sizeVsClass('length', [532, 589], 560, 'Full-size pickup')).toBe(
      'A typical full-size pickup falls within this range',
    );
    expect(sizeVsClass('weight', crv.curbWeightKg, 1400, 'Compact SUV')).toBe(
      'At least 102 kg heavier than a typical compact SUV',
    );
  });

  it('compares EPA’s volumes in litres, whole cubic feet apart', () => {
    expect(volumeVsClass('trunk', { car: 15, median: 14.5, models: 5 }, 'Compact car')).toBe(
      'About the same as a typical compact car’s trunk',
    );
    expect(volumeVsClass('trunk', { car: 14, median: 16, models: 7 }, 'Midsize car')).toBe(
      '57 L less than a typical midsize car’s trunk',
    );
    expect(volumeVsClass('cargo', { car: 26, median: 23, models: 3 }, 'Compact car')).toBe(
      '85 L more than a typical compact car’s cargo space',
    );
    expect(volumeVsClass('passenger', { car: 95, median: 99, models: 5 }, 'Compact car')).toBe(
      '113 L less room than a typical compact car',
    );
  });

  it('checks a measured space against the longest and widest version', () => {
    expect(fitCheck(crv, 550, 250)).toEqual({ fits: true, spareLengthCm: 91, spareWidthCm: 65 });
    expect(fitCheck(crv, 450, 250)).toMatchObject({ fits: false, spareLengthCm: -9 });
  });

  it('gives the gap in the unit the space was measured in', () => {
    expect(formatGap(91, 'm')).toBe('91 cm');
    expect(formatGap(125, 'm')).toBe('1.25 m');
    expect(formatGap(-9, 'ft')).toBe('4 in');
    expect(formatGap(125, 'ft')).toBe('4 ft 1 in');
  });
});
