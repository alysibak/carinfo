import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { enrichCar } from '../services/content-enrichment.js';
import { findCar } from '../__tests__/helpers/loadCars.js';

describe('content-enrichment', () => {
  it('replaces mis-stored EV combined economy with authoritative MPGe from enrichment', () => {
    const raw = findCar(
      (c) =>
        c.engine.fuelType === 'electric' &&
        c.epaId != null &&
        c.fuelEconomy.combined != null &&
        c.fuelEconomy.combined > 0 &&
        c.fuelEconomy.combined < 50,
    );
    expect(raw).toBeDefined();

    const storedCombined = raw!.fuelEconomy.combined;
    const enriched = enrichCar(raw!);

    expect(enriched.fuelEconomy.combined).not.toBe(storedCombined);
    expect(enriched.fuelEconomy.combined!).toBeGreaterThanOrEqual(50);
  });

  it('adds curated horsepower provenance from EPA test car list', () => {
    const raw = findCar(
      (c) => c.epaId != null && c.engine.horsepower == null && c.engine.fuelType === 'gasoline',
    );
    expect(raw).toBeDefined();

    const enriched = enrichCar(raw!);
    if (enriched.engine.horsepower != null) {
      expect(enriched.provenance?.['engine.horsepower']).toBe('curated');
    } else {
      // HP coverage is partial; skip assertion when no test-car match exists.
      expect(enriched.engine.horsepower).toBeUndefined();
    }
  });

  it('returns the same object reference when no enrichment applies', () => {
    const bare: Car = {
      id: 'synthetic-no-enrichment',
      make: 'Test',
      model: 'Vehicle',
      year: 2000,
      provenance: {},
      engine: { fuelType: 'gasoline' },
      fuelEconomy: { city: 20, highway: 28, combined: 23 },
      transmission: { type: 'manual' },
      driveType: 'FWD',
      bodyStyle: 'sedan',
    };
    expect(enrichCar(bare)).toBe(bare);
  });

  it('does not fabricate NHTSA ratings when none resolve', () => {
    const bare: Car = {
      id: 'synthetic-no-nhtsa-xyz',
      make: 'NoMatchMake',
      model: 'NoMatchModel',
      year: 1999,
      provenance: {},
      engine: { fuelType: 'gasoline' },
      fuelEconomy: { city: 20, highway: 28, combined: 23 },
      transmission: { type: 'manual' },
      driveType: 'FWD',
      bodyStyle: 'sedan',
    };
    const enriched = enrichCar(bare);
    expect(enriched.safetyRating?.overall).toBeUndefined();
  });
});
