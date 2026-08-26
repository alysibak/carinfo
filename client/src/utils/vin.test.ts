import { describe, expect, it } from 'vitest';
import { extractVinFromScan, isLikelyVin, vinCheckDigitValid } from './vin';

// 2003 Honda Accord — the VIN page's own sample, known check-digit-valid.
const VALID_VIN = '1HGCM82633A004352';

describe('isLikelyVin', () => {
  it('accepts a 17-char VIN', () => {
    expect(isLikelyVin(VALID_VIN)).toBe(true);
  });

  it('rejects wrong lengths and excluded letters', () => {
    expect(isLikelyVin(VALID_VIN.slice(0, 16))).toBe(false);
    expect(isLikelyVin(`${VALID_VIN}A`)).toBe(false);
    expect(isLikelyVin('1HGCM82633A00435I')).toBe(false); // I excluded
    expect(isLikelyVin('1HGCM82633A00435O')).toBe(false); // O excluded
    expect(isLikelyVin('1HGCM82633A00435Q')).toBe(false); // Q excluded
  });
});

describe('vinCheckDigitValid', () => {
  it('validates a correct check digit', () => {
    expect(vinCheckDigitValid(VALID_VIN)).toBe(true);
  });

  it('fails when any character is corrupted', () => {
    expect(vinCheckDigitValid(VALID_VIN.replace('M', 'W'))).toBe(false);
  });
});

describe('extractVinFromScan', () => {
  it('returns a plain 17-char read as-is', () => {
    expect(extractVinFromScan(VALID_VIN)).toBe(VALID_VIN);
  });

  it('handles lowercase input', () => {
    expect(extractVinFromScan(VALID_VIN.toLowerCase())).toBe(VALID_VIN);
  });

  it('strips Code 39 asterisk guards and whitespace', () => {
    expect(extractVinFromScan(`*${VALID_VIN}*`)).toBe(VALID_VIN);
    expect(extractVinFromScan(`  ${VALID_VIN}\n`)).toBe(VALID_VIN);
  });

  it('drops the Code 39 "I" import prefix', () => {
    expect(extractVinFromScan(`I${VALID_VIN}`)).toBe(VALID_VIN);
  });

  it('finds a check-digit-valid VIN inside a longer payload', () => {
    expect(extractVinFromScan(`XX99${VALID_VIN}77YZ`)).toBe(VALID_VIN);
  });

  it('accepts an exact-length read even when the check digit fails', () => {
    const nonNorthAmerican = VALID_VIN.replace('M', 'W'); // corrupt check digit
    expect(extractVinFromScan(nonNorthAmerican)).toBe(nonNorthAmerican);
  });

  it('returns null for garbage', () => {
    expect(extractVinFromScan('')).toBeNull();
    expect(extractVinFromScan('hello world')).toBeNull();
    expect(extractVinFromScan('1234')).toBeNull();
  });
});
