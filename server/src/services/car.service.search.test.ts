import { describe, expect, it } from 'vitest';
import {
  FIRST_MODEL_YEAR,
  LATEST_FULL_MODEL_YEAR,
  LATEST_MODEL_YEAR,
} from '../config/model-years.js';
import {
  getCarById,
  getSearchSuggestions,
  getStatistics,
  searchCars,
} from '../services/car.service.js';

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
  it('covers exactly the model years the shared constants advertise', () => {
    // The UI's newest-year chip and example searches read these; bump them
    // when a data refresh adds a model year.
    expect(getStatistics().yearRange).toEqual({ min: FIRST_MODEL_YEAR, max: LATEST_MODEL_YEAR });
  });

  it('calls a year "full" only while the next one is still partial', () => {
    // Examples ("2026 Camry") and the newest-year chip use the full year. Once
    // EPA has certified most of the next year's lineup, bump the constant.
    const count = (year: number) =>
      searchCars({ filters: { year: { min: year, max: year } }, limit: 1 }).total;
    expect(count(LATEST_FULL_MODEL_YEAR)).toBeGreaterThan(1000);
    if (LATEST_MODEL_YEAR > LATEST_FULL_MODEL_YEAR) {
      expect(count(LATEST_MODEL_YEAR)).toBeLessThan(count(LATEST_FULL_MODEL_YEAR) / 2);
    }
    expect(
      searchCars({ query: `${LATEST_FULL_MODEL_YEAR} camry`, limit: 1 }).total,
    ).toBeGreaterThan(0);
  });

  it('says which model years are on file when a searched year is not', () => {
    const typed = searchCars({ query: '1985 corvette', limit: 5 });
    expect(typed.total).toBe(0);
    expect(typed.yearCoverage).toEqual({ min: FIRST_MODEL_YEAR, max: LATEST_MODEL_YEAR });

    const filtered = searchCars({ filters: { year: { min: 1980, max: 1990 } }, limit: 5 });
    expect(filtered.yearCoverage?.min).toBe(FIRST_MODEL_YEAR);
  });

  it('adds no year note when the years are covered or the miss is something else', () => {
    expect(searchCars({ query: '2019 civic', limit: 1 }).yearCoverage).toBeUndefined();
    const misspelt = searchCars({ query: '2019 zzqxv', limit: 1 });
    expect(misspelt.total).toBe(0);
    expect(misspelt.yearCoverage).toBeUndefined();
  });
  it('finds the regular F-150, not just the electric one', () => {
    // The regular truck is filed as "F150 Pickup"; the alias for "f150" is
    // "f-150", which used to match only "F-150 Lightning" (36 results).
    for (const query of ['f150', 'ford f-150', 'f 150']) {
      const { results, total } = searchCars({ query, limit: 500 });
      expect(total, query).toBeGreaterThan(200);
      expect(
        results.some((c) => c.model.startsWith('F150 Pickup')),
        query,
      ).toBe(true);
    }
  });

  it('keeps "cx-5" from matching the CX-50', () => {
    const { results } = searchCars({ query: 'cx-5', limit: 500 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => /^CX-5\b(?!0)/.test(c.model))).toBe(true);
  });

  it('reaches current half-tons and roadsters by their familiar names', () => {
    const newest = (query: string) =>
      Math.max(...searchCars({ query, limit: 500 }).results.map((c) => c.year));
    expect(newest('silverado 1500')).toBe(LATEST_FULL_MODEL_YEAR);
    expect(newest('sierra 1500')).toBe(LATEST_FULL_MODEL_YEAR);
    expect(newest('miata')).toBe(LATEST_FULL_MODEL_YEAR);
  });

  it('ranks a model-name match above a trim-only match', () => {
    // EPA files the Golf R under a "golf-gti" base model, so both mention GTI.
    const [top] = searchCars({
      query: 'gti',
      sort: { field: 'relevance', order: 'desc' },
      limit: 1,
    }).results;
    expect(top.model).toBe('Golf GTI');
  });
  it('suggests the regular F-150 and puts whole-model suggestions first', () => {
    const f150 = getSearchSuggestions('f150', 6).map((s) => s.label);
    expect(f150[0]).toMatch(/^Ford F150 Pickup/);

    // "Toyota Camry" searches every Camry, so it leads the trims.
    expect(getSearchSuggestions('camry', 6)[0].label).toBe('Toyota Camry');
  });
  it('resolves BMW series and Mercedes classes to their EPA model names', () => {
    const all = (query: string) => searchCars({ query, limit: 500 }).results;
    const threeSeries = all('bmw 3 series');
    expect(threeSeries.length).toBeGreaterThan(50);
    expect(
      threeSeries.every((c) => c.make === 'BMW' && /^(M?3\d\d|M3|ActiveHybrid 3)/.test(c.model)),
    ).toBe(true);

    for (const query of ['c class', 'mercedes c-class']) {
      const cClass = all(query);
      expect(cClass.length, query).toBeGreaterThan(20);
      expect(
        cClass.every((c) => /^(AMG )?C ?\d/.test(c.model)),
        query,
      ).toBe(true);
    }
    expect(all('g wagon').every((c) => /^(AMG )?G ?\d/.test(c.model))).toBe(true);
    expect(getSearchSuggestions('3 series', 4)[0].label).toBe('BMW 3 Series');
  });

  it('never reads a fragment of a make as a typo of it', () => {
    // "gle" is inside "eagle"; it used to filter the search down to Eagles.
    const { results } = searchCars({ query: 'gle', limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.make === 'Mercedes-Benz')).toBe(true);

    // Real typos still resolve.
    expect(searchCars({ query: 'toyata camry', limit: 5 }).results[0].make).toBe('Toyota');
    expect(searchCars({ query: 'land rovr', limit: 5 }).results[0].make).toBe('Land Rover');
  });
  it('leads each model family with its newest year', () => {
    // The Camry is hybrid-only since 2025 ("Camry HEV …"); the plain name
    // stopped at 2024 and used to represent the family.
    for (const query of ['camry', 'corolla', 'accord', 'civic']) {
      const [top] = searchCars({
        query,
        collapseByModel: true,
        sort: { field: 'relevance', order: 'desc' },
        limit: 1,
      }).results;
      expect(top.year, query).toBeGreaterThanOrEqual(LATEST_FULL_MODEL_YEAR);
    }
  });
});
