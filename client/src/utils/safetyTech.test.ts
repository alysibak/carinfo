import { describe, expect, it } from 'vitest';
import { availabilityLabel, rolloverRiskText, testedLabel } from './safetyTech';

describe('safetyTech', () => {
  it('writes NHTSA’s body codes in words', () => {
    expect(testedLabel('2018 Toyota Tacoma PU/CC 4WD')).toBe(
      '2018 Toyota Tacoma crew cab pickup 4WD',
    );
    expect(testedLabel('2011 Toyota Camry 4 DR FWD Early Release')).toBe(
      '2011 Toyota Camry 4-door FWD Early Release',
    );
    expect(testedLabel('2012 Toyota Prius 5 HB FWD')).toBe(
      '2012 Toyota Prius 5-door hatchback FWD',
    );
    expect(testedLabel('2018 Ford Mustang C RWD')).toBe('2018 Ford Mustang convertible RWD');
    expect(testedLabel('2026 HONDA CR-V SUV N/A FWD')).toBe('2026 HONDA CR-V SUV FWD');
    // A model's own "C" is left alone.
    expect(testedLabel('2015 Mercedes-Benz C-Class 4 DR RWD')).toBe(
      '2015 Mercedes-Benz C-Class 4-door RWD',
    );
  });

  it('says how NHTSA lists a technology', () => {
    expect(availabilityLabel('some')).toBe('Standard on some versions');
    expect(availabilityLabel(undefined)).toBe('Not listed');
    expect(rolloverRiskText(0.147)).toBe('15%');
  });
});
