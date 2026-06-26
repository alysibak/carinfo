import { describe, expect, it } from 'vitest';
import { enrichCar } from '../services/content-enrichment.js';
import { normalizeCarRecord } from '../utils/car-normalize.js';
import { findCar } from '../__tests__/helpers/loadCars.js';

const CAYENNE_ID = 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8';

describe('car-normalize', () => {
  it('applies PHEV fuel correction with estimated provenance', () => {
    const raw = findCar((c) => c.id === CAYENNE_ID);
    expect(raw).toBeDefined();

    const normalized = normalizeCarRecord(raw!);
    expect(normalized.engine.fuelType).toBe('plug-in hybrid');
    expect(normalized.provenance?.['engine.fuelType']).toBe('estimated');
  });

  it('leaves confirmed BEV fuel type unchanged after normalize', () => {
    const raw = findCar(
      (c) =>
        c.make === 'Tesla' &&
        c.model.includes('Model 3 Long Range') &&
        c.year === 2022,
    );
    expect(raw).toBeDefined();

    const normalized = normalizeCarRecord(raw!);
    expect(normalized.engine.fuelType).toBe('electric');
  });

  it('runs enrich then normalize on mislabeled PHEV without error', () => {
    const raw = findCar((c) => c.id === CAYENNE_ID);
    expect(raw).toBeDefined();

    const pipeline = normalizeCarRecord(enrichCar(raw!));
    expect(pipeline.engine.fuelType).toBe('plug-in hybrid');
    expect(pipeline.price?.isEstimated).toBe(true);
    expect(pipeline.price?.msrp).toBeGreaterThan(0);
    expect(pipeline.price?.confidence).toBeTruthy();
  });
});
