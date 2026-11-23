import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import {
  fuelSavingBetween,
  hybridSaving,
  paybackYears,
  roundedYears,
  SAVING_YEARS,
} from './payback';
import { paybackSentence, savingSentence } from './paybackText';

function version(
  id: string,
  fuelType: CarSpecs['engine']['fuelType'],
  combinedMpg: number,
  extra: Partial<CarSpecs> = {},
): CarSpecs {
  return {
    id,
    make: 'Toyota',
    model: fuelType === 'hybrid' ? 'RAV4 Hybrid AWD' : 'RAV4 AWD',
    year: 2026,
    provenance: {},
    engine: { fuelType, displacement: 2.5, cylinders: 4 },
    fuelEconomy: { city: combinedMpg, highway: combinedMpg, combined: combinedMpg },
    transmission: { type: 'automatic', speeds: 8 },
    driveType: 'AWD',
    bodyStyle: 'suv',
    // Estimated, and the same for both: why prices are the reader's to give.
    price: { msrp: 35000, isEstimated: true },
    ...extra,
  } as CarSpecs;
}

describe('fuelSavingBetween', () => {
  it('finds the thriftier car and what it saves a year', () => {
    const saving = fuelSavingBetween(
      version('gas', 'gasoline', 30),
      version('h', 'hybrid', 40),
      'ontario',
    )!;
    expect(saving.efficient.id).toBe('h');
    expect(saving.base.id).toBe('gas');
    expect(saving.yearlySaving).toBeGreaterThan(200);
  });

  it('calls a gap under $50 a year no saving', () => {
    expect(
      fuelSavingBetween(version('a', 'gasoline', 30), version('b', 'gasoline', 30.2), 'ontario'),
    ).toBeNull();
  });
});

describe('hybridSaving', () => {
  const siblings = [
    version('gas-fwd', 'gasoline', 31, { driveType: 'FWD' }),
    version('gas-awd', 'gasoline', 30),
    version('hybrid-le', 'hybrid', 39),
    version('hybrid-xse', 'hybrid', 38),
    version('hybrid-sedan', 'hybrid', 50, { bodyStyle: 'sedan' }),
  ];

  it('weighs a gasoline version against the year’s thriftiest hybrid of its body and drive', () => {
    const page = version('gas-limited', 'gasoline', 29);
    const saving = hybridSaving(page, siblings, 'ontario')!;
    expect(saving.base.id).toBe('gas-limited');
    expect(saving.efficient.id).toBe('hybrid-le');
  });

  it('weighs a hybrid against the thriftiest gasoline version of its drive', () => {
    const saving = hybridSaving(siblings[2], siblings, 'ontario')!;
    expect(saving.efficient.id).toBe('hybrid-le');
    expect(saving.base.id).toBe('gas-awd');
  });

  it('says nothing for a year without both', () => {
    expect(
      hybridSaving(version('g', 'gasoline', 30), [version('g2', 'gasoline', 31)], 'ontario'),
    ).toBeNull();
    expect(hybridSaving(version('ev', 'electric', 110), siblings, 'ontario')).toBeNull();
  });
});

describe('the sentences', () => {
  it('says what the hybrid saves, a year and over five', () => {
    const page = version('gas', 'gasoline', 30);
    const saving = hybridSaving(page, [version('h', 'hybrid', 40)], 'ontario')!;
    const text = savingSentence(saving, 'Ontario', page);
    expect(text).toMatch(
      /^The RAV4 Hybrid would save about \$\d[\d,]* a year on fuel over this one in Ontario \(5\.9 against 7\.8 L\/100 km\): \$\d[\d,]* over 5 years\.$/,
    );
    expect(SAVING_YEARS).toBe(5);
  });

  it('names a hybrid as one where its maker’s name does not', () => {
    const page = version('gas', 'gasoline', 30, { make: 'Honda', model: 'CR-V AWD' });
    const hybrid = version('h', 'hybrid', 40, { make: 'Honda', model: 'CR-V AWD TrailSport' });
    const saving = hybridSaving(page, [hybrid], 'ontario')!;
    expect(savingSentence(saving, 'Ontario', page)).toMatch(/^The CR-V\b.* hybrid would save/);
  });

  it('turns a quoted price gap into years', () => {
    expect(paybackYears(3000, 500)).toBe(6);
    expect(paybackSentence(3000, 500)).toBe('At $3,000 more, it pays for itself in about 6 years.');
    expect(paybackSentence(0, 500)).toBe(
      'At no extra price, it pays for itself from the first tank.',
    );
    expect(paybackSentence(20000, 500)).toBe(
      'At $20,000 more, it takes more than 15 years to pay for itself on fuel alone.',
    );
  });

  it('rounds to half years, never below half a year', () => {
    expect(roundedYears(4.3)).toBe(4.5);
    expect(roundedYears(4.2)).toBe(4);
    expect(roundedYears(0.1)).toBe(0.5);
  });
});
