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

  it('ignores hyphens and spaces that differ between EPA generations', () => {
    // The regular truck is "F150 Pickup"; only the EV is "F-150 Lightning".
    for (const phrase of ['f-150', 'f150', 'f 150']) {
      expect(modelPhraseMatches('F150 Pickup 2WD', phrase), phrase).toBe(true);
      expect(modelPhraseMatches('F-150 Lightning 4WD ER1', phrase), phrase).toBe(true);
    }
    expect(modelPhraseMatches('F150 Pickup 2WD', 'f-15')).toBe(false);
    expect(modelPhraseMatches('CX-50 4WD', 'cx5')).toBe(false);
  });

  it('maps model names that changed between generations', () => {
    expect(normalizeSearchQuery('Miata')).toBe('mx-5');
    expect(normalizeSearchQuery('chevy silverado 1500 4wd')).toBe('chevrolet silverado 4wd');
    expect(normalizeSearchQuery('gmc sierra 1500')).toBe('gmc sierra');
    expect(normalizeSearchQuery('ram 1500')).toBe('ram 1500');
  });
});
