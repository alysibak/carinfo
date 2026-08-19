import { describe, expect, it } from 'vitest';
import { displayTrimLabel } from './trimLabel';

const label = (model: string, trim: string) => displayTrimLabel({ model, trim });

describe('displayTrimLabel', () => {
  it('drops EPA transmission mode and lock-up codes', () => {
    expect(label('NSX', 'nsx-2mode-clkup-automatic-4-spd')).toBeNull();
    expect(label('Camry', 'camry-2mode-2lkup-automatic-4-spd')).toBeNull();
    expect(label('Diamante', 'diamante-ems-cmode-clkup-automatic-4-spd')).toBeNull();
    expect(label('Stratus', 'stratus-vmode-clkup-automatic-4-spd')).toBeNull();
    expect(label('Civic Hybrid', 'civic-vlkup-automatic-variable-gear-ratios')).toBeNull();
  });

  it('drops EPA automated-manual gear codes', () => {
    expect(label('California', 'california-automatic-am7')).toBeNull();
    expect(label('Murcielago', 'murcielago-automatic-am7')).toBeNull();
    expect(label('CLA Class', 'cla-class-automatic-am-s7')).toBeNull();
  });

  it('drops "variable gear ratios" descriptions', () => {
    expect(label('Civic', 'civic-automatic-variable-gear-ratios')).toBeNull();
  });

  it('drops model-family and body words that repeat the model', () => {
    expect(label('318i Convertible', '3-series-automatic-4-spd')).toBeNull();
    expect(label('SL320', 'sl-class-automatic-5-spd')).toBeNull();
    expect(label('M3', 'm-automatic-5-spd')).toBeNull();
    expect(label('GTI VR6', 'golf-gti-manual-5-spd')).toBeNull();
    expect(label('C1500 Pickup 2WD', 'c1500-pickup-creeper-manual-5-spd')).toBeNull();
  });

  it('keeps genuine trim names', () => {
    expect(label('Golf', 'golf-gti-manual-6-spd')).toBe('GTI');
    expect(label('Impreza', 'impreza-outback-sport-manual-5-spd')).toBe('Outback Sport');
    expect(label('JCW Countryman All4', 'john-cooper-works-manual-6-spd')).toBe('John Cooper Works');
    expect(label('Express 1500/2500 2WD', 'express-passenger-clkup-automatic-4-spd')).toBe(
      'Passenger',
    );
  });

  it('keeps "Am" in real names but drops the EPA automated-manual code', () => {
    // "Formula" is already in the model name, so only "Trans Am" is new information.
    expect(label('Firebird/Formula', 'firebird-trans-am-formula-manual-6-spd')).toBe('Trans Am');
    expect(label('Grand Am', 'grand-am-clkup-automatic-4-spd')).toBeNull();
    expect(label('CLA Class', 'cla-class-automatic-am-s7')).toBeNull();
  });

  it('returns null rather than an empty label', () => {
    expect(label('Camry', 'camry-manual-5-spd')).toBeNull();
    expect(label('Camry', 'base')).toBeNull();
  });
});
