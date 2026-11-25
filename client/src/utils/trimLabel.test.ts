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

  it('leaves EPA’s powertrain codes out of the title', () => {
    const camry = { ...mazda3, make: 'Toyota', model: 'Camry HEV FF' };
    expect(displayVehicleTitle(camry)).toBe('2026 Toyota Camry');
    const defender = { ...mazda3, make: 'Land Rover', model: 'Defender 110 MHEV' };
    expect(displayVehicleTitle(defender)).toBe('2026 Land Rover Defender 110');
    // A name that is the code itself keeps it.
    const ff = { ...mazda3, make: 'Ferrari', model: 'FF', year: 2014 };
    expect(displayVehicleTitle(ff)).toBe('2014 Ferrari FF');
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
    // It left a dangling "w/".
    expect(displayModelLabel(car('Air Dream R AWD w/19 inch wheels'))).toBe('Air Dream R');
    expect(displayConfigNotes(car('Air Dream R AWD w/19 inch wheels'))).toEqual(['19-inch wheels']);
    expect(displayModelLabel(car('Gravity GT w/20F21R wheels (2R)'))).toBe('Gravity GT (2R)');
    expect(displayConfigNotes(car('Gravity GT w/20F21R wheels (2R)'))).toEqual([
      '20-inch front, 21-inch rear wheels',
    ]);
    // EPA test modes and stop-start say nothing about the car.
    expect(displayModelLabel(car('Sentra (3-mode)'))).toBe('Sentra');
    expect(displayModelLabel(car('Elantra w/Stop-Start'))).toBe('Elantra');
    expect(displayConfigNotes(car('Sentra (3-mode)'))).toEqual([]);
    expect(displayModelLabel(car('Silverado Mud Terrain Tires 4WD'))).toBe('Silverado');
    // Battery modules, chargers and tire sizes are the configuration, not the name.
    const ev = car('Silverado EV 24-mod battery, 19kW 6-mode charger');
    expect(displayModelLabel(ev)).toBe('Silverado EV');
    expect(displayConfigNotes(ev)).toEqual(['24-module battery', '19 kW onboard charger']);
    expect(displayModelLabel(car('OPTIQ AWD V SERIES 11 kW Charger 15 modes'))).not.toMatch(/kW/);
    const daytona = car('Charger Daytona Scat Pack AWD 325/35ZR20 Rear A/S');
    expect(displayModelLabel(daytona)).toBe('Charger Daytona Scat Pack');
    expect(displayConfigNotes(daytona)).toEqual(['325/35ZR20 rear tires', 'All-season tires']);
    expect(displayConfigNotes(car('Charger 2-Dr Daytona R/T AWD 20in Goodyear'))).toEqual([
      '20-inch wheels, Goodyear tires',
    ]);
    expect(displayConfigNotes(car('Charger 2-Dr Daytona R/T AWD 18in'))).toEqual([
      '18-inch wheels',
    ]);
    // Not a wheel size.
    expect(displayModelLabel(car('Optima (2006 New Model)'))).toBe('Optima (2006 New Model)');
  });

  it('tells a Golf TDI and a 2.5 Golf from a GTI, which EPA files alike', () => {
    const vw = (model: string, fuelType: 'diesel' | 'gasoline', displacement: number) => ({
      year: 2013,
      make: 'Volkswagen',
      model,
      trim: 'golf-gti-automatic-s6',
      engine: { fuelType, displacement },
    });
    expect(displayVehicleTitle(vw('Golf', 'diesel', 2))).toBe('2013 Volkswagen Golf TDI');
    expect(displayVehicleTitle(vw('Golf', 'gasoline', 2.5))).toBe('2013 Volkswagen Golf');
    expect(displayVehicleTitle(vw('Golf GTI', 'gasoline', 2))).toBe('2013 Volkswagen Golf GTI');
  });

  it('names the F-150 as its badge does, its test set-ups under the name', () => {
    const car = (model: string) => ({
      ...mazda3,
      make: 'Toyota',
      model,
    });
    const ford = (model: string) => ({ ...car(model), make: 'Ford', year: 2018 });
    expect(displayVehicleTitle(ford('F150 Pickup 2WD'))).toBe('2018 Ford F-150');
    expect(displayModelLabel(ford('F150 RAPTOR 4WD'))).toBe('F-150 Raptor');
    const setup = ford('F150 2WD FFV BASE PAYLOAD LT');
    expect(displayModelLabel(setup)).toBe('F-150');
    expect(displayConfigNotes(setup)).toEqual(['LT tires', 'Flex fuel (E85)']);
    const heavy = ford('F150 5.0L 2WD FFV GVWR>7599 LBS PAYLOAD PACKAGE');
    expect(displayVehicleTitle(heavy)).toBe('2018 Ford F-150');
    expect(displayConfigNotes(heavy)).toEqual([
      'GVWR over 7,599 lb',
      'Payload package',
      'Flex fuel (E85)',
    ]);
    // EPA's other test notes: stop-start, test modes, a charger's rating.
    expect(displayModelLabel(car('Elantra non-ISG'))).toBe('Elantra');
    expect(displayModelLabel(car('Corolla (1-mode TM)'))).toBe('Corolla');
    expect(displayModelLabel(car('Corolla (1-mode transmission)'))).toBe('Corolla');
    expect(displayModelLabel(car('TZ 450e 11kW  (20 inch Wheels)'))).toBe('TZ 450e');
    expect(displayConfigNotes(car('TZ 450e 11kW  (20 inch Wheels)'))).toContain(
      '11 kW onboard charger',
    );
    // A battery's kWh stays: it is the version.
    expect(displayModelLabel(car('ID.4 Pro 82kWh'))).toBe('ID.4 Pro 82kWh');
    // "LT" alone is a Chevrolet trim, not tires.
    expect(displayModelLabel(car('Silverado LT 4WD'))).toBe('Silverado LT');
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
