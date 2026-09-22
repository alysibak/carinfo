import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { ensureUniqueIds } from './unique-ids.js';

function car(overrides: Partial<Car> & Pick<Car, 'id'>): Car {
  return {
    make: 'Chevrolet',
    model: 'Van 15/25 2WD Conversion',
    year: 2005,
    trim: 'van-15-25-conversion-clkup-automatic-4-spd',
    provenance: {},
    engine: { fuelType: 'gasoline', displacement: 4.3, cylinders: 6 },
    fuelEconomy: { city: 13, highway: 17, combined: 14 },
    transmission: { type: 'automatic', speeds: 4 },
    driveType: 'RWD',
    bodyStyle: 'van',
    ...overrides,
  };
}

describe('ensureUniqueIds', () => {
  it('returns the input untouched when every ID is already unique', () => {
    const cars = [car({ id: 'a' }), car({ id: 'b' })];
    const { cars: out, report } = ensureUniqueIds(cars);
    expect(out).toBe(cars);
    expect(report).toEqual({ mergedDuplicates: [], renamed: [] });
  });

  it('keeps both rows when a shared ID hides two different engines', () => {
    // The real collision from the shipped dataset: same slug, V6 vs V8.
    const v6 = car({ id: 'chevy-van', epaId: 21192 });
    const v8 = car({
      id: 'chevy-van',
      epaId: 21193,
      model: 'Van 15/25  2WD Conversion', // double space — slugifies identically
      engine: { fuelType: 'gasoline', displacement: 5.3, cylinders: 8 },
    });

    const { cars: out, report } = ensureUniqueIds([v6, v8]);

    expect(out).toHaveLength(2);
    expect(new Set(out.map((c) => c.id)).size).toBe(2);
    expect(report.renamed).toEqual([{ from: 'chevy-van', to: 'chevy-van-epa21192' }]);
  });

  it('keeps the bare ID on the last row, which is what it resolved to before', () => {
    const first = car({ id: 'dup', epaId: 1, engine: { fuelType: 'gasoline', displacement: 2 } });
    const last = car({ id: 'dup', epaId: 2, engine: { fuelType: 'gasoline', displacement: 3 } });

    const { cars: out } = ensureUniqueIds([first, last]);

    const bare = out.find((c) => c.id === 'dup');
    expect(bare?.epaId).toBe(2);
    expect(out.find((c) => c.epaId === 1)?.id).toBe('dup-epa1');
  });

  it('merges spec-identical EPA double-listings instead of renaming them', () => {
    // GMC Savana 1500 AWD (cargo): listed twice, differing only in whitespace.
    const a = car({ id: 'savana', epaId: 25758, model: 'Savana 1500  AWD (cargo)' });
    const b = car({ id: 'savana', epaId: 26105, model: 'Savana 1500 AWD (cargo)' });

    const { cars: out, report } = ensureUniqueIds([a, b]);

    expect(out).toHaveLength(1);
    expect(out[0].epaId).toBe(26105);
    expect(report.mergedDuplicates).toEqual(['savana']);
  });

  it('treats case-only model differences as the same vehicle', () => {
    const a = car({ id: 'e350', epaId: 32712, make: 'Mercedes-Benz', model: 'E350 4matic' });
    const b = car({ id: 'e350', epaId: 32986, make: 'Mercedes-Benz', model: 'E350 4Matic' });

    const { cars: out } = ensureUniqueIds([a, b]);
    expect(out).toHaveLength(1);
  });

  it('never produces a suffix that collides with an existing ID', () => {
    const occupied = car({ id: 'x-epa7', epaId: 99 });
    const first = car({ id: 'x', epaId: 7, engine: { fuelType: 'gasoline', displacement: 1 } });
    const last = car({ id: 'x', epaId: 8, engine: { fuelType: 'gasoline', displacement: 2 } });

    const { cars: out } = ensureUniqueIds([occupied, first, last]);

    const ids = out.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not mutate its input', () => {
    const first = car({ id: 'd', epaId: 1, engine: { fuelType: 'gasoline', displacement: 1 } });
    const last = car({ id: 'd', epaId: 2, engine: { fuelType: 'gasoline', displacement: 2 } });
    ensureUniqueIds([first, last]);
    expect(first.id).toBe('d');
  });
});
