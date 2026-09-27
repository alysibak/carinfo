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

  it('trusts an all-wheel-drive name over a two-wheel-drive record', () => {
    // EPA recorded the 2011 ML350 4matic as rear-wheel drive.
    const ml = findCar((c) => c.model === 'ML350 4matic' && c.year === 2011);
    expect(ml).toBeDefined();
    const normalized = normalizeCarRecord({ ...ml!, driveType: 'RWD' });
    expect(normalized.driveType).toBe('AWD');
    expect(normalized.provenance.driveType).toBe('estimated');
    // An sDrive BMW is rear-wheel drive whatever its size class says.
    const sDrive = findCar((c) => c.model === 'X3 sDrive30i' && c.year === 2019);
    expect(normalizeCarRecord(sDrive!).driveType).toBe('RWD');
  });

  it("reads EPA's AV-S codes as CVTs", () => {
    // "(AV-S7)" is a CVT with seven simulated steps: 938 cars showed as
    // "7-Speed Automatic", a 2021 Elantra as "1-Speed Automatic".
    const raw = findCar((c) => c.transmission?.description === 'Automatic (AV-S7)');
    expect(raw).toBeDefined();
    const stale = { ...raw!, transmission: { ...raw!.transmission, type: 'automatic' as const } };
    expect(normalizeCarRecord(stale).transmission.type).toBe('cvt');
    // A stepped automatic stays one.
    const stepped = findCar((c) => c.transmission?.description === 'Automatic (S8)');
    expect(normalizeCarRecord(stepped!).transmission.type).toBe('automatic');
  });
});
