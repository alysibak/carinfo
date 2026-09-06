import { describe, expect, it } from 'vitest';
import {
  editDistance,
  fuzzyTokenMatch,
  normalizeSearchQuery,
  normalizeSearchToken,
} from './fuzzy-search.js';

describe('fuzzy-search', () => {
  it('maps common aliases', () => {
    expect(normalizeSearchToken('chevy')).toBe('chevrolet');
    expect(normalizeSearchToken('toyata')).toBe('toyota');
    expect(normalizeSearchQuery('Chevy Camry')).toBe('chevrolet camry');
  });

  it('tolerates small typos via edit distance', () => {
    expect(editDistance('toyota', 'toyata', 2)).toBe(1);
    expect(fuzzyTokenMatch('toyota camry', 'toyata')).toBe(true);
    expect(fuzzyTokenMatch('honda civic', 'civic')).toBe(true);
    expect(fuzzyTokenMatch('honda civic', 'zzzz')).toBe(false);
  });
});
