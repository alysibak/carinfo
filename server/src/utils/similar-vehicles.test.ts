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

  it('never suggests the anchor itself', () => {
    const anchorId = getAllCars().find((c) => c.make === 'Honda' && c.model === 'Civic')!.id;
    const similar = similarTo((c) => c.id === anchorId, 'a Honda Civic');
    expect(similar.map((c) => c.id)).not.toContain(anchorId);
  });
});
