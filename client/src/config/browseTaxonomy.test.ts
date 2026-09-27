import { describe, expect, it } from 'vitest';
import { LIFESTYLE_PRESETS, matchingLifestylePreset, presetToSearchQuery } from './browseTaxonomy';
import { searchQueryToParams } from '../utils/searchParams';

describe('lifestyle presets', () => {
  const preset = (id: string) => LIFESTYLE_PRESETS.find((p) => p.id === id)!;

  it('send the phrases plain filters cannot express as search words', () => {
    // "Family hauler" took every SUV and wagon; "Weekend fun" any coupe over 3 litres.
    expect(presetToSearchQuery(preset('family')).query).toBe('third row');
    expect(presetToSearchQuery(preset('weekend')).query).toBe('sports car');
    const luxury = presetToSearchQuery(preset('luxury-value'));
    expect(luxury.query).toBe('luxury');
    expect(luxury.filters?.make).toBeUndefined();
  });

  it('keep the words and the filters in the search URL', () => {
    const params = searchQueryToParams(presetToSearchQuery(preset('work-truck')), 1);
    expect(params.get('q')).toBe('full size truck');
    expect(params.get('body')).toBe('truck');
  });

  it('leave presets without words as plain filter searches', () => {
    expect(presetToSearchQuery(preset('first-car')).query).toBeUndefined();
  });
});

describe('matchingLifestylePreset', () => {
  it("needs a preset's words as well as its filters", () => {
    // "Family hauler" has no filters, so it lit up for every unfiltered search.
    expect(matchingLifestylePreset({}, 'best suv for family')).toBeNull();
    expect(matchingLifestylePreset({}, 'third row')).toBe('family');
    expect(matchingLifestylePreset({ price: { max: 50000 }, year: { min: 2015 } }, 'luxury')).toBe(
      'luxury-value',
    );
    // A preset without words still matches on filters alone.
    const firstCar = LIFESTYLE_PRESETS.find((p) => p.id === 'first-car')!;
    expect(matchingLifestylePreset(firstCar.filters, 'honda')).toBe('first-car');
  });
});
