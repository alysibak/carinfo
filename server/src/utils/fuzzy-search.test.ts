import { describe, expect, it } from 'vitest';
import {
  editDistance,
  fuzzyTokenMatch,
  modelFamilyName,
  modelPhraseMatches,
  normalizeSearchQuery,
  normalizeSearchToken,
} from './fuzzy-search.js';

describe('fuzzy-search', () => {
  it('maps common aliases', () => {
    expect(normalizeSearchToken('chevy')).toBe('chevrolet');
    expect(normalizeSearchToken('toyata')).toBe('toyota');
    expect(normalizeSearchQuery('Chevy Camry')).toBe('chevrolet camry');
    expect(normalizeSearchQuery('mazda3')).toBe('mazda 3');
    expect(normalizeSearchQuery('cx5')).toBe('cx-5');
  });

  it('tolerates small typos via edit distance', () => {
    expect(editDistance('toyota', 'toyata', 2)).toBe(1);
    expect(fuzzyTokenMatch('toyota camry', 'toyata')).toBe(true);
    expect(fuzzyTokenMatch('honda civic', 'civic')).toBe(true);
    expect(fuzzyTokenMatch('honda civic', 'zzzz')).toBe(false);
  });

  it('derives shopper-facing model families from EPA strings', () => {
    expect(modelFamilyName('3 4-Door 2WD')).toBe('3');
    expect(modelFamilyName('3 DI 4-Door')).toBe('3');
    expect(modelFamilyName('Model 3')).toBe('model 3');
    expect(modelFamilyName('CX-5 4WD')).toBe('cx-5');
  });

  it('matches mazda 3 style phrases without grabbing cx-3 / cx-50', () => {
    expect(modelPhraseMatches('3 4-Door 2WD', '3')).toBe(true);
    expect(modelPhraseMatches('3', '3')).toBe(true);
    expect(modelPhraseMatches('CX-3 2WD', '3')).toBe(false);
    expect(modelPhraseMatches('CX-50 4WD', 'cx-5')).toBe(false);
    expect(modelPhraseMatches('CX-5 4WD', 'cx-5')).toBe(true);
    expect(modelPhraseMatches('CX-5 4WD', 'cx5')).toBe(true);
  });
});
