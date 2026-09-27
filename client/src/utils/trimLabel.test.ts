import { describe, expect, it } from 'vitest';
import {
  displayConfigNotes,
  displayConfigSubtitle,
  displayModelConfigRemainder,
  displayModelFamilyLabel,
  displayModelLabel,
  displayTrimLabel,
  displayVehicleTitle,
  formatTransmissionLabel,
} from './trimLabel';

const label = (model: string, trim: string) => displayTrimLabel({ model, trim });

describe('displayVehicleTitle / model family', () => {
  const mazda3 = {
    year: 2026,
    make: 'Mazda',
    model: '3 4-Door',
    trim: 'base',
    engine: { fuelType: 'gasoline' as const },
  };

  it('keeps short model families in the primary title', () => {
    expect(displayModelFamilyLabel(mazda3)).toBe('3');
    expect(displayVehicleTitle(mazda3)).toBe('2026 Mazda 3');
    expect(displayModelConfigRemainder(mazda3)).toBe('4-Door');
  });

  it('adds a trim EPA leaves out of the name, once', () => {
    const civic = { ...mazda3, make: 'Honda', model: 'Civic 5Dr', year: 2020, variant: 'Type R' };
    expect(displayVehicleTitle(civic)).toBe('2020 Honda Civic Type R');
    const srt = { ...mazda3, make: 'Dodge', model: 'Challenger SRT', variant: 'Hellcat' };
    expect(displayVehicleTitle(srt)).toBe('2026 Dodge Challenger SRT Hellcat');
    // Lists and compare columns tell the trims apart too, and the card
    // subtitle does not repeat the trim the title already shows.
    const mustang = { ...mazda3, make: 'Ford', model: 'Mustang', variant: 'GT' };
    expect(displayModelLabel(mustang)).toBe('Mustang GT');
    expect(displayModelLabel({ ...mustang, variant: undefined })).toBe('Mustang');
    expect(displayModelConfigRemainder(civic)).toBeNull();
    // Named by EPA, but past the point where the family label stops.
    const named = { ...mazda3, make: 'Honda', model: 'Civic Type R', year: 2018 };
    expect(displayVehicleTitle(named)).toBe('2018 Honda Civic Type R');
    // Already in the family name: not repeated.
    const gt = { ...mazda3, make: 'Ford', model: 'Mustang GT', variant: 'GT' };
    expect(displayVehicleTitle(gt)).toBe('2026 Ford Mustang GT');
  });

  it('takes configuration notes out of the name and puts them under it', () => {
    const car = (model: string) => ({
      ...mazda3,
      make: 'BMW',
      model,
      trim: 'base',
      transmission: { type: 'automatic' as const, description: 'Automatic (A1)' },
    });
    const i4 = car('i4 eDrive40 Gran Coupe (19 inch Wheels)');
    expect(displayVehicleTitle(i4)).toBe('2026 BMW i4 eDrive40 Gran Coupe');
    expect(displayModelLabel(i4)).toBe('i4 eDrive40 Gran Coupe');
    expect(displayConfigNotes(i4)).toEqual(['19-inch wheels']);
    expect(displayConfigSubtitle(i4)).toMatch(/^19-inch wheels · /);
    expect(displayConfigNotes(car('R1T Dual Large (22in)'))).toEqual(['22-inch wheels']);
    expect(displayConfigNotes(car('LEAF 75kWh (18 inch steel Wheels)'))).toEqual([
      '18-inch steel wheels',
    ]);
    expect(displayModelLabel(car('Air G Touring XR AWD with19 inch wheels'))).toBe(
      'Air G Touring XR',
    );
    // EPA test modes and stop-start say nothing about the car.
    expect(displayModelLabel(car('Sentra (3-mode)'))).toBe('Sentra');
    expect(displayModelLabel(car('Elantra w/Stop-Start'))).toBe('Elantra');
    expect(displayConfigNotes(car('Sentra (3-mode)'))).toEqual([]);
    expect(displayModelLabel(car('Silverado Mud Terrain Tires 4WD'))).toBe('Silverado');
    // Not a wheel size.
    expect(displayModelLabel(car('Optima (2006 New Model)'))).toBe('Optima (2006 New Model)');
  });

  it('labels EPA AV-S gearboxes as CVTs', () => {
    expect(formatTransmissionLabel({ type: 'automatic', description: 'Automatic (AV-S7)' })).toBe(
      'CVT',
    );
    expect(formatTransmissionLabel({ type: 'automatic', description: 'Automatic (S8)' })).toBe(
      '8-Speed Automatic',
    );
    // EPA's AM codes: a PDK, a DSG, a Hyundai DCT.
    expect(formatTransmissionLabel({ type: 'automatic', description: 'Automatic (AM-S7)' })).toBe(
      '7-Speed Automated Manual',
    );
    expect(formatTransmissionLabel({ type: 'automatic', description: 'Automatic (AM8)' })).toBe(
      '8-Speed Automated Manual',
    );
  });

  it('keeps multi-word families like Model 3', () => {
    const tesla = { ...mazda3, make: 'Tesla', model: 'Model 3' };
    expect(displayModelFamilyLabel(tesla)).toBe('Model 3');
    expect(displayVehicleTitle(tesla)).toBe('2026 Tesla Model 3');
  });
});

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
    expect(label('JCW Countryman All4', 'john-cooper-works-manual-6-spd')).toBe(
      'John Cooper Works',
    );
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
