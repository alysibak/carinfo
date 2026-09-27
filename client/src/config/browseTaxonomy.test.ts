import { describe, expect, it } from 'vitest';
import { LIFESTYLE_PRESETS, presetToSearchQuery } from './browseTaxonomy';
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
