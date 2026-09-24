import { describe, expect, it } from 'vitest';
import { enrichCar } from '../services/content-enrichment.js';
import { normalizeCarRecord } from '../utils/car-normalize.js';
import type { Car } from '../types/car.types.js';
import { findCar } from '../__tests__/helpers/loadCars.js';

const CAYENNE_ID = 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8';

/** The electric label older pipeline runs gave plug-in hybrids (cars.json now matches EPA). */
const staleCayenne = (): Car => {
  const car = findCar((c) => c.id === CAYENNE_ID);
  expect(car).toBeDefined();
  return { ...car!, engine: { ...car!.engine, fuelType: 'electric' } };
};

describe('car-normalize', () => {
  it('applies PHEV fuel correction with estimated provenance', () => {
    const normalized = normalizeCarRecord(staleCayenne());
    expect(normalized.engine.fuelType).toBe('plug-in hybrid');
    expect(normalized.provenance?.['engine.fuelType']).toBe('estimated');
  });

  it('keeps EPA-sourced provenance when the stored fuel type needs no correction', () => {
    const raw = findCar((c) => c.id === CAYENNE_ID);
    const normalized = normalizeCarRecord(raw!);
    expect(normalized.engine.fuelType).toBe('plug-in hybrid');
    expect(normalized.provenance?.['engine.fuelType']).toBe('epa');
  });

  it('leaves confirmed BEV fuel type unchanged after normalize', () => {
    const raw = findCar(
      (c) => c.make === 'Tesla' && c.model.includes('Model 3 Long Range') && c.year === 2022,
    );
    expect(raw).toBeDefined();

    const normalized = normalizeCarRecord(raw!);
    expect(normalized.engine.fuelType).toBe('electric');
  });

  it('runs enrich then normalize on mislabeled PHEV without error', () => {
    const pipeline = normalizeCarRecord(enrichCar(staleCayenne()));
    expect(pipeline.engine.fuelType).toBe('plug-in hybrid');
    expect(pipeline.price?.isEstimated).toBe(true);
    expect(pipeline.price?.msrp).toBeGreaterThan(0);
    expect(pipeline.price?.confidence).toBeTruthy();
  });
});
