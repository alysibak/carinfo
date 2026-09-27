import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types.js';
import { isThreeRow } from './three-row.js';

const car = (make: string, model: string, bodyStyle: CarSpecs['bodyStyle'] = 'suv') =>
  ({ make, model, bodyStyle }) as CarSpecs;

describe('isThreeRow', () => {
  it('knows the three-row SUVs, minivans and passenger vans', () => {
    for (const [make, model] of [
      ['Kia', 'Telluride AWD'],
      ['Toyota', 'Grand Highlander Hybrid'],
      ['Volkswagen', 'Atlas 4motion'],
      ['Mercedes-Benz', 'GLS450 4matic'],
      ['Tesla', 'Model X Long Range'],
    ]) {
      expect(isThreeRow(car(make, model)), model).toBe(true);
    }
    expect(isThreeRow(car('Honda', 'Odyssey', 'minivan'))).toBe(true);
    expect(isThreeRow(car('Ford', 'Transit T150 Wagon', 'van'))).toBe(true);
  });

  it('leaves out two-row models that share a name', () => {
    expect(isThreeRow(car('Volkswagen', 'Atlas Cross Sport'))).toBe(false);
    expect(isThreeRow(car('Land Rover', 'Discovery Sport'))).toBe(false);
    expect(isThreeRow(car('Toyota', 'RAV4'))).toBe(false);
    expect(isThreeRow(car('Ford', 'Transit Connect Van', 'van'))).toBe(false);
  });
});
