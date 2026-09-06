import { describe, expect, it } from 'vitest';
import { formatCompareIds, parseCompareIds } from './compareIds';

describe('parseCompareIds', () => {
  it('splits, trims, and drops empties', () => {
    expect(parseCompareIds(' a, b,,c ')).toEqual(['a', 'b', 'c']);
  });

  it('dedupes and caps at five', () => {
    expect(parseCompareIds('a,b,a,c,d,e,f,g')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('returns empty for nullish or blank input', () => {
    expect(parseCompareIds(null)).toEqual([]);
    expect(parseCompareIds('   ')).toEqual([]);
  });
});

describe('formatCompareIds', () => {
  it('round-trips a list through the same rules', () => {
    expect(formatCompareIds(['x', 'x', 'y'])).toBe('x,y');
  });
});
