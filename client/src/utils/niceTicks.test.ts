import { describe, expect, it } from 'vitest';
import { niceTicks } from './niceTicks';

describe('niceTicks', () => {
  it('covers the range in round steps', () => {
    expect(niceTicks(12_400, 58_900, 5)).toEqual([10_000, 20_000, 30_000, 40_000, 50_000, 60_000]);
  });

  it('keeps small steps clean', () => {
    expect(niceTicks(1.2, 2.9, 5)).toEqual([1, 1.5, 2, 2.5, 3]);
    for (const tick of niceTicks(0.1, 0.7, 6)) expect(String(tick).length).toBeLessThanOrEqual(4);
  });

  it('spreads a single value', () => {
    const ticks = niceTicks(30, 30);
    expect(ticks[0]).toBeLessThan(30);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(30);
  });

  it('gives nothing for no data', () => {
    expect(niceTicks(Infinity, -Infinity)).toEqual([]);
  });
});
