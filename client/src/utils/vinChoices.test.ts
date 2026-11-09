import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { vinChoiceNotes } from './vinChoices';

function car(id: string, over: Partial<CarSpecs> = {}): CarSpecs {
  return {
    id,
    make: 'Honda',
    model: 'Accord',
    year: 2003,
    provenance: {},
    engine: { fuelType: 'gasoline', displacement: 3, cylinders: 6, configuration: 'V6' },
    fuelEconomy: { city: 20, highway: 29, combined: 23 },
    transmission: { type: 'automatic', speeds: 5 },
    driveType: 'FWD',
    bodyStyle: 'sedan',
    ...over,
  };
}

describe('vinChoiceNotes', () => {
  it('names only what differs: two V6 Accords by their gearboxes', () => {
    const notes = vinChoiceNotes([
      car('auto'),
      car('manual', { transmission: { type: 'manual', speeds: 6 } }),
    ]);
    expect(notes).toEqual({ auto: '5-Speed Automatic', manual: '6-Speed Manual' });
  });

  it('names the rest of the model’s name and the drive where those differ', () => {
    const notes = vinChoiceNotes([
      car('wrangler', { make: 'Jeep', model: 'Wrangler 2WD', driveType: 'RWD' }),
      car('unlimited', { make: 'Jeep', model: 'Wrangler Unlimited 4WD', driveType: '4WD' }),
    ]);
    expect(notes.wrangler).toMatch(/RWD/);
    expect(notes.unlimited).toMatch(/Unlimited/);
    expect(notes.unlimited).toMatch(/4WD/);
  });

  it('says nothing of versions that differ in nothing on file, or of a single car', () => {
    expect(vinChoiceNotes([car('a'), car('b')])).toEqual({});
    expect(vinChoiceNotes([car('a')])).toEqual({});
  });
});
