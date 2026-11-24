import { describe, expect, it } from 'vitest';
import {
  getCarById,
  getMatchups,
  getModelPages,
  getVsPage,
  getVsPages,
} from '../services/car.service.js';
import { LATEST_FULL_MODEL_YEAR } from './model-years.js';
import {
  EXAMPLE_MODEL_PAGES,
  HEAD_TO_HEAD,
  MATCHUPS,
  POPULAR_MODEL_PAGES,
} from './popular-models.js';

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

describe('match-ups head to head', () => {
  it('pairs every two models of a match-up and each head-to-head, one page in one model year', () => {
    const pages = getVsPages();
    expect(pages).toHaveLength(MATCHUPS.length * 3 + HEAD_TO_HEAD.length);
    // Each pair once, whichever way round it is listed.
    const keys = pages.map(({ modelPaths }) => [...modelPaths].sort().join(' '));
    expect(new Set(keys).size).toBe(keys.length);
    for (const { path } of pages) {
      const page = getVsPage(path.slice('/compare/'.length))!;
      expect(page.path).toBe(path);
      expect(page.curated).toBe(true);
      expect(page.year, path).toBeGreaterThanOrEqual(LATEST_FULL_MODEL_YEAR - 1);
      expect(page.year, path).toBeLessThanOrEqual(LATEST_FULL_MODEL_YEAR);
      for (const car of page.cars) expect(getCarById(car.carId)?.year).toBe(page.year);
      expect(page.related.length, path).toBeGreaterThan(0);
      expect(page.related.length).toBeLessThanOrEqual(6);
      expect(page.related.map((other) => other.path)).not.toContain(path);
    }
  });

  it('leads its related pairs with its own match-up’s', () => {
    expect(getVsPage('toyota-rav4-vs-honda-cr-v')!.related.slice(0, 2)).toEqual([
      { label: 'Toyota RAV4 vs Mazda CX-5', path: '/compare/toyota-rav4-vs-mazda-cx-5' },
      { label: 'Honda CR-V vs Mazda CX-5', path: '/compare/honda-cr-v-vs-mazda-cx-5' },
    ]);
  });

  it('keeps the match-up order whichever way a pair is asked', () => {
    expect(getVsPage('honda-cr-v-vs-toyota-rav4')?.path).toBe('/compare/toyota-rav4-vs-honda-cr-v');
  });

  it('shows two models with no year in common each in its newest', () => {
    const page = getVsPage('tesla-model-3-vs-honda-element')!;
    expect(page.curated).toBe(false);
    expect(page.year).toBeNull();
    expect(page.cars.map((car) => car.year)[1]).toBeLessThan(page.cars[0].year);
    // Popular pairs with either model, for somewhere to go next.
    expect(page.related.every((other) => /tesla-model-3|honda-element/.test(other.path))).toBe(
      true,
    );
  });
});
