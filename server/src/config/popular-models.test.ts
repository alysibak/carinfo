import { describe, expect, it } from 'vitest';
import { getCarById, getMatchups, getModelPages } from '../services/car.service.js';
import { LATEST_FULL_MODEL_YEAR } from './model-years.js';
import { EXAMPLE_MODEL_PAGES, MATCHUPS, POPULAR_MODEL_PAGES } from './popular-models.js';

describe('POPULAR_MODEL_PAGES', () => {
  it('links pages that exist, under their own names', () => {
    const pages = new Map(getModelPages().map((page) => [page.path, page.label]));
    for (const { label, path } of [...POPULAR_MODEL_PAGES, ...EXAMPLE_MODEL_PAGES]) {
      expect(pages.get(path), path).toBe(label);
    }
  });
});

describe('MATCHUPS', () => {
  it('names model pages that exist, and each set compares one model year', () => {
    const pages = new Set(getModelPages().map((page) => page.path));
    for (const { paths } of MATCHUPS) {
      for (const path of paths) expect(pages.has(path), path).toBe(true);
    }
    const matchups = getMatchups();
    expect(matchups).toHaveLength(MATCHUPS.length);
    for (const matchup of matchups) {
      expect(matchup.year).toBeLessThanOrEqual(LATEST_FULL_MODEL_YEAR);
      for (const { carId } of matchup.cars) expect(getCarById(carId)?.year).toBe(matchup.year);
    }
  });
});
