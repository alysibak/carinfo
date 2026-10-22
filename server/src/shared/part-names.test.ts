import { describe, expect, it } from 'vitest';
import { plainPartName } from './part-names';

describe('plainPartName', () => {
  it('says NHTSA’s categories as a shopper would', () => {
    expect(plainPartName('POWER TRAIN')).toBe('Transmission and drivetrain');
    expect(plainPartName('VEHICLE SPEED CONTROL')).toBe('Accelerator and cruise control');
    expect(plainPartName('FUEL/PROPULSION SYSTEM')).toBe('Fuel and propulsion system');
    expect(plainPartName('ELECTRONIC STABILITY CONTROL (ESC)')).toBe('Stability control');
    expect(plainPartName('Tether, Lower Anchor (on car seat or vehicle)')).toBe(
      'Child seat tether and anchors',
    );
  });

  it('puts the kind first and the rest in sentence case', () => {
    expect(plainPartName('FUEL SYSTEM, DIESEL')).toBe('Diesel fuel system');
    expect(plainPartName('ELECTRICAL SYSTEM')).toBe('Electrical system');
    expect(plainPartName('Seats And Restraints')).toBe('Seats and restraints');
  });
});
