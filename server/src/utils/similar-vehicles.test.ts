import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { getAllCars } from '../services/car.service.js';
import { findSimilarCars } from './similar-vehicles.js';

// Cross-shopping as the API serves it, over the prebuilt corpus.
function similarTo(predicate: (c: Car) => boolean, label: string): Car[] {
  const cars = getAllCars();
  const anchor = cars.find(predicate);
  expect(anchor, `${label} should exist in the corpus`).toBeDefined();
  return findSimilarCars(anchor!, cars, 6);
}

describe('similar vehicles', () => {
  it('cross-shops a flagship luxury sedan against flagship luxury sedans', () => {
    // Regression: the LS was classed a "sport sedan", and its six suggestions
    // were all Porsche 911 variants.
    const similar = similarTo(
      (c) => c.make === 'Lexus' && c.model === 'LS 500' && c.year === 2022,
      '2022 Lexus LS 500',
    );
    expect(similar.map((c) => c.model).filter((m) => /^911\b/.test(m))).toEqual([]);
    expect(similar.every((c) => c.shoppingSegment === 'luxury')).toBe(true);
  });

  it('suggests the rivals shoppers compare, not cars that share a price', () => {
    const rivals = (make: string, model: string, year: number) =>
      similarTo(
        (c) => c.make === make && c.model === model && c.year === year,
        `${year} ${make} ${model}`,
      ).map((c) => `${c.make} ${c.model}`);
    // A Camry's rivals are midsize sedans; it used to get a Civic, a Forte and
    // a Maxima.
    const camry = rivals('Toyota', 'Camry', 2022);
    expect(camry.some((n) => /Accord|Sonata|K5|Optima|Altima|Mazda 6|Malibu/.test(n))).toBe(true);
    expect(camry.filter((n) => /Civic|Forte|Elantra|Corolla/.test(n))).toEqual([]);
    // A Wrangler's are off-roaders; it used to get a Santa Fe Hybrid.
    const wrangler = rivals('Jeep', 'Wrangler 2dr 4WD', 2021);
    expect(wrangler.some((n) => /Bronco|4Runner|FJ Cruiser|Defender/.test(n))).toBe(true);
    expect(wrangler.filter((n) => /Santa Fe|RAV4|Escape/.test(n))).toEqual([]);
  });

  it("leaves out the anchor's own line, collector cars and tuners", () => {
    const huracan = similarTo(
      (c) => c.make === 'Lamborghini' && c.model === 'Huracan' && c.year === 2017,
      '2017 Lamborghini Huracan',
    );
    // A Huracán Sterrato is a Huracán, and a Senna trades at auction.
    expect(huracan.filter((c) => /^Huracan/.test(c.model))).toEqual([]);
    expect(huracan.filter((c) => /Senna|P1/.test(c.model))).toEqual([]);
    // At most two of any make: it used to be five Ferraris.
    const perMake = new Map<string, number>();
    for (const c of huracan) perMake.set(c.make, (perMake.get(c.make) ?? 0) + 1);
    expect(Math.max(...perMake.values())).toBeLessThanOrEqual(2);

    const f150 = similarTo(
      (c) => c.make === 'Ford' && c.model === 'F150 Pickup 4WD' && c.year === 2021,
      '2021 Ford F150 Pickup 4WD',
    );
    expect(f150.filter((c) => /roush|tecstar/i.test(c.make))).toEqual([]);
    expect(f150.filter((c) => c.make === 'Ford' && /f-?150/i.test(c.model))).toEqual([]);
  });

  it('never suggests the anchor itself', () => {
    const anchorId = getAllCars().find((c) => c.make === 'Honda' && c.model === 'Civic')!.id;
    const similar = similarTo((c) => c.id === anchorId, 'a Honda Civic');
    expect(similar.map((c) => c.id)).not.toContain(anchorId);
  });
});

describe('Tesla Model 3 and Model Y', () => {
  it('meet rivals from both brand tiers', () => {
    // Counted as luxury only, a Model Y's rivals were a Q4, an EQB and an iX.
    const all = getAllCars();
    const modelY = all.find(
      (c) => c.make === 'Tesla' && /^Model Y Long Range AWD$/.test(c.model) && c.year === 2024,
    )!;
    const pool = all.filter((c) => c.bodyStyle === modelY.bodyStyle);
    const makes = findSimilarCars(modelY, pool, 6).map((c) => c.make);
    expect(makes.some((m) => m === 'Hyundai' || m === 'Kia')).toBe(true);
  });
});
