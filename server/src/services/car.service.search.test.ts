import { describe, expect, it } from 'vitest';
import { getCarById, searchCars } from '../services/car.service.js';

describe('car.service search smoke', () => {
  it('loads the full committed database (not fallback-only)', () => {
    const { total } = searchCars({ limit: 1 });
    expect(total).toBeGreaterThan(25_000);
  }, 120_000);

  it('filters by make using indexes', () => {
    const { results, total } = searchCars({
      filters: { make: ['Toyota'] },
      limit: 10,
    });
    expect(total).toBeGreaterThan(100);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.make === 'Toyota')).toBe(true);
  });

  it('filters plug-in hybrid after runtime fuel correction', () => {
    const { results, total } = searchCars({
      filters: { fuelType: ['plug-in hybrid'] },
      limit: 20,
    });
    expect(total).toBeGreaterThan(100);
    expect(results.every((c) => c.engine.fuelType === 'plug-in hybrid')).toBe(true);
  });

  it('returns normalized dossier-ready records by id', () => {
    const car = getCarById('porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8');
    expect(car).not.toBeNull();
    expect(car!.engine.fuelType).toBe('plug-in hybrid');
    expect(car!.price?.isEstimated).toBe(true);
  });
});

describe('car.service natural language search', () => {
  it('collapses mazda 3 to one model when collapseByModel is true', () => {
    const { results, total } = searchCars({
      query: 'mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(total).toBe(1);
    expect(results).toHaveLength(1);
    expect(results[0].make).toBe('Mazda');
    expect(results[0].model.toLowerCase().startsWith('3')).toBe(true);
    expect(results[0].model.toLowerCase().startsWith('323')).toBe(false);
    expect(results[0].year).toBeGreaterThanOrEqual(2020);
  });

  it('shows many Mazda 3 years when collapseByModel is false', () => {
    const { results, total } = searchCars({
      query: 'mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: false,
      limit: 50,
    });
    expect(total).toBeGreaterThan(10);
    expect(total).toBeLessThan(40);
    expect(results[0].make).toBe('Mazda');
    expect(results.every((c) => /^3\b/i.test(c.model))).toBe(true);
    const years = results.map((c) => c.year);
    expect(new Set(years).size).toBe(years.length);
    expect(years.length).toBeGreaterThan(5);
  });

  it('finds year + model queries humans actually type', () => {
    const mazda = searchCars({
      query: '2024 mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 5,
    });
    expect(mazda.total).toBe(1);
    expect(mazda.results[0].year).toBe(2024);
    expect(mazda.results[0].make).toBe('Mazda');
    expect(/^3\b/i.test(mazda.results[0].model)).toBe(true);

    const camry = searchCars({
      query: 'toyota camry 2022',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 5,
    });
    expect(camry.total).toBe(1);
    expect(camry.results[0].year).toBe(2022);
    expect(camry.results[0].make).toBe('Toyota');
    expect(camry.results[0].model.toLowerCase()).toContain('camry');
  });

  it('keeps decade year ranges as multiple years when not collapsing by model', () => {
    const { results, total } = searchCars({
      query: 'toyota camry 202',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: false,
      limit: 20,
    });
    expect(total).toBeGreaterThan(1);
    expect(results.length).toBeGreaterThan(1);
    expect(
      results.every(
        (c) =>
          c.make === 'Toyota' &&
          c.model.toLowerCase().includes('camry') &&
          c.year >= 2020 &&
          c.year <= 2029,
      ),
    ).toBe(true);
    const years = new Set(results.map((c) => c.year));
    expect(years.size).toBeGreaterThan(1);
  });

  it('collapses decade year ranges to one model when collapseByModel is true', () => {
    const { results, total } = searchCars({
      query: 'toyota camry 202',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 20,
    });
    expect(total).toBe(1);
    expect(results[0].make).toBe('Toyota');
    expect(results[0].model.toLowerCase()).toContain('camry');
    expect(results[0].year).toBeGreaterThanOrEqual(2020);
    expect(results[0].year).toBeLessThanOrEqual(2029);
  });

  it('treats century prefix 20 as 2000–2099 and respects collapse toggle', () => {
    const expanded = searchCars({
      query: 'toyota camry 20',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: false,
      limit: 50,
    });
    expect(expanded.total).toBeGreaterThan(1);
    expect(
      expanded.results.every(
        (c) =>
          c.make === 'Toyota' &&
          c.model.toLowerCase().includes('camry') &&
          c.year >= 2000 &&
          c.year <= 2099,
      ),
    ).toBe(true);
    expect(new Set(expanded.results.map((c) => c.year)).size).toBeGreaterThan(1);

    const collapsed = searchCars({
      query: 'toyota camry 20',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(collapsed.total).toBe(1);
  });

  it('accepts glued mazda3 and collapses Civic when one-per-model is on', () => {
    const glued = searchCars({
      query: 'mazda3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(glued.total).toBe(1);
    expect(glued.results[0].make).toBe('Mazda');
    expect(glued.results[0].year).toBeGreaterThanOrEqual(2020);
    expect(/^3\b/i.test(glued.results[0].model)).toBe(true);

    const civic = searchCars({
      query: 'honda civic',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(civic.total).toBe(1);
    expect(civic.results[0].make).toBe('Honda');
    expect(civic.results[0].model.toLowerCase()).toContain('civic');
    expect(civic.results[0].year).toBeGreaterThanOrEqual(2020);
  });

  it('keeps make-only mazda denser than expanded mazda 3 years', () => {
    const makeOnly = searchCars({
      query: 'mazda',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(makeOnly.total).toBeGreaterThan(5);
    // Make browsing should stay one-per-family, not explode into every year row.
    expect(makeOnly.total).toBeLessThan(200);

    const oneModel = searchCars({
      query: 'mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(oneModel.total).toBe(1);
    expect(makeOnly.total).toBeGreaterThan(oneModel.total);

    const modelYears = searchCars({
      query: 'mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: false,
      limit: 50,
    });
    expect(modelYears.total).toBeGreaterThan(10);
    expect(modelYears.total).toBeLessThan(40);
    expect(new Set(modelYears.results.map((c) => c.year)).size).toBe(modelYears.results.length);
  });

  it('keeps land rover as a two-word make', () => {
    const { results, total } = searchCars({
      query: 'land rover',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 5,
    });
    expect(total).toBeGreaterThan(0);
    expect(results[0].make.toLowerCase()).toContain('land');
  });
  it('says which model years are on file when a searched year is not', () => {
    const typed = searchCars({ query: '1985 corvette', limit: 5 });
    expect(typed.total).toBe(0);
    expect(typed.yearCoverage).toEqual({ min: 1995, max: expect.any(Number) });
    expect(typed.yearCoverage!.max).toBeGreaterThanOrEqual(2026);

    const filtered = searchCars({ filters: { year: { min: 1980, max: 1990 } }, limit: 5 });
    expect(filtered.yearCoverage?.min).toBe(1995);
  });

  it('adds no year note when the years are covered or the miss is something else', () => {
    expect(searchCars({ query: '2019 civic', limit: 1 }).yearCoverage).toBeUndefined();
    const misspelt = searchCars({ query: '2019 zzqxv', limit: 1 });
    expect(misspelt.total).toBe(0);
    expect(misspelt.yearCoverage).toBeUndefined();
  });
});
