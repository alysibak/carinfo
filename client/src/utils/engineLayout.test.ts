import { describe, expect, it } from 'vitest';
import { engineLayoutLabel, formatEngineSystem } from './fuelDisplay';
import { formatEngineDetailForCard } from './dataValue';

describe('engineLayoutLabel', () => {
  it('drops the two layouts the builder guessed wrong', () => {
    // Most six-cylinders are a V6, and a "V5" is not a real production layout.
    expect(engineLayoutLabel('I6', 6)).toBe('6-cyl');
    expect(engineLayoutLabel('V5', 5)).toBe('5-cyl');
  });

  it('keeps layouts that are right for their cylinder count', () => {
    expect(engineLayoutLabel('I4', 4)).toBe('I4');
    expect(engineLayoutLabel('I3', 3)).toBe('I3');
    expect(engineLayoutLabel('V8', 8)).toBe('V8');
    expect(engineLayoutLabel('V12', 12)).toBe('V12');
  });

  it('keeps a real layout that contradicts the guess', () => {
    expect(engineLayoutLabel('V6', 6)).toBe('V6');
    expect(engineLayoutLabel('I5', 5)).toBe('I5');
    expect(engineLayoutLabel('Flat-6', 6)).toBe('Flat-6');
  });

  it('falls back to the cylinder count when no layout is recorded', () => {
    expect(engineLayoutLabel(undefined, 6)).toBe('6-cyl');
    expect(engineLayoutLabel(undefined, undefined)).toBeNull();
  });

  it('reaches the card and detail formatters', () => {
    expect(formatEngineDetailForCard({ fuelType: 'gasoline', displacement: 3, configuration: 'I6', cylinders: 6 }))
      .toBe('3L 6-cyl');
    expect(formatEngineDetailForCard({ fuelType: 'gasoline', displacement: 1.8, configuration: 'I4', cylinders: 4 }))
      .toBe('1.8L I4');
    expect(formatEngineSystem('gasoline', 3, 'I6', 6)).toBe('3L 6-cyl');
    expect(formatEngineSystem('electric', undefined, undefined, undefined)).toBe('Electric Motor');
  });
});
