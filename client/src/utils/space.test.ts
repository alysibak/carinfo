import { describe, expect, it } from 'vitest';
import { formatVolume, litres, luggageLabel } from './space';

describe('space', () => {
  it('gives litres first, with EPA’s cubic feet beside them', () => {
    expect(litres(15)).toBe(425);
    expect(formatVolume(15)).toBe('425 L (15 cu ft)');
    expect(formatVolume(100)).toBe('2,832 L (100 cu ft)');
  });

  it('calls a trunk a trunk, and the rest cargo space with every seat up', () => {
    expect(luggageLabel('sedan')).toBe('Trunk');
    expect(luggageLabel('convertible')).toBe('Trunk');
    expect(luggageLabel('hatchback')).toBe('Cargo space, all seats up');
    expect(luggageLabel('suv')).toBe('Cargo space, all seats up');
  });
});
