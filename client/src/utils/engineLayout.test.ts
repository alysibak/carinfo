import { describe, expect, it } from 'vitest';
import { engineLayoutLabel, formatEngineSystem } from './fuelDisplay';
import { formatEngineDetailForCard } from './dataValue';

describe('engineLayoutLabel', () => {
  it('says the layout the way people do: a 4-cylinder, a V6, a flat-4', () => {
    expect(engineLayoutLabel('I6', 6)).toBe('6-cylinder');
    expect(engineLayoutLabel('I4', 4)).toBe('4-cylinder');
    expect(engineLayoutLabel('V8', 8)).toBe('V8');
    expect(engineLayoutLabel('V6', 6)).toBe('V6');
    expect(engineLayoutLabel('VR6', 6)).toBe('V6');
    expect(engineLayoutLabel('I5', 5)).toBe('5-cylinder');
    expect(engineLayoutLabel('Flat-4', 4)).toBe('flat-4');
    expect(engineLayoutLabel('W12', 12)).toBe('W12');
    expect(engineLayoutLabel('Rotary', 2)).toBe('Rotary');
  });

  it('falls back to the cylinder count when no layout is recorded', () => {
    expect(engineLayoutLabel(undefined, 6)).toBe('6-cylinder');
    expect(engineLayoutLabel(undefined, undefined)).toBeNull();
  });

  it('reaches the card and detail formatters', () => {
    expect(
      formatEngineDetailForCard({
        fuelType: 'gasoline',
        displacement: 3,
        cylinders: 6,
      }),
    ).toBe('3.0L 6-cylinder');
    expect(
      formatEngineDetailForCard({
        fuelType: 'gasoline',
        displacement: 1.8,
        configuration: 'I4',
        cylinders: 4,
      }),
    ).toBe('1.8L 4-cylinder');
    expect(formatEngineSystem('gasoline', 3, 'I6', 6)).toBe('3.0L 6-cylinder');
    expect(formatEngineSystem('gasoline', 3.5, undefined, 6)).toBe('3.5L 6-cylinder');
    expect(formatEngineSystem('electric', undefined, undefined, undefined)).toBe('Electric Motor');
  });

  it('names forced induction, so a Type R no longer reads like the base 2.0L', () => {
    const typeR = {
      fuelType: 'gasoline',
      displacement: 2,
      configuration: 'I4',
      cylinders: 4,
      aspiration: 'turbocharged' as const,
    };
    expect(formatEngineDetailForCard(typeR)).toBe('2.0L 4-cylinder Turbo');
    expect(formatEngineSystem('gasoline', 6.2, 'V8', 8, 'supercharged')).toBe(
      '6.2L V8 Supercharged',
    );
    expect(formatEngineSystem('gasoline', 5, 'V8', 8)).toBe('5.0L V8');
    // No engine size on file: say nothing rather than a lone "Turbo".
    expect(formatEngineSystem('gasoline', undefined, undefined, undefined, 'turbocharged')).toBe(
      'Not on file',
    );
  });
});
