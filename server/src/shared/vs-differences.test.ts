import { describe, expect, it } from 'vitest';
import type { ModelYearSummary } from '../types/car.types.js';
import { vsDescription, vsDifferences, type VsSide } from './vs-differences.js';

function side(
  label: string,
  summary: Partial<ModelYearSummary>,
  extra: Partial<VsSide> = {},
): VsSide {
  return {
    label,
    year: 2026,
    summary: {
      year: 2026,
      carId: label,
      configurations: 1,
      fuelTypes: [],
      bodyStyles: [],
      ...summary,
    },
    ...extra,
  };
}

describe('vsDifferences', () => {
  it('says which uses less fuel, NHTSA’s stars and recalls in Canada', () => {
    expect(
      vsDifferences([
        side('Toyota RAV4', { combinedMpg: 42.8, safetyStars: 5, recalls: 1 }),
        side('Honda CR-V', { combinedMpg: 30.2, safetyStars: 4, recalls: 2 }),
      ]),
    ).toEqual([
      'The Toyota RAV4 uses less fuel: from 5.5 L/100 km, against 7.8 for the Honda CR-V.',
      'NHTSA gives the Toyota RAV4 5 stars overall and the Honda CR-V 4.',
      'Recalls in Canada for the 2026 models: 1 recall for the Toyota RAV4, 2 for the Honda CR-V.',
    ]);
  });

  it('calls a few percent a tie, and none rated or recalled plainly', () => {
    expect(
      vsDifferences([
        side('Honda Civic', { combinedMpg: 50, recalls: 0 }),
        side('Toyota Corolla', { combinedMpg: 49, safetyStars: 5, recalls: 0 }),
      ]),
    ).toEqual([
      'Both use about the same fuel: from 4.7 and 4.8 L/100 km.',
      'Of the two, only the Toyota Corolla has an NHTSA overall rating: 5 stars.',
      'No recalls in Canada so far for either 2026 model.',
    ]);
  });

  it('weighs electric range, or names the electric one against a gas one', () => {
    expect(
      vsDifferences([
        side('Tesla Model Y', { rangeMiles: 357 }),
        side('Hyundai Ioniq 5', { rangeMiles: 318 }),
      ]),
    ).toEqual([
      'The Tesla Model Y goes farther on a charge: up to 575 km, against 512 for the Hyundai Ioniq 5.',
    ]);
    expect(
      vsDifferences([
        side('Kia EV9', { rangeMiles: 304 }),
        side('Kia Telluride', { combinedMpg: 23 }),
      ]),
    ).toEqual(['The Kia EV9 is electric; the Kia Telluride burns fuel.']);
  });

  it('puts two places on the most-stolen list in one sentence, in our names', () => {
    const theft = (rank: number, model: string) => ({ rank, of: 10, model, year: 2024, url: 'u' });
    expect(
      vsDifferences([
        side('Ford F-150', {}, { theft: theft(4, 'Ford F-150 series') }),
        side('Ram 1500', {}, { theft: theft(2, 'Dodge Ram 1500') }),
      ]),
    ).toEqual([
      'On Équité Association’s 2024 count of Canada’s most stolen vehicles, the Ford F-150 was 4th and the Ram 1500 2nd.',
    ]);
  });

  it('describes a page by its two leading differences, else the plain line', () => {
    const a = side('A', { combinedMpg: 40, safetyStars: 5 });
    const b = side('B', { combinedMpg: 30, safetyStars: 5 });
    expect(vsDescription([a, b], 'plain')).toMatch(
      /^The A uses less fuel: .* NHTSA gives both 5 stars overall\. Complaints and running costs side by side, from public records\.$/,
    );
    expect(vsDescription([side('A', {}), side('B', {})], 'plain')).toBe('plain');
  });
});
