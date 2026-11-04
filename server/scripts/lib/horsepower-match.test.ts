import { describe, expect, it } from 'vitest';
import {
  inductionCompatible,
  inductionFromCar,
  inductionFromCarline,
  pickHorsepowerForInduction,
} from './horsepower-match.js';

describe('inductionFromCarline', () => {
  it('flags turbo and supercharged carlines as forced', () => {
    expect(inductionFromCarline('LEGACY GT TURBO')).toBe('forced');
    expect(inductionFromCarline('MUSTANG SHELBY GT500')).toBe('forced');
    expect(inductionFromCarline('CIVIC TYPE R')).toBe('forced');
  });

  it('leaves ordinary carlines unknown', () => {
    expect(inductionFromCarline('LEGACY')).toBe('unknown');
    expect(inductionFromCarline('IMPREZA AWD')).toBe('unknown');
  });
});

describe('inductionFromCar', () => {
  it('treats an aspiration flag as forced and its absence as NA', () => {
    expect(inductionFromCar('turbocharged')).toBe('forced');
    expect(inductionFromCar(undefined)).toBe('na');
  });
});

describe('inductionCompatible', () => {
  it('allows unknown on either side and rejects forced vs NA', () => {
    expect(inductionCompatible('forced', 'unknown')).toBe(true);
    expect(inductionCompatible('na', 'unknown')).toBe(true);
    expect(inductionCompatible('forced', 'forced')).toBe(true);
    expect(inductionCompatible('forced', 'na')).toBe(false);
    expect(inductionCompatible('na', 'forced')).toBe(false);
  });
});

describe('pickHorsepowerForInduction', () => {
  it('returns the single reading unchanged', () => {
    expect(pickHorsepowerForInduction([250], 'forced')).toBe(250);
  });

  it('picks the upper cluster for a turbo when NA and turbo share a carline', () => {
    // 2005 Legacy: 168 NA vs 250 turbo under one carline.
    expect(pickHorsepowerForInduction([168, 250], 'forced')).toBe(250);
    expect(pickHorsepowerForInduction([168, 250], 'na')).toBe(168);
  });

  it('keeps the median when readings agree closely', () => {
    expect(pickHorsepowerForInduction([248, 250, 252], 'forced')).toBe(250);
  });
});
