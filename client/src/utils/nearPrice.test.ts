import { describe, expect, it } from 'vitest';
import { modelFamily } from './nearPrice';

describe('modelFamily', () => {
  it('names a model whatever its drive or powertrain', () => {
    expect(modelFamily({ make: 'Toyota', model: 'RAV4 AWD' })).toBe('toyota|rav4');
    expect(modelFamily({ make: 'Toyota', model: 'RAV4 Hybrid AWD' })).toBe('toyota|rav4');
    expect(modelFamily({ make: 'Honda', model: 'Civic 4Dr' })).toBe('honda|civic');
    expect(modelFamily({ make: 'Ford', model: 'F150 Pickup 4WD' })).toBe('ford|f150 pickup');
  });
});
